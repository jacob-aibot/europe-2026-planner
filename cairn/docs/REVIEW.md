# Cairn — manager reviews

**Seven verdicts live in this file, newest first.** The **I-8b (Profile)** gate is the current
one; the **I-8f + I-8j**, **I-8i**, **I-8a**, **2b (data layer)**, **2a** and **Phase 1** verdicts
below it are **closed and kept for the record**, not superseded — their routing discharged and
their carried items re-placed downstream.

| Verdict | Scope | Commit reviewed | Date | Result |
|---|---|---|---|---|
| **I-8b — Profile: the first UI proof of `DESIGN.md` and the mobile-first responsive contract** | `ROADMAP.md` Phase 2 increment **I-8b** (revision 27/38) against `DESIGN.md` §5 (composition) and §6 (the rendered acceptance standard), plus the five bounded shell items §5.6 enumerates | `dac9595` (build `adcce5e`+`ade9d42`+`652c2c3`, record `dac9595`) | 2026-09-02 | **SHIP.** 0 blockers, 0 MAJOR. **3 MINOR routed to builder (R42-1, R42-2, R42-3), 1 MINOR to architect (MGR-8)** — none gating. Real-iOS residue listed separately |
| **I-8f + I-8j — the manager-gated prerequisites for I-8b** (closes MGR-1, MGR-2 and R39-1 from the I-8i gate) | `ROADMAP.md` Phase 2 increments **I-8f** (`359234b`) against `ARCHITECTURE.md` §2.9 **A-47**, and **I-8j** (`3044bdd`) against §4.4 **A-54** — **I-8b is not included and does not ship here** | `3044bdd` (record `f622ab9`) | 2026-09-01 | **I-8f SHIP · I-8j SHIP.** **I-8b is permitted to open.** 5 items routed, **0 gate I-8b** |
| **I-8i — the world-map lifetime framing rewrite** (the A-41 → A-53 atlas-frame arc, seven rounds) | `ROADMAP.md` Phase 2 increment **I-8i** (revisions 35–36) against `ARCHITECTURE.md` §4.4 **A-51**, **A-52**, **A-53** — **I-8b is not included** | `10455b9` (record `6ee6bf5`) | 2026-09-01 | **SHIP** (10 items routed; **3 gate I-8b**). **The frame's geometry closes as a track; A-51 G7's layout does not** — **all three discharged at the gate above** |
| **I-8a — the tab shell, the world map, the token layer, the signal-collision fix** | `ROADMAP.md` Phase 2, step 2b, increment **I-8a** (revision 27) against `ARCHITECTURE.md` §4.4 **A-40** (revision 29) — **I-8b is not included, and 2b does not ship here** | `6b89c91` | 2026-08-31 | **SHIP** (7 items routed; 4 of them gate I-8b) |
| **2b (data layer) — I-5 … I-7b** (geography attribution, `travelStats`, the summary-row read boundary) | `cairn/docs/ROADMAP.md` Phase 2, step 2b, increments I-5 through I-7b, A-26…A-39 — **I-8 (the Map/Profile surfaces) is not included** | `69e44d4` | 2026-08-29 | **SHIP** |
| **2a — past trips and the lifecycle** (I-0 … I-4a) | `cairn/docs/ROADMAP.md` Phase 2, first of three steps | `67f5588` | 2026-08-28 | **SHIP** |
| **Phase 1** — core engine + local-first client | whole phase | `218c7f0` | 2026-08-27 | **SHIP** (closed) |

---

# I-8b — Profile: the first surface built to the design contract

> **Status: CURRENT.** Manager, stage 4. Reviewed `master` @ `dac9595`, 2026-09-02, Node v22.22.2,
> Playwright 1.56.1 at `/opt/node22/lib/node_modules/playwright`,
> `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`. **This session is root and
> `/opt/pw-browsers` carries `webkit-2215` as well as `chromium-1194`, so I ran the surface on
> WebKit 26.0 myself rather than taking round 42's word that it launches.**
>
> **VERDICT — I-8b: SHIP.** 0 blockers, 0 MAJOR. Three MINORs go to the builder as ordinary
> follow-up (R42-1, R42-2, R42-3) and one MINOR to the architect (MGR-8). **None gates this
> verdict.** The increment delivers every named deliverable in `ROADMAP.md` I-8b's *Built* list
> and every composition clause in `DESIGN.md` §5 — I checked them one at a time against rendered
> output, not against the reports.
>
> **I did not rubber-stamp round 42.** I re-ran the suite, the fault matrix and the rendered
> acceptance probe; I re-derived the two fences (`WorldMap.tsx`, the dependency line) from
> `bce2cfb` myself; and I wrote my **own** probe — it is not a re-point of anything in `qa/` —
> which renders the surface at iPhone SE 320×568, iPhone 14 390×664 and 1280×800 in **both**
> colour schemes on **both** engines, and asks the questions a gate cares about rather than the
> ones the increment was built to pass. **I looked at the screenshots.** Two of my own probe's
> assertions were wrong before they were right, and I fixed my instrument rather than filing its
> output — both cases are recorded below, because one of them is load-bearing for how R42-3 gets
> fixed.
>
> ---
>
> ## The judgement calls Jacob asked for, answered first
>
> **1. Does the claim line genuinely read as the dominant element (§5.2 movement 1)? Yes.**
> Measured, scoped to the `.claim` `<dl>` block against the largest painted non-claim text on the
> surface: **30 px vs 19 px = 1.58× at iPhone SE · 35.1 px vs 19 px = 1.85× at iPhone 14 · 58 px
> vs 19 px = 3.05× at 1280.** The distinct rendered sizes on the surface are
> `[30, 27, 19, 14, 12.5, 11]` at 320 and `[58, 52.2, 19, 14, 12.5, 11]` at 1280 — the claim owns
> the top two steps and there is a real gap under it, which is P4's "steep, and not made of
> containers". Looking at the screenshots confirms the number: at every width the first thing the
> eye lands on is the claim, and nothing competes with it.
>
> **2. Does the composition avoid the SaaS-dashboard / card-collection / default-component-library
> anti-patterns (§1 P1)? Yes, and by construction rather than by luck.** My own count of
> **fully-bordered boxes** under `#tabpanel-profile`: **8 at every context, and all 8 are 11 px
> outlined annotation chips** — five `PAST TRIP` provenance pills inside expanded rows and the
> three lifecycle counts. **Zero bordered boxes carry body-or-larger type.** The primary content is
> a display head over hairline-separated rows over a `border-left` prose block, which is exactly
> §5.3's stated structure. There is no KPI grid, no bento wall, no icon-in-the-corner card. The
> `.statrow` three-box treatment the Map still wears is **not** on this screen — §5.3's typographic
> statement replaced it here, and the Map's survival is the bounded, scheduled divergence §7
> records. I looked at all six base screenshots and the three state screenshots and I do not think
> this reads as a generic UI; it reads as an editorial page.
>
> **3. R42-1 — do I agree it is MINOR? Yes, and I confirm the grade rather than the framing.**
> I reproduced it independently, with my own geometric predicate asked in **both** directions
> ("is anything painted to this separator's right / left on its own line box?"), at three contexts
> × two schemes × two engines. **Trailing orphans: 0 everywhere** — R41-5 as measured really is
> fixed. **Leading orphans: 2 at iPhone SE, 1 at iPhone 14, 1 at 1280**, identical on Chromium and
> WebKit. Rendered at 320 the claim is:
>
> ```
> 5 COUNTRIES
> ·  6 CITIES
> ·  30 DAYS TRAVELLED
> ```
>
> Round 42's characterisation is accurate and, having looked at it, I will put it more bluntly than
> it did: at 320 px this reads as a **two-item bulleted list**, because the first line has no `·`
> and the next two do. That is a real artefact on the single most important element of the product's
> first designed screen. **It does not, however, undermine §5.2.** The claim is still 1.58× the next
> element and still unambiguously dominant; no number is wrong, nothing is unreachable, nothing is
> mis-attributed. It is polish on a screen with no users yet, and this project has shipped MINORs at
> every previous gate. **MINOR confirmed, SHIP not blocked** — but see the routing: I am not filing
> it as ordinary backlog. It is the **first** item of the next builder pass, ahead of R42-2 and
> R42-3, and it should land before any further surface increment ships, because this screen is the
> reference every subsequent one will be built against.
>
> **4. R42-2 and R42-3 — are they correctly MINOR, or masking something larger? Correctly MINOR.
> Both are instrument gaps with NO live product consequence, and I established that independently
> rather than inheriting round 42's "no live defect" claim** — which mattered, because round 42's
> claim for R42-3 rested on the very check it had just declared blind (`H0`/`H0b` can only see
> `opacity: 0`).
>
> - **R42-2 has no live divergence.** I read the **`innerText` of the active panel's
>   `.banner--error`** — the strong measure R42-2 itself names as the one-line fix — on Map and
>   Profile in one session, on **both** branches of the message, on **both** engines. All four
>   comparisons are **byte-identical**:
>   *duplicate id:* `We could not read your travel history. The stored record for trip d1 is not
>   readable. travelStats: duplicate summary id "d1"` ·
>   *malformed date:* `We could not read your travel history. One of the stored trip records is not
>   readable. invalid IsoDate: "not-a-date"`.
>   The two surfaces say the same words today. The guard is weaker than the property it guards; the
>   property holds.
> - **R42-3 has no live violation.** I re-implemented §6.2's own wording — *non-`none` `display`,
>   non-`hidden` `visibility`, non-`0` `opacity`* — over every element carrying a `:hover` rule:
>   **20 `:hover` selectors, 38 elements checked, 0 offenders.** No control on this surface exists
>   only at `:hover`.
>
>   **The load-bearing detail for whoever fixes R42-3, which I found by getting it wrong first.**
>   My first run reported **10 offenders**, all `.triprow__open`, all `visibility: hidden`. They are
>   false positives: `.crow__trips` is `visibility: hidden` when the accordion is **collapsed**
>   (`styles.css:1280`, and the comment above it says why — it takes the collapsed panel out of the
>   a11y tree and the tab order, which is correct). My exclusion clause had used
>   `closest('[aria-expanded="false"]')`, and `aria-expanded` lives on a **sibling** button, not an
>   ancestor. **A naive widening of B4 to `display`/`visibility` will light up ten elements on the
>   shipped build.** The exclusion has to be *"inside a `.crow__trips` that is not inside a
>   `.crow--open`"*. That is in the routing.
>
> ---
>
> ## Verified — every claim in this entry has a command I ran on this tree
>
> **The suite and the instruments.** `cd cairn && npm run typecheck` → clean on both projects
> (`tsc -p tsconfig.json` and `tsc -p apps/web/tsconfig.json`, after `pretypecheck` regenerated the
> sample: *"16 days, 112 stops, 31 pool, 95 places, 120 import issues … REDACTED per ARCHITECTURE
> §6.6"*). `npm run test:tap` → **`# tests 1185 / # pass 1185 / # fail 0 / # skipped 0`**, matching
> BUILD-NOTES and round 42 exactly. `npm run web:build` → clean. `bash qa/i8b-faults.sh` →
> **`ALL FAULTS RED`**, and I counted rather than read the banner:
> `grep -c 'RED (expected)'` = **29**, `grep -c '^== '` = **30** (29 mutations + the baseline
> heading), and `baseline_gate` is present at `qa/i8b-faults.sh:62` and invoked at `:101`.
> `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8b-render.mjs` → **`0 FAIL, 0 MISMATCH`**
> with `grep -c '^  ok '` = **311**. Every number BUILD-NOTES and round 42 report is true.
>
> **The two fences, re-derived from before I-8b started rather than across the repair.**
> `git diff bce2cfb HEAD -- cairn/apps/web/src/views/WorldMap.tsx` → **empty**, and the file does
> not appear in `git diff --stat bce2cfb HEAD -- cairn/` at all. **A genuine zero-line diff across
> the entire arc — fourth increment running.**
> `git diff bce2cfb HEAD -- cairn/package.json cairn/package-lock.json cairn/apps/web/package.json`
> → **empty**, and `git diff --stat bce2cfb HEAD -- '*package.json' '*package-lock.json'` → **empty**
> repo-wide. **No dependency was added anywhere.** `git diff --stat bce2cfb HEAD -- cairn/packages`
> → **empty**. `grep -n "worldmap__panes" apps/web/src/styles.css` → three hits, one rule and two
> comments stating no media query is added; **§9.2 fence 1 intact**. UI/UX Pro Max: two hits across
> the whole arc diff, **both prose in `QA-FINDINGS.md` describing the REJECT ruling**; the only
> files mentioning it are `QA-FINDINGS.md`, `DESIGN.md` and `ARCHITECTURE.md`. **Not reopened.**
>
> **The read-only boundary and privacy.**
> `git status --porcelain -- europe-2026-itinerary.html docs/ tickets/` → **empty**.
> `md5sum europe-2026-itinerary.html` → **`7c69df3208ef91c8be0fb59a56443188`**, the same value
> rounds 40–42 record. `node qa/r2-redact.mjs` → **`KNOWN_LEAKS hits: 0`** (`LEAKS FOUND: 3` are the
> long-standing `2700`/`1061`/`1054` numeric artefacts in prose, unchanged). Over
> `git diff bce2cfb HEAD -- cairn/apps cairn/packages cairn/cli.ts`, added lines matching
> `console.|fetch(|XMLHttpRequest|sendBeacon|navigator.|localStorage|sessionStorage|geolocation|watchPosition|imap|gmail|oauth|mailbox|EXIF|Date.now|Math.random|crypto.`
> → **0**. **No friend's location, no mailbox, no coordinate leaves this surface**; the Profile
> reads `state.library` and `travelStats` and writes nothing.
>
> **Rendered, by me, on two engines.** My probe launched **Chromium 141** and **WebKit 26.0**
> (`browser.version()` printed `26.0`) and produced identical results on both for every measurement
> below. At iPhone SE 320×568, iPhone 14 390×664 and 1280×800, in light **and** dark:
>
> - **No horizontal overflow**, against `min(scrollingElement.clientWidth, visualViewport.width,
>   the context's declared width)` — the three-source denominator R41-1 introduced: document width
>   equals visible width at every context, and **0** elements under `#tabpanel-profile`, `.tabbar`
>   or `.topbar` have a `right` past the viewport. **0 page errors** at every context.
> - **P1:** 8 fully-bordered boxes, all 11 px chips, **0** carrying body-or-larger type.
> - **P4:** largest:smallest rendered type = **2.73× / 3.19× / 5.27×**, all over §6.2's 2.5× floor.
> - **P3 asserted, not assumed:** `completed` computes **14.56:1** (dashed border, full ink) against
>   `planned`'s **5.1:1**. `completed ≥ planned` is **true**. All three chips have `opacity: 1`.
> - **P5:** on the provisional path, the confirmed row and the provisional row both compute
>   `opacity: 1` — the state is carried by a mark, never by attenuation.
> - **`wide` adds no layout:** 42 shared elements compared between **1280** and **1600**;
>   **0 differ in width.**
> - **Motion:** at `reducedMotion: 'no-preference'`, 14 non-zero durations, all **0.12 s**, all on
>   `cubic-bezier(0.23, 1, 0.32, 1)`; **0** over 300 ms and **0** bare `ease-in`. At
>   `reducedMotion: 'reduce'`, **0 non-zero durations — every one resolves to `0s`.** The row
>   expansion is `--dur-row: 160ms` (`styles.css:159`), under §5.5's 180 ms ceiling.
> - **Touch targets by rect** at both phone contexts: **0** controls under 24×24, **0** under 44×44.
> - **Tablist keyboard, driven by real key presses:** `ArrowRight` from the last tab wraps to the
>   first, `ArrowLeft` from the first wraps to the last, `Home` → first, `End` → last, and exactly
>   one tab carries `aria-selected="true"` throughout. §5.6 item 5 is real, not declared.
> - **The accordion, driven:** clicking a country row flips `aria-expanded` to `true` at every
>   context in both schemes, and the expanded `PAST TRIP` chip renders **whole** at 1280 and 1600 —
>   R41-2 confirmed fixed by my own look, not by the repair's test. The expanded row is a hairline,
>   not a card (R41-16). Expanding `AT` at 1280 moved **nothing** in the right-hand column (R41-8).
> - **The provisional path, driven** with one `completed` trip to `AT` and one `active` trip to
>   `AT`+`GB`: `AT` renders confirmed with no mark; `GB` renders `data-provisional="true"` with the
>   dashed side rule and an outlined dashed badge reading **`ON A TRIP YOU ARE ON NOW`**, at full
>   ink. This is `CLAUDE.md`'s *"never present a suggestion as the user's own plan"* rendered
>   correctly, and it is the clearest single piece of evidence on the screen.
> - **The empty path, driven:** zeroes rather than placeholders, the two-ways-forward sentence
>   (*"Record a past trip, or open one you have already taken — this record fills itself from your
>   library."*), and *"No places yet."* as the distinguished branch. **No illustration, no ghost
>   cards, no invented content** — §0 rule B honoured.
> - **The refusal path, driven:** the banner carries the row id and the parser message in the same
>   11 px tracked-mono kicker register as the healthy path (R41-9), and the **Trips tab still works**
>   behind it on both branches.
>
> **The five §5.6 shell items all landed**, checked in source and then driven: `TabId` gains
> `'profile'` (`App.tsx:43`, `TABS` entry at `:85`); the bottom bar is
> `position: fixed; inset: auto 0 0 0` with `padding-bottom: env(safe-area-inset-bottom, 0px)`
> (`styles.css:348`–`354`) and `.app` reserves
> `calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px))` (`:313`); `--chrome-h` replaces the
> hardcoded `top: 2.7rem` (`:146`, `:1375`); `--pane-cap: min(38svh, 300px)` (`:951`) with `.spine`
> at `calc(100svh - var(--chrome-h))` (`:505`); `--tap: 44px` (`:143`) applied at eight call sites;
> arrow-key traversal at `App.tsx:296`–`305`.
>
> ---
>
> ## Routing
>
> | id | severity | agent | what must be done |
> |---|---|---|---|
> | **R42-1** | MINOR | **builder** | **Do this one first, ahead of R42-2 and R42-3, and land it before any further surface increment ships.** The `·` in the claim no longer trails a wrapped line — it now **leads** the next one, so at 320 px the claim renders as `5 COUNTRIES` / `· 6 CITIES` / `· 30 DAYS TRAVELLED` and reads as a bulleted list. I measured **2 leading orphans at iPhone SE, 1 at iPhone 14, 1 at 1280**, identical on Chromium 141 and WebKit 26.0, in both schemes. Files: `apps/web/src/views/Profile.tsx:377` (`{i > 0 && <span className="claim__sep" aria-hidden="true">·</span>}`) and `apps/web/src/styles.css:1162` (`.claim__sep { order: -2 }`). **Take R41-5's second option, not its first**: suppress the separator at a line break rather than moving which pair owns it — emit it as a `::before` on the following pair *and* hide it when it begins a line box, or use a `text-wrap` control that keeps the separator bound to the run before it. **Fix the instrument in the same pass:** `qa/i8b-render.mjs:429`–`442` (`A2b`) asserts only *"nothing sits to this separator's right on its own line box"*; add the mirror clause *"…and nothing sits to its left"*, so the assertion can see both failure directions. `qa/r41-shell.mjs` §P4 is stale by construction and must **not** be re-pointed — it is a prior round's evidence. Repro: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r42-attack.mjs` §F2. |
> | **R42-2** | MINOR | **builder** | The refusal-equivalence criterion (`DESIGN.md` §6.2, the check that replaces R41-13's allow-list) compares a **text-node walk** (`qa/i8b-render.mjs:306`–`322`, `PAINTED_TEXT`, used at `:864`–`:870` in `F12`), so it honours none of `display: none`, `visibility: hidden` or `text-transform`. **Substitute `innerText` on the active panel**, which subsumes the `::before`/`::after` case the walk was written for and closes all three. **I verified there is no live divergence to fix behind this** — Map and Profile produce byte-identical `innerText` on both branches on both engines — so this is guard-hardening, not a product repair, and it must not be allowed to grow into a `WorldMap.tsx` diff: find the map's banner by class, never by a test id (§5.6's fence). Add the three CSS-only divergences as rendered faults in `qa/i8b-faults.sh` so the widened criterion has a control. Repro: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r42-attack.mjs` §G2. |
> | **R42-3** | MINOR | **builder** | §6.2's *"no control exists only at `:hover`"* names three conditions; `B4` can only ever fire on one. `qa/i8b-render.mjs:462`–`465` filters candidates through `vis` (`width > .5 && height > .5 && visibility !== 'hidden'`) before `:492`–`:495`/`:506` test the predicate, so a `display: none` control never enters the set and a `visibility: hidden` one is excluded by name — only `opacity: 0` survives. Evaluate the predicate over **every element carrying a `:hover` rule**, before any visibility filter. **The trap, which I hit myself and which will otherwise be filed as a false regression:** `.crow__trips` computes `visibility: hidden` while the accordion is collapsed (`styles.css:1280`), which is deliberate and correct, so a naive widening lights up **10** `.triprow__open` elements on the shipped build. The exclusion must be *"inside a `.crow__trips` that is not inside a `.crow--open`"* — **not** `closest('[aria-expanded="false"]')`, because `aria-expanded` is on a sibling button. With that exclusion I measure **20 `:hover` selectors, 38 elements, 0 offenders**, so the widened check must be **green** on the shipped build; if it is red, the exclusion is wrong, not the product. Repro: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r42-attack.mjs` §H. |
> | **MGR-8** | MINOR | **architect** | **§6.2's dead-space criterion does not say what to do about the page below the content column, and two consecutive rounds have now measured that number and declined to route it.** §6.2 reads *"the tallest run of vertical space containing no rendered ink is ≤ 25 % of viewport height at contexts 1–3 and ≤ 33 % at 4–5"* with a parenthetical scoping it container-level. The shipped assertion implements the parenthetical and is correctly green. But the space **below** `.profile`'s container is outside the criterion by construction, and round 41 recorded it at iPad Mini, round 42 at **35 % (1280)** and **42 % (1600)**, both above §6.2's own stated figure — each time as an unrouted observation. I confirm the shipped assertion is right and the screen is **not** defective: at five countries the page is honestly short, and filling it would violate §0 rule B. **The defect is in the contract, not the code.** Rule once, in §6.2's sentence rather than its parenthetical, whether "space below the content column at desktop" is ever a criterion on any surface — and if it is not, say so, so the next eight UI increments' breakers do not each re-derive this and each decide not to file it. One sentence. **Explicitly not a licence to add content to Profile.** |
>
> **Not reopened, and correctly so.** **R41-10** (`--ink-faint` at 2.63:1) is byte-unchanged by this
> arc — I confirmed `git diff bce2cfb HEAD -- apps/web/src/styles.css | grep -E '^[+-].*(ink-faint|tripcard__meta)'`
> returns only comment lines — is on the **Library**, not this surface, and stays routed to
> whichever increment next opens the Library. **R39-6**, **R33-7**, **R35-2/3**, **R39-7**,
> **R40-1/2/3** are unchanged and remain where they were routed. The two stale-by-design probes
> (`qa/r33-a11y.mjs:85`, `qa/i8a-signals.mjs:252`/`:260`) and round 42's two additions
> (`qa/r41-shell.mjs` §V, §P4) are prior rounds' evidence and **must not be re-pointed by a builder
> pass.**
>
> **No routing to the architect on the design itself.** Nothing in this increment was painful to
> build for a reason that traces to the spec. The one genuine spec contradiction this arc surfaced —
> §5.5's *"same component"* against §5.6's zero-line fence — was found by the builder, filed by the
> breaker as **R41-14**, ruled by the architect in `DESIGN.md` revision 2 / `ARCHITECTURE.md`
> revision 39 **while the repair was in flight**, and implemented in the same pass. I checked the
> ruling's three parts myself: the fence holds (zero-line diff), the shared component exists and the
> Profile uses it (`apps/web/src/views/Refusal.tsx`), and the two surfaces render identical text on
> both branches. **That is the pipeline working as designed**, and it is the reason this increment
> only needed one send-back.
>
> ---
>
> ## Genuinely unverified on real iOS / WebKit-on-device — stated separately, per Jacob's instruction
>
> **This is not part of the ship decision above and must not be read as covered by it.** No round in
> this arc — 41, 42, or this one — has run Cairn on an actual iPhone. I re-confirmed the engine-level
> limit myself rather than inheriting it: **Chromium 141 and WebKit 26.0 both report
> `env(safe-area-inset-bottom)` as `0px` in this environment** (measured with a live
> `height: env(safe-area-inset-bottom, 0px)` probe element, not read from a report). WebKit is the
> right *engine* — it is what iOS Safari uses — but WebKit-on-Linux has no notch, no home indicator
> and no retracting browser chrome. **The engine half of §6.4 is closed. The device half is not.**
>
> What that leaves genuinely unverified, itemised:
>
> 1. **Real safe-area insets.** The notch, the home indicator and landscape's left/right insets have
>    never resolved to a non-zero value in any run. *Mitigation I verified:* forcing the inset to
>    34 px over the shipped build leaves the last ink **31 px clear of the bar with 0 px of sideways
>    overflow, on Chromium and on WebKit.* That is §6.4's option-2 fallback and it is the best
>    available substitute. It is not a discharge.
> 2. **iOS Safari's retracting chrome, and therefore the whole reason R3 prefers `svh` over `dvh`.**
>    On Linux WebKit `svh === dvh === lvh`, so the token change at `--pane-cap` and `.spine` is
>    correct **by inspection and by a greppable ceiling**, and its real behaviour — the map card and
>    the spine not resizing mid-scroll as the address bar retracts — has never been observed.
> 3. **The virtual-keyboard rule** in §3.4 (*"the bottom bar hides while an input in that surface has
>    focus"*). Profile has no input, so nothing exercises it. The rule is written and untested; the
>    first surface with a focused input inside a bottom-fixed container is where it gets its first
>    real test.
> 4. **Real touch behaviour on device** — momentum scrolling, rubber-banding, Safari's tap highlight,
>    and how the fixed bar behaves over the home indicator during an overscroll. Driven `page.tap`
>    under a device profile is not the same thing.
> 5. **A real screen reader.** Every accessibility claim in this arc — including §3.5's
>    *"Countries, 7"* — is the computed accessibility tree, not VoiceOver output.
>
> **My recommendation to Jacob: ship anyway.** The residue is bounded, it is the same residue the
> product has carried since I-8a, the mitigations are verified on the correct engine, and there is
> no user on a phone yet. The right moment to close it is the first time Jacob opens Cairn on his
> own iPhone — which costs him two minutes and is worth more than any further emulation. **The one
> decision I need from him is whether he wants that to happen before the next UI increment opens, or
> whether it can run in parallel.** See *For Jacob* below.
>
> ---
>
> ## Two corrections to my own instrument, recorded because this file is evidence
>
> Neither changed the verdict; both would have produced a false finding if I had filed the first
> output I got.
>
> 1. **My `:hover` sweep initially found 0 selectors** — vacuously green. `CSSStyleRule` exposes an
>    **empty but truthy** `.cssRules` under CSS nesting, so my walk recursed into every style rule
>    and never reached the `selectorText` branch. Testing `selectorText` **before** recursing gives
>    20 selectors over 38 elements. **An assertion that examined nothing reported success**, which is
>    the same class as R41-1 and R42-3 and is worth naming as this project keeps meeting it.
> 2. **My claim-dominance assertion initially reported a 1.00× margin.** `.claim` is a `<dl>` (as
>    §3.5 requires), so the largest text node sits on an unclassed `<dt>`, and my
>    `closest('.claim, [class*=claim]')` resolved to `.claim__pair` — an element **inside** the claim
>    — leaving the rest of the claim in the "outside" comparison set. Scoped to the `.claim` block
>    the real margins are 1.58× / 1.85× / 3.05×.
>
> ---
>
> ## For Jacob
>
> **The Profile screen is done and I am shipping it.** It is the first Cairn screen built to a
> written design contract instead of to taste, and it holds up: I opened it myself at three phone
> and desktop sizes, in light and dark, on two browser engines, and looked at every screenshot.
>
> **What it actually does.** It opens with your travel record as one large typographic line —
> *"5 COUNTRIES · 6 CITIES · 30 DAYS TRAVELLED"* — then your countries as a plain ruled list with the
> cities you visited under each, then your trip counts, then a block headed **"What we do not know"**
> that tells you how many of your records could not be placed on a country. That last block is the
> part I would point at: no travel app admits its own gaps, and it is the thing that stops this
> looking like a dashboard. When you have nothing recorded it shows zeroes and tells you the two ways
> to fill it — it does not invent fake content to look busy. A country you are visiting *right now*
> is marked **"ON A TRIP YOU ARE ON NOW"** in a dashed badge, so a place you are only partway through
> never silently counts as somewhere you have been.
>
> **The navigation moved to the bottom of the screen on phones.** That is the one structural change,
> and it is why the app is now usable one-handed.
>
> **What is left, and none of it blocks.** Four small things, all tracked:
>
> - **One you can see.** On a narrow phone the `·` separators in that big headline wrap onto the
>   start of the next line, so it reads a bit like a bulleted list. It is cosmetic — no number is
>   wrong — but it is on the biggest text on the screen, so I have made it the **first** thing the
>   builder does next, before any other screen gets built.
> - **Three you cannot.** Two are weaknesses in our own test equipment rather than in the app; I
>   checked by hand that neither is hiding a real problem, and neither is. The third is a sentence in
>   the design document that needs tightening so the next eight screens do not each re-argue it.
>
> **One decision I need from you.** Nobody has opened Cairn on a real iPhone — every round, including
> mine, has run it in a simulated browser. Simulators cannot show the notch, the home indicator, or
> the way Safari's address bar slides away as you scroll, and those are exactly what the bottom
> navigation bar has to sit correctly against. I have tested everything I can around that gap and
> forced the values by hand, and it holds. **But two minutes with the real thing on your phone would
> close it properly.** Do you want that done before the next screen is built, or is it fine to run
> alongside? If you would rather just look at it: `cd cairn && npm run web:build && npm run serve`,
> then open it on your phone on the same network.

---

# I-8f + I-8j — the manager-gated prerequisites for I-8b (A-47 / A-54)

> **Status: CLOSED.** Superseded as the *current* verdict by the **I-8b** gate above; its own
> verdict and routing stand as written. Manager, stage 4. Reviewed `master` @ `3044bdd` (QA round 40's record
> landed alongside at `f622ab9`), 2026-09-01, Node v22.22.2, Chromium via the system Playwright
> at `/opt/node22/lib/node_modules/playwright`, `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`.
> **Verdict: I-8f SHIP. I-8j SHIP.** Scope was those two increments and nothing else; **I-8b is
> not included and does not ship here.** Every claim below has a command in
> **Verified — I-8f + I-8j** that I ran myself, on this tree.
>
> **The question Jacob asked, answered first: yes — I-8b is permitted to open.** All three
> items my own I-8i gate marked *"gates I-8b"* (**MGR-1**, **MGR-2**, **R39-1**) are closed, and
> I closed each of them by re-deriving it rather than by reading round 40's or the builder's
> report. `ROADMAP.md` I-8b's dependency line names **I-8a, I-8c, I-8d, I-8e, I-8f, I-8g and
> I-8j**; the first four already shipped under manager verdicts, and the last three ship or have
> shipped as of this entry. **Nothing on that line is outstanding.**
>
> **Per Jacob's instruction for this pass I did not rubber-stamp round 40.** I re-ran the suite,
> both fault matrices, all five render probes and all four of round 40's own evidence files; I
> re-measured MGR-1 in Chromium **at nine widths and four libraries that neither A-54, the
> builder nor round 40 used**, with the superseded A-51 G7 rule re-injected so my *"before"* was
> measured on this tree rather than transcribed; I drove I-8f's failure path end to end through
> the real browser on **both** `openTrip` and `browseTrip`; I re-derived predicate D and I19
> against my own hand-built indices; and I computed the whole world-map frame at `91597b7` in a
> worktree and diffed it against `HEAD` so the *"Jacob's map does not move"* claim is a
> comparison I performed, not one I read.
>
> **I agree with round 40's verdict on both increments, I confirm all three of its MINORs, and I
> found two things it did not.** **MGR-5** is an attribution defect: `A-54` Part 3 and the
> visual roadmap credit Jacob with the tie-break candidates *"westmost"* and *"largest"*, and
> the only traceable source of that pair in this repository is **my own `REVIEW.md` at
> `91597b7`**, where I offered them as my examples in a question **to** him. **MGR-6** sharpens
> R40-3 in a way that changes which fix will work.

---

## Verdict: **I-8f SHIP · I-8j SHIP · I-8b is permitted to open**

**Both increments build exactly what their rulings specify, neither contains a stub, and the
three defects that created this five-round follow-up arc are genuinely gone.** Not on anyone's
word — on my own runs, on this tree:

- **MGR-1 is closed, and I measured the *before* as well as the *after*.** My own A/B over
  4 libraries × 9 widths (**430 · 600 · 700 · 850 · 1100 · 1200 · 1366 · 1800 · 3000** — none of
  them in A-54's sweep, the builder's five or round 40's thirteen): with A-51 **G7** re-injected
  as a stylesheet override the container goes to **66.737 %** bare on a one-pane library,
  **45.562 %** on `FR`+`US` and **29.048 %** on the Europe 2026 fixture — reproducing to the
  third decimal the three numbers I filed at the I-8i gate. On the shipped **G7′** the worst of
  those 36 pairs is **0.318 % empty and 0.000 % overflow**, and **G7″ holds at every one**: zero
  cells with a border, an outline, a box-shadow or a background differing from
  `.worldmap__figure`'s. **I then looked at the screenshots.** The grey block under the Europe
  2026 card is gone and the space is card-white; the one-pane library is a large centred map with
  white beside it instead of a small map with two thirds grey. That is A-54 Part 1's stated
  outcome, delivered.
- **MGR-2 is closed, and I-8f is not a paper increment.** `openFailures` is real state in
  `reducer.ts`; `noteOpenFailure` is called from the **actual `catch` blocks** around
  `core.fromJSON` in both `openTrip` (`store.ts:1139`) and `browseTrip` (`:1174`), each
  rethrowing the original error after the `set`; all **six** `...initialState()` transition sites
  carry the field; `rowUnopenable`'s body is exactly A-47 Part 3's three disjuncts;
  `rowDatesReadable` has **zero deleted lines**. I drove it in Chromium: on `openTrip` the card
  goes from honestly unflagged → chip + hint + *"Save a copy"* + the *"save a copy first"* Delete
  sentence, the meta line still reads `2026-08-07 → 2026-08-22 · 6 cities` through the **narrow**
  gate, the rescue download is **140,511 bytes byte-identical** to storage and still carries
  `2026-02-30` verbatim, and a reload clears the flag. **Round 40's claim about the `browseTrip`
  path — the gap the I-8f builder itself declared unverified — is true, and I reproduced it
  independently**: the Browse & copy picker lists the unopenable trip, selecting it prints
  *"expected a real calendar date in YYYY-MM-DD (at `$.days[3].date`)"* rather than crashing, the
  trip you have open is untouched, and after closing it the Trips list carries **1** chip, **1**
  hint and **1** rescue control — on the broken card only, with the healthy clone unflagged.
- **R39-1 is closed, and the guard is a property of core rather than of a build tool.** On my own
  hand-built indices, **10 of 10** malformed ring shapes — `[]`, `[7]`, `[1,2,3]`, `[1,NaN]`,
  `[1,Infinity]`, a string coordinate, a `null` coordinate, no rings at all, and the all-or-stated
  case in **both** entry orders — give `countryParts → []`, `countryKeyPoint → null`, and reach
  `missing: ["XX"]` through `worldMapFrame` with `viewBox` `-180 -90 360 180` and no `NaN`
  anywhere. The four small rings A-52 insisted on (**1 point, 2 points, 2 identical points, a
  `-0` coordinate**) are still **accepted** with finite boxes, so D excluded non-geometry without
  reintroducing a vertex-count minimum. A malformed code beside a healthy one leaves the healthy
  one drawn. On the shipped artefact: **292 entries · 239 distinct codes · 1,033 rings · shortest
  ring 8 elements · 0 odd-length · 0 non-finite · 0 ring-less · max |coordinate| = 180 · 0 codes
  rejected by D** — the census re-derived from the artefact, not quoted.
- **Nothing on Jacob's own map moved, and this is a diff I performed.** I built a worktree at
  `91597b7` and computed `worldMapFrame` at both commits. The **Europe 2026 fixture is identical
  in every respect** — three panes, same order, `viewBox` strings byte-for-byte
  (`-8.1779 -59.2407 31.494 17.3663` · `-125.8416 -50.5435 60.0314 26.618` ·
  `-172.8399 -72.4066 43.9088 54.5393`), weights 6 · 1 · 0. `FR`+`US` keeps all four `viewBox`
  strings and swaps **only** the two `weight 0` extent panes (Guiana · Alaska → **Alaska
  N 71.4 · Guiana N 5.8**), which is A-54 Part 3's single stated user-visible delta and is the
  proof that **G5′ is load-bearing** rather than agreeing with the key it replaced.
- **The boundaries hold.** `packages/core/src/derive/cluster.ts` is a **zero-line diff** from
  `91597b7` — third increment running, so the already-shipped day map cannot have moved.
  `WorldMap.tsx` is a **zero-line diff**, as both A-54 Part 5 and ROADMAP I-8j require.
  `packages/core` is a **zero-line diff across I-8f alone**, as A-47 Part 7 requires. Export
  surface **79** by `Object.keys` on the built namespace. `package.json`/`package-lock.json`
  **0** diff lines and `dependencies` absent entirely. `npm run golden && npm run sample` leaves
  the tree **clean**. Root read-only boundary untouched: `git diff` over
  `europe-2026-itinerary.html`, `docs/`, `tickets/` **empty**, `md5sum` still
  `7c69df3208ef91c8be0fb59a56443188`.
- **Nothing sensitive moved.** Over the whole `packages/` + `apps/` + `cli.ts` diff from
  `91597b7`, **0** added lines match `console.|fetch(|XMLHttpRequest|sendBeacon|navigator.|
  localStorage|sessionStorage|geolocation|watchPosition|imap|gmail|oauth|mailbox|EXIF|Date.now|
  Math.random|crypto.`. `node qa/r2-redact.mjs` → **KNOWN_LEAKS hits: 0**; its three
  `LEAKS FOUND` are the literal identifier strings `"OPTIONAL"` (×2) and `"BOOKINGS"` in the
  bundle and its sourcemap — **the door PIN, the booking references and the ticket URLs are not
  in any built asset**, which is §6.6 and Jacob's own 2026-08-25 decision holding. `openFailures`
  holds an id and a parser message, and I watched it die on reload in the browser: **not
  persisted, not exported, not in `history`.**
- **The reported state is true.** `npm run typecheck` clean on both projects. `npm run test:tap`
  **1165 pass / 0 fail / 0 skipped**. `bash qa/i8f-faults.sh` **ALL FAULTS RED, 17 of 17**, under
  **3 green baselines** it asserts before trusting anything. `bash qa/i8j-faults.sh` **ALL FAULTS
  RED, 20 red + 1 GREEN control** (fault 18, KD-80's deliberate one). `qa/i8f-render.mjs` **ALL
  CLEAR**, `qa/i8j-render.mjs` **ALL PASS**, `qa/i8i-render.mjs` **ALL CLEAR**. `qa/r35-store.mjs`
  **ALL CLEAR**. The standing FAIL counts are exactly the ones both reports publish and every one
  maps onto a filed, non-gating finding: `r39-a51.mjs` **1** (R39-6), `r39-render.mjs` **7**
  (5 × R39-6 + 2 × R39-7), `r35-render.mjs` **4**. All four of round 40's own evidence files run
  and reproduce: `r40-openfail.mjs` **ALL CLEAR**, `r40-browse.mjs` **ALL CLEAR**,
  `r40-layout.mjs` **ALL PASS**, `r40-a54.mjs` **1 FAIL** — which is R40-3 and is the only
  assertion in this whole pass that fails.

**Why this is a SHIP and not a SEND BACK, stated rather than assumed.** The three items that
gated I-8b are closed on measurement, not on argument. The three findings round 40 filed are all
about the **instrument**, not the product, and I proved that rather than accepting it — see
**R40-1** below, where I re-ran every affected mutation across the whole arc. **MGR-5** is real
and it matters, but it is an attribution error in two internal documents with no product
consequence and no user-visible surface; holding a five-round prerequisite gate closed over a
sentence in a design doc, when the ruling it describes stands on its own independently measured
reasoning, would manufacture a round rather than close one. It is routed to the architect and
put in front of Jacob directly, which is what the convention it breaks actually asks for.

---

## MGR-5 — two documents credit Jacob with a suggestion that is mine

**MAJOR (attribution). Architect. Does not gate I-8b.**
`ARCHITECTURE.md` §4.4 **A-54** Part 3 · `CAIRN_VISUAL_ROADMAP.md` line 100 (and its `.html`
twin).

A-54 Part 3 writes:

> **Jacob's *"westmost"* is therefore taken as the *second* key** … **Jacob's other candidate,
> *largest*, is refused.**

and the visual roadmap — the file Jacob actually reads — says:

> **Your tie-break question, answered: (b), and it is *northmost*, not westmost.** You offered
> westmost or largest.

**Jacob did not offer them. I did.** `git log -S"westmost" -- cairn/docs/` returns exactly two
commits: `91597b7` — **my own I-8i gate**, where the string first enters the repository in *For
Jacob — I-8i* item 3, phrased as my example inside a question **to** him —

> break the tie by something geographic instead — **westmost first, say, or largest first**.
> (a) is free; (b) is a small change … **Which would you prefer?**

— and `3f92ac9`, the architect revision that turns my two examples into *"Jacob's westmost"* and
*"Jacob's other candidate, largest"*. **There is no commit between the two recording an answer
from Jacob**, and no grep over `docs/` finds one. The visual roadmap's *"answered: (b)"* is us
answering our own question on his behalf and then reporting it back to him as his.

This is the root `CLAUDE.md` convention that outranks the rest of them — *"Never present my
suggestions as Jacob's/the user's own plan"* — broken in the two documents whose whole job is to
tell Jacob where his project stands. It is worse, not better, that the answer chosen (*northmost*)
is **neither** of the options credited to him.

**What the architect must do, precisely.** Do **not** change G5′. The ruling is sound on its own
evidence and I verified that evidence independently (the ±180 seam catching `AQ`/`FJ`/`RU`, and
`north` distinct on all 242 single-country panes while `west` collides on 9). Change the
**attribution**, at both sites, in one pass:

1. **`ARCHITECTURE.md` A-54 Part 3** — replace *"Jacob's `westmost`"* and *"Jacob's other
   candidate, `largest`"* with the true provenance: the manager's I-8i gate offered *westmost* and
   *largest* as two examples of a geometric key while asking Jacob to choose between accepting the
   alphabet in the open (option a) and replacing it (option b). Say plainly that **A-54 takes
   option (b) on the architect's own reasoning and that Jacob's answer is not on record**, and mark
   the whole of Part 3 as **provisional pending Jacob** in the same way §8.8 marks live presence.
2. **`CAIRN_VISUAL_ROADMAP.md` line 100 and the `.html` twin** — the sentence must stop telling
   Jacob what he offered. It should say: *we asked you a question, we have not had your answer,
   and we implemented (b) with a third key you did not name because the two we suggested both have
   a defect we then measured. Here is why, and here is how to overrule it.*
3. **If Jacob did answer and it simply was not written down, record it** with the date, and this
   item closes as a bookkeeping fix rather than an attribution one. That is his call to make, not
   ours to assume — it is in *For Jacob* below.

---

## MGR-6 — R40-3 is right, is correctly MINOR, and is wrong about the mechanism in a way that decides the fix

**MINOR. Architect. Does not gate I-8b.** Confirms round 40's severity and routing, and replaces
its diagnosis. `ARCHITECTURE.md` §4.4 **A-54** Part 6 (**I19**) ·
`packages/client/src/selectors/worldMap.ts:246` (`frameNum`) · `packages/core/src/derive/cluster.ts:197`
(`mapBounds`).

**I agree with round 40's grading, and I did the reachability work rather than repeating its
sentence.** The only call site of `worldMapFrame` in shipped code is `WorldMap.tsx:112`, and its
second argument is `COUNTRY_INDEX` **statically imported** from `packages/core/src/geo/countries.gen.ts`
— I grepped every reference to `worldMapFrame`, `COUNTRY_INDEX`, `countryIndex(` and
`decodeCountryIndex` across `apps/` and `packages/` to confirm there is **no port, no prop, no
storage record and no user input** through which any other index can reach the frame. The shipped
index's largest coordinate magnitude is **180**. To reach this defect you must be a programmer
calling a public core export with a hand-built index carrying coordinates around **1e304**, and any
plausible future injected index — a higher-resolution admin-0 layer, say — is WGS84 by definition
and is 306 orders of magnitude away. **This is theoretical, it is correctly deferred, and it does
not gate I-8b.** The builder implemented D exactly as ruled; this is the invariant's wording, not
the code, exactly as round 40 says.

**Where round 40 is wrong, and it matters.** Its finding says the overflow is in `east − west`,
at *"m ≥ 1e306"*. I re-derived it and both halves are off:

| library input | round 40 | measured by me |
|---|---|---|
| first magnitude that breaks | `m ≥ 1e306` | **`m ≈ 8.6e303`**, ~2.4 orders of magnitude lower |
| the overflowing expression | `east − west` | **`frameNum`, `worldMap.ts:247` — `Math.round(n * 1e4) / 1e4`.** At `m = 1e304` the subtraction is still finite (`2.08e304 < MAX_VALUE`); it is the **× 1e4** rounding step that goes to `Infinity` first |

**And there is a third regime nobody in this arc has seen, which is the reason this item cannot
be closed by patching I19's NaN clause alone.** At **`m = 8.9e307`** the frame emits

```
viewBox="-0.0056 -0.0056 0.0112 0.0113"   aspect=0.9911504424778762   missing=[]
```

— a **finite, plausible, entirely wrong** frame. The mechanism is one level further out than
either D or `frameNum`: `mapBounds`' span calculation goes non-finite, `raw >= MIN_SPAN_KM` is
therefore false, and its **clamp branch** widens a 0.01°-ish box about the centroid `(0, 0)`
while the country's `d` path spans `±8.9e307`. The result is a map framed on a hundredth of a
degree at Null Island with the geometry nowhere near it: **a blank map, no `NaN`, no `Infinity`,
`missing: []`, nothing stated** — R39-1's original harm, with I19 as literally written
(*"no `viewBox` contains `NaN`, no `aspect` is non-finite, no `part.box` component is
non-finite"*) reporting **pass**.

**What the architect must do, precisely.**

1. **Correct R40-3's two published numbers where A-54 records them** — the threshold is
   ~`8.6e303`, and the site is `frameNum`'s `× 1e4`, not the subtraction. Repro:
   `node --experimental-strip-types` over a one-entry index whose only ring is the square
   `[-m,-m, m,-m, m,m, -m,m]`, sweeping `m` at `1e300 · 1e303 · 5e303 · 8.6e303 · 9e303 · 1e304 ·
   1e305 · 8.9e307 · 1e308` and printing `worldMapFrame(...).viewBox`.
2. **Rule I19's quantifier, and pick a form that also covers the finite-garbage regime.** Round
   40 offers two cheap corrections; only one of them survives the `8.9e307` case. Scoping I19 to
   *"every index whose coordinates lie in the WGS84 domain"* **does** cover it, because it excludes
   the whole regime. Keeping *"every index"* and hardening D against non-finite **outputs** does
   **not** — every output at `8.9e307` is finite. **Say which, and say why, so the next builder
   does not implement the version that still measures false.**
3. **If the domain clause is chosen, note in place that A-54 Part 2's *"no other test, and in
   particular no minimum vertex count"* was an argument against a *resolution* filter, not against
   a *coordinate-domain* one.** They are different questions and A-54 never actually weighed the
   second. That is not a reversal; it is closing a gap the entry left open by not noticing it.

---

## R40-1, R40-2, R40-3 — confirmed as filed, and one of them extended

**All three are correctly MINOR, all three are correctly routed, and none of them blocks either
ship.** I re-ran each and confirmed it.

**R40-1 (builder) — confirmed, and I measured the blast radius round 40 did not.** The defect is
real and I reproduced it directly: in `qa/i8j-faults.sh`'s own `make_copy` — `cairn/` alone into a
`mktemp` dir — the unmutated noise floor is `test/views.test.ts` **# pass 39 # fail 1**,
`test/cli.test.ts` **# pass 3 # fail 24**, `packages/core/test/clusterPoints.test.ts` **# pass 12
# fail 2**. In `qa/i8f-faults.sh`'s root-inclusive `make_copy` all three are **# fail 0**. So any
fault scoped exclusively to one of those three suites reads `RED (expected)` unconditionally.

**The retroactive question — does this change my confidence in what I already shipped at
`91597b7`? No, and I checked rather than reasoned.** I enumerated every `fault`/`control`
invocation in `i8d`, `i8g`, `i8h`, `i8i` and `i8j`'s matrices and filtered to those scoped
**only** to a polluted suite: **16 of 72** (i8d 5/11, i8g 1/14, i8h 3/11, i8i 2/15, i8j 5/21). I
then re-applied each mutation in a copy that includes the repo root's read-only half and whose
baseline I asserted green first:

> **14 re-runnable, 14 genuinely RED, 0 that stop measuring, 2 whose mutation text no longer
> matches `HEAD`** (both `i8d`-vintage, in files three increments have since moved).

**So the finding is cleanly contained to the test-infrastructure layer and has no product-behaviour
implication.** Every *"ALL FAULTS RED"* claim I accepted in the `91597b7` verdict was true; some of
it was true for the wrong reason, and none of it was false. I am not reopening I-8d, I-8g, I-8h or
I-8i, and nothing shipped rests on an unverified claim.

**Builder, do this:** port `qa/i8f-faults.sh`'s `make_copy` (which copies
`europe-2026-itinerary.html`, `docs`, `tickets`, `index.html`, `manifest.json` into the temp
**parent**, by copy and never symlink) **and** its `baseline()` step into `qa/i8d-faults.sh`,
`qa/i8g-faults.sh`, `qa/i8h-faults.sh`, `qa/i8i-faults.sh` and `qa/i8j-faults.sh`. Correct
**KD-78**'s stated trigger in `BUILD-NOTES.md`: it names *"the next matrix that names
`test/cli.test.ts` or `test/boundaries.test.ts`"*, and the real condition is **any suite that reads
the repo root**, of which `test/views.test.ts` and `packages/core/test/clusterPoints.test.ts` are
two and `test/boundaries.test.ts` is **not** one (it is `# fail 0` in the bare copy — I measured
it). While in `i8d-faults.sh`, re-point or retire the two mutations that no longer match.

**R40-2 (builder) — confirmed, and it is one case wider than filed.** I reproduced the substitution:
all five `i8j-faults.sh` layout mutations turn red on the single assertion `I-8j / A-54 G7′: the
pane container is a wrapping flex line box, and G7″ leaves the cell unbordered`, and fault 5
(*"masonry: the sequence the eye follows stops being DOM order"*) exercises no reading-order
criterion at all. **The case round 40 missed:** in my re-run, `qa/i8i-faults.sh`'s *"the uniform
`--pane-cap` is replaced by the main/inset pair"* now also turns red on that **I-8j** assertion
rather than on anything of its own — KD-79's pattern, a third time, now crossing an increment
boundary. Builder: give faults 2–5 an assertion that fails **for the reason the label names**, add
the `i8i` one to that sweep, and close the gap that `qa/i8j-render.mjs` — which carries A-54 Part
1's actual content — **is never fault-injected by any matrix**.

**R40-3 (architect) — confirmed, routing upheld, superseded in substance by MGR-6 above.** Round
40's judgement call is the right one and I am not overriding it: this is a clause of A-54 that
measures false, not a gap in following A-54, so it belongs to the architect and not to the builder.
Read it **with MGR-6**, which corrects its threshold, its mechanism, and — the load-bearing part —
shows that one of its two suggested cheap fixes does not actually close it.

---

## MGR-7 — a BUILD-NOTES scope figure that does not re-derive, for the second increment running

**MINOR. Builder. Does not gate I-8b.** `BUILD-NOTES.md`, the I-8j addendum's scope paragraph.

It says **"Scope: 8 files changed, 2 added (plus this file and `qa/README.md`)"** and then
enumerates, in the same paragraph, **eleven** changed files: `country.ts`, `worldMap.ts`,
`styles.css`, `countryParts.test.ts`, `countryKeyPoint.test.ts`, `world-map.test.ts`,
`views.test.ts` — *"and four QA probes (`i8i-faults.sh`, `i8i-render.mjs`, `r39-a51.mjs`,
`r39-render.mjs`)"*. `git show --stat 3044bdd` is **17 files**, which is 11 changed + 2 added +
`BUILD-NOTES.md` + `qa/README.md` + **both `CAIRN_VISUAL_ROADMAP` files**, none of which the
paragraph counts. The list is right and the headline is wrong.

Filed because this is the same class as **MGR-3** at the last gate and it is now consecutive, in a
document whose whole value is that a reader can trust its numbers without re-deriving them. **The
I-8f addendum's own figure is correct** — *"8 files changed, 3 added"* + `BUILD-NOTES` + both
roadmap files + `qa/README.md` = the 15 files `git show --stat 359234b` reports, exactly. Builder:
fix the I-8j figure, and count the visual-roadmap twins in future scope lines since
`cairn/CLAUDE.md` requires updating them.

---

## Routing — I-8f + I-8j

**Five items. None blocks either verdict. None gates I-8b — the gate is clear.** Round 40
proposed routing for its three; I confirm all three as filed, extend two with my own
measurements, and add two of my own.

| id | severity | agent | gates I-8b | one line |
|---|---|---|---|---|
| **MGR-5** | MAJOR (attribution) | architect | no | A-54 Part 3 and the visual roadmap credit Jacob with *"westmost"*/*"largest"*; `git log -S` traces both to my own `REVIEW.md` at `91597b7`, and no answer from Jacob is on record |
| **MGR-6** | MINOR | architect | no | R40-3's threshold is `8.6e303` not `1e306`, its overflow site is `frameNum`'s `× 1e4` not `east − west`, and at `8.9e307` the frame is finite-but-wrong — so I19's NaN clause alone cannot close it |
| **R40-1** | MINOR | builder | no | five fault matrices measure their own zero; **16 affected mutations across the arc, 14 re-run, 14 genuinely red, 0 false** — contained to the harness |
| **R40-2** | MINOR | builder | no | five layout faults share one assertion and fault 5's label describes nothing it tests; `i8i-faults.sh`'s `--pane-cap` fault is a sixth case; `i8j-render.mjs` is never fault-injected |
| **MGR-7** | MINOR | builder | no | BUILD-NOTES' I-8j scope says *"8 files changed"* over its own list of 11; the commit is 17. Second consecutive increment (cf. MGR-3) |

**Carried forward from the I-8i gate, unchanged, still non-gating:** **R39-6** (builder —
`WorldMap.tsx:182`'s extent-pane `aria-label` claims *", shown in a separate frame"* where the
visible caption does not; I confirmed it is still open, it is the single `r39-a51.mjs` FAIL and
5 of the 7 `r39-render.mjs` FAILs), **R39-7** (architect — `FJ` at 342.2 × 2.2 px, now disclosed
under A-51 residue 3 with the number attached; the other 2 `r39-render.mjs` FAILs), **R35-2**
(builder — the hint line's 2.63:1 contrast, still visible on the card I rendered) and **R35-3**
(builder — card-height inflation). **None of these gates I-8b and none of them is made worse by
either increment.** The three stale *"grid cell (A-51 G7)"* comments in `WorldMap.tsx` are not a
finding — the zero-line diff is required by two documents and I verified it — and should ride the
next increment that has a legitimate reason to open that file.

### architect — two items, both small, neither blocking

- **MGR-5.** The three-step correction is written out above. **Do not change G5′.** The urgent
  half is the visual roadmap, because it is addressed to Jacob in the second person and currently
  tells him something about himself that is not true.
- **MGR-6 / R40-3.** The three-step correction is written out above. The one thing that must not
  happen: closing this by adding a `Number.isFinite` check on the frame's outputs, which passes at
  `8.9e307` while the map is blank.

### builder — three items, all in `qa/` and `BUILD-NOTES.md`, no product code

- **R40-1.** Port `i8f-faults.sh`'s `make_copy` + `baseline()` into the other five matrices;
  correct KD-78's trigger to *"any suite that reads the repo root"*; re-point or retire
  `i8d-faults.sh`'s two now-unmatched mutations. Repro: `bash qa/r40-vacuity.sh`.
- **R40-2.** Give `i8j-faults.sh` faults 2–5 assertions that fail for their own labelled reason;
  add `i8i-faults.sh`'s `--pane-cap` fault to that sweep; put `qa/i8j-render.mjs` under at least
  one injected fault so A-54 Part 1's container criterion has fault coverage.
- **MGR-7.** Correct the I-8j scope figure and start counting the `CAIRN_VISUAL_ROADMAP` twins.

### breaker — nothing is owed

**Round 40 did its job and I am not routing anything back to it.** It treated two increments as two
targets, re-derived every builder number rather than quoting it, closed the one gap the I-8f builder
declared open (`browseTrip` through the browser) and found a defect in its own instrument and filed
it against itself. The one thing I would have asked for — the blast-radius audit behind R40-1 — I
did myself above and it came back clean, so there is nothing left to ask. R40-3's diagnosis is
wrong in its mechanism, which MGR-6 corrects; the finding itself was right and finding it at all
was the valuable act.

---

## Verified — I-8f + I-8j: what I ran, and what happened

All from `/home/user/europe-2026-planner`, `master` @ `f622ab9` (product commits `359234b` and
`3044bdd`), Node v22.22.2, Chromium via `/opt/node22/lib/node_modules/playwright` with
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, served from a `node tools/serve.mjs` I started myself
over a `dist` I built myself (`index-4PaVQ4kK.js`, confirmed by fetching `/`).
`git status --porcelain` **empty** before and after; the worktree I created at `91597b7` for rows
17–18 was removed and `git worktree list` shows only the main tree.

| # | Command | Result |
|---|---|---|
| 1 | `npm run typecheck` | exit **0**, both projects; `pretypecheck` regenerated the redacted sample (`16 days, 112 stops, 31 pool, 95 places, 120 import issues, source 40955ca0b182, REDACTED per §6.6`) |
| 2 | `npm run test:tap` | `# tests 1165 · # pass 1165 · # fail 0 · # skipped 0`, 28.7 s. **BUILD-NOTES' and round 40's 1165 are both accurate** |
| 3 | `npm run golden && npm run sample && git status --porcelain` | tree **clean**; sha `40955ca0b182dddcc33540accadf2a65a329bc20b9e6ca109c9884e776bb06d2`. Byte-identical regeneration |
| 4 | `git diff 91597b7 HEAD -- cairn/packages/core/src/derive/cluster.ts \| wc -l` | **0** — the day map cannot have moved. Third increment running, which is MGR-4's corrected count |
| 5 | `git diff 91597b7 HEAD -- cairn/apps/web/src/views/WorldMap.tsx \| wc -l` | **0** — A-54 Part 5 and ROADMAP I-8j both require it |
| 6 | `git diff 91597b7 359234b -- cairn/packages/core/ \| wc -l` | **0** — A-47 Part 7's *"`packages/core` is untouched — zero diff lines"* |
| 7 | `Object.keys` on the built core namespace | **79** |
| 8 | `git diff --stat 91597b7 HEAD -- cairn/package.json cairn/package-lock.json` | **empty**. No dependency added; `package.json` has `devDependencies` only, no `dependencies` key at all |
| 9 | `git diff --stat 91597b7 HEAD -- europe-2026-itinerary.html docs/ tickets/` + `md5sum` | **empty**; `7c69df3208ef91c8be0fb59a56443188`, unmoved. The read-only boundary holds |
| 10 | privacy grep over the whole `packages/`+`apps/`+`cli.ts` added-line diff | **0** matches across the full pattern set (network, storage, location, mailbox, EXIF, clock, RNG, crypto) |
| 11 | `node qa/r2-redact.mjs` | **KNOWN_LEAKS hits: 0**. `LEAKS FOUND: 3` = `"OPTIONAL"` in the bundle, `"OPTIONAL"` and `"BOOKINGS"` in the sourcemap — identifier strings, not credentials. `PIN 0754` is **not** in any built asset |
| 12 | my own D/I19 probe, hand-built indices, bare Node | **10/10** malformed ring shapes → `countryParts []`, `countryKeyPoint null`, `missing: ["XX"]`, `viewBox "-180 -90 360 180"`, no `NaN`. **4/4** small drawable rings (1 point, 2 points, 2 identical points, `-0`) accepted with finite boxes. All-or-stated holds in **both** entry orders. A bad code beside a healthy one leaves the healthy one drawn |
| 13 | the shipped `COUNTRY_INDEX`, recomputed from the artefact | **292 entries · 239 distinct codes · 1,033 rings · shortest 8 elements · 0 odd-length · 0 non-finite · 0 ring-less · max abs coordinate 180 · 0 of 239 codes rejected by D** |
| 14 | my own overflow sweep (**MGR-6**) | finite `viewBox` to `m = 8.6e303`; `Infinity` from `m = 9e303`; `NaN` at `m = 1e308`; **`viewBox="-0.0056 -0.0056 0.0112 0.0113"`, `aspect 0.991`, `missing: []` at `m = 8.9e307`** — finite, plausible and wrong. `countryParts`' own postcondition (every `part.box` component finite) holds at **every** magnitude |
| 15 | trace of every `worldMapFrame` / `COUNTRY_INDEX` / `countryIndex(` / `decodeCountryIndex` reference in `apps/` + `packages/` | one shipped call site, `WorldMap.tsx:112`, with a **statically imported** `COUNTRY_INDEX`. **No port, no prop, no storage record** can inject an index — row 14 is unreachable from any data path |
| 16 | my own MGR-1 A/B in Chromium — 4 libraries × 9 widths (**430 · 600 · 700 · 850 · 1100 · 1200 · 1366 · 1800 · 3000**, used by nobody in this arc), shipped G7′ vs. A-51 G7 re-injected as an override | **shipped: worst 0.318 % empty, 0.000 % overflow, 0 G7″ violations over all 36 pairs.** Re-injected G7: **66.737 %** (one-pane and `FJ`-alone at ≥ 1100), **45.562 %** (`FR`+`US`), **29.048 %** (Europe 2026) — the three numbers I filed at the I-8i gate, reproduced to three decimals |
| 17 | screenshots of the Europe 2026, `FR`+`US` and one-pane cards at 1200 px, new vs. old, **which I opened and looked at** | old: a grey `var(--line)` block occupying the bottom-left of the card / two thirds of the one-pane card. New: the same maps with card-white space and the container's ink only in the 1 px separators. The one-pane map is visibly larger and centred |
| 18 | `worldMapFrame` computed at `91597b7` in a worktree vs. `HEAD` | **Europe 2026: identical** — 3 panes, same order, all three `viewBox` strings byte-for-byte, weights 6 · 1 · 0. **`FR`+`US`: all four `viewBox` strings identical, only the two `weight 0` extent panes swap** (Guiana · Alaska → Alaska N 71.4 · Guiana N 5.8). I18 holds in both |
| 19 | my own I-8f drive-through, Chromium, `openTrip` | before the tap: chip **0**, rescue **0**. After: chip **1**, hint **1**, rescue **1**, meta line still `2026-08-07 → 2026-08-22 · 6 cities`, Delete's confirm carries *"save a copy first"*, download `europe-2026.cairn-unreadable.json` **140,511 bytes = the stored bytes exactly** and still containing `2026-02-30`. After reload: **0 / 0**. **0 page errors** |
| 20 | my own I-8f drive-through, Chromium, `browseTrip` (round 40's claim, re-derived) | the picker lists the unopenable trip; selecting it prints *"expected a real calendar date in YYYY-MM-DD (at `$.days[3].date`)"*; the open trip stays rendered and intact; after `closeTrip` the Trips list shows chip **1**, hint **1**, rescue **1** — **on the broken card only**, the healthy clone unflagged, both meta lines formatted; Delete's confirm carries *"save a copy first"*; after reload **0 / 0**. **0 page errors** |
| 21 | `node cli.ts stats --today …` sweep | exit **2** with A-45's sentence on `2026-13-45`, `2026-02-30`, `2026-2-3`; exit **0** on `0000-01-01` and `9999-12-31` — A-47 Part 6's containment assertion holding at `IsoDate`'s own domain boundaries |
| 22 | `grep '...initialState()'` in `store.ts`, and `rowUnopenable`'s body | **6** real transition sites (1077, 1104, 1144, 1208, 1247, 1379), **6** carrying `openFailures`; the other 4 hits are `...initialState().ui`. `rowUnopenable` is exactly A-47 Part 3's three disjuncts. `git diff … selectors/index.ts \| grep '^-'` → **0** deleted lines, so `rowDatesReadable` is byte-unchanged |
| 23 | `bash qa/i8f-faults.sh` | **ALL FAULTS RED, 17 of 17**, under **3 green baselines** (`views.test.ts` 40/0, `cli.test.ts` 27/0, `open-failures.test.ts` 24/0) |
| 24 | `bash qa/i8j-faults.sh` | **ALL FAULTS RED**, 20 red + **1 GREEN control** (fault 18, the canonical-position key — KD-80's deliberate one) |
| 25 | `qa/i8f-render.mjs` · `qa/i8j-render.mjs` · `qa/i8i-render.mjs` | **ALL CLEAR** · **ALL PASS** · **ALL CLEAR** |
| 26 | `qa/r39-a51.mjs` · `qa/r39-render.mjs` · `qa/r35-render.mjs` · `qa/r35-store.mjs` | **1 FAIL** (R39-6) · **7 FAIL** (5 × R39-6, 2 × R39-7, `FJ` at `<svg>` 356 × 16 / path 342.2 × 2.2) · **4 FAIL** (the four the I-8f report enumerates) · **ALL CLEAR** |
| 27 | round 40's own four evidence files | `r40-openfail.mjs` **ALL CLEAR** · `r40-browse.mjs` **ALL CLEAR** · `r40-layout.mjs` **ALL PASS** · `r40-a54.mjs` **1 FAIL** = R40-3, the only failing assertion in this entire pass |
| 28 | `bash qa/r40-vacuity.sh` | reproduces R40-1: `views.test.ts` **# fail 1** unmutated in the bare copy, all five G7 mutations **RED (real)** against a clean base |
| 29 | my own noise-floor measurement in `i8j-faults.sh`'s exact `make_copy` | `views.test.ts` **39/1** · `cli.test.ts` **3/24** · `clusterPoints.test.ts` **12/2**, unmutated. In `i8f-faults.sh`'s root-inclusive copy: **40/0 · 27/0 · 14/0**, and `world-map.test.ts` **113/0**, `boundaries.test.ts` **8/0** in both |
| 30 | my own blast-radius audit (**R40-1**) — every vacuously-scoped fault in `i8d`/`i8g`/`i8h`/`i8i`/`i8j`, re-applied against an asserted-green baseline | **16 of 72** invocations affected (5/11 · 1/14 · 3/11 · 2/15 · 5/21). Re-run: **14 genuinely RED, 0 that stop measuring, 2 whose mutation text no longer matches HEAD.** Nothing I shipped at `91597b7` rests on a false claim |
| 31 | `git log -S"westmost" -- cairn/docs/` (**MGR-5**) | exactly two commits: **`91597b7`** — my own gate, where I offered the word as an example in a question to Jacob — and **`3f92ac9`**, where it becomes *"Jacob's westmost"*. No commit between them records an answer, and no grep over `docs/` finds one |
| 32 | `git show --stat 359234b` / `git show --stat 3044bdd` (**MGR-7**) | **15 files** — matches the I-8f addendum's *"8 changed, 3 added"* + 4 doc files exactly. **17 files** — against the I-8j addendum's *"8 files changed, 2 added"* over its own enumeration of **11** changed, and it counts neither `CAIRN_VISUAL_ROADMAP` file |

---

## For Jacob — I-8f + I-8j

**Both prerequisites pass. The Profile screen is unblocked and work on it can start.**

Five rounds ago I stopped this project and said two things had to be fixed before the Profile
screen could be built: the map card was leaving up to two thirds of itself as grey empty space,
and a whole increment you had been told was scheduled had quietly never been built at all. A
third item came from the tester: a malformed map outline could blank the map with no error and
no message. **All three are now genuinely fixed, and I checked all three myself rather than
taking the reports at their word.**

- **The grey holes.** I re-measured the map card at nine screen widths that nobody in this arc
  had used, with the old rule put back so I had a real before-and-after rather than a quoted one.
  Before: **66.7 %** of the card bare in the worst case. After: **0.32 %**, which is the hairline
  between panels. Nothing spills outside the card at any width. I opened the screenshots and
  looked at them: the grey block is gone and the leftover space is now the card's own white.
- **The missing increment (I-8f).** It is built, it is wired into the real screens, and I drove
  it in a browser myself: plant a broken trip, tap it, and the card comes back saying it cannot be
  read, offering *"Save a copy"*, and warning you before Delete. The saved file was **exactly the
  same bytes** as what is on the device. I also did it through the *"Browse another trip"* picker
  and it behaves the same without disturbing the trip you have open.
- **The blank map.** Ten different kinds of broken outline all now produce a country **named on
  screen as unavailable** instead of an empty map, and none of the 1,033 outlines actually shipped
  is affected. I confirmed your **Europe 2026 map is byte-for-byte identical** to what it was
  before these two changes — I computed it at both commits and compared.

**One decision I need from you, and it is a small one about honesty rather than about the
product.**

Five rounds ago I asked you whether to accept that tied map panels are ordered alphabetically, or
to break the tie by something geographic — and I gave *"westmost first, or largest first"* as my
two examples. **The design document and your status board now both say those two options came from
you.** They did not; I can trace them to my own review and to nowhere else, and I cannot find any
record of you answering the question at all. The rule we shipped is a third option — **north to
south, then west to east, the way you read a map** — which is a good rule for reasons we measured
independently, and it does not need to change. But the documents crediting it to you do.

**So: did you answer that question, and did I just fail to write it down?** If yes, tell me and I
will record it with the date. If no — and this is the more likely case — I will have the
architect rewrite both documents to say plainly that we asked, we did not hear back, and we chose
on our own reasoning, marked provisional until you rule. Either way nothing about the map changes;
this is about not letting our suggestion calcify into your decision, which is the one rule in this
project I care most about not breaking.

**Everything else can wait.** Three small items go back to the builder (all of them in the test
tooling, none in the app) and one goes back to the architect (a sentence in the architecture
document that promises slightly more than the code delivers, for coordinates larger than anywhere
on Earth — I confirmed no real data can reach it, and sharpened the tester's diagnosis of it).
**None of them blocks the Profile screen.**

---

# I-8i — the world-map lifetime framing rewrite (A-51 / A-52 / A-53)

> **Status: CLOSED.** Superseded on *"what still gates I-8b"* by the **I-8f + I-8j** entry above,
> which discharges **MGR-1**, **MGR-2** and **R39-1** — the three items this verdict marked as
> gating — and by nothing else. The verdict itself stands as written. Manager, stage 4. Reviewed `master` @ `10455b9` (QA round 39's record
> landed alongside at `6ee6bf5`), 2026-09-01, Node v22.22.2, Chromium via the system Playwright
> at `/opt/node22/lib/node_modules/playwright`, `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`.
> **Verdict: SHIP.** Scope was I-8i and nothing else; **I-8b is not included and does not ship
> here.** Every claim below has a command in **Verified — I-8i** that I ran myself, on this tree.
>
> **Per Jacob's instruction for this pass I re-derived the decisive claims rather than reading
> them.** Round 39's SHIP recommendation is advisory and I treated it as such: I ran the suite,
> the fault sets and both render probes, and then rendered `FR`+`US` and the Europe 2026 fixture
> in Chromium from my own script and **looked at the screenshots** before reading anyone's pixel
> numbers for them.
>
> **I agree with round 39's verdict and I found something round 39 did not.** Every number the
> builder and the breaker published that I checked re-derived exactly. But neither of them
> measured the pane **container**, only the pane **cells** — and A-51 G7's grid leaves **29.0 %
> of the Europe 2026 map card, and 45.6 % of the `FR`+`US` card, as empty background at every
> viewport ≥ 640 px**, where the model it replaced left **0 %**. That is **MGR-1**, it is new at
> I-8i, it is on the fixture Jacob sees first, and it is why the atlas-frame track does not close
> here even though the frame's geometry does.
>
> **A second thing this gate exists to catch, found outside the increment:** **I-8f has never
> been built.** It is a fully specified ROADMAP increment carrying `ARCHITECTURE.md` §2.9
> **A-47**, answering QA **R35-1**, with a stated user-visible outcome — and `openFailures`,
> `rowUnopenable` and `noteOpenFailure` return **zero** matches in the tree. I-8g, I-8h and I-8i
> each shipped past its own declared dependency on it. That is **MGR-2**.

---

## Verdict: **SHIP**

**I-8i builds exactly what A-51, A-52 and A-53 specify, nothing in it is a stub, and the defect
seven rounds were chasing is genuinely gone.** I did not take that on the breaker's word. On my
own runs, on this tree:

- **`FR`+`US` — the case that made Jacob reopen the framing model.** Four panes, in the order
  `FR (home, weight 1) · US (home, weight 1) · extent FR (weight 0) · extent US (weight 0)`.
  **France renders 342.3 × 236.3 px** and **French Guiana 223.3 × 288.4 px** in Chromium at
  390 × 820, against round 38's **36 × 25 = 899 px²** France (R38-2) and **7 × 8 = 56 px²**
  Guiana (R38-4) — 90× and 1,150×. No pane exceeds **60.03° × 54.54°**, against
  the single 134.2° Atlantic strip that opened this arc's last round. I looked at the
  screenshot: it is a map of France above a map of the United States. That is the product
  outcome ROADMAP I-8i promises, delivered.
- **The Europe 2026 fixture — the library Jacob actually has.** Three panes, `viewBox` strings
  byte-identical to I-8d's, I-8g's and I-8h's, `codes` `[AT CZ DE GB HR HU] · [US] · [US]`,
  `home` the same minus the third, weights **6 · 1 · 0** summing to `W = 7`. I rendered it and
  looked: GB, DE, CZ, AT, HU and HR are individually legible and individually tappable, the US
  is a full-width map below it, and Alaska/Hawaii sit last under **DISTANT PARTS OF US**. **No
  regression.**
- **The claim that protects a completely different, already-shipped surface holds.**
  `git diff 027a7a9 10455b9 -- cairn/packages/core/src/derive/cluster.ts` is **empty, 0 lines**.
  The day map cannot have moved, and `npm run golden && npm run sample && git status
  --porcelain` regenerates **byte-identically** — I ran it, the tree stayed clean, sample source
  sha still `40955ca0b182`.
- **The boundaries hold.** Export surface **79** by `Object.keys` on the built namespace.
  `package.json`/`package-lock.json` diff **0 lines** — no dependency was added, which is the
  ruling A-53 Part 6 makes explicitly and the one `cairn-constraints` §2 reserves to Jacob.
  Inside `packages/core/src` only `derive/country.ts` moved, **14 insertions / 7 deletions**,
  and the executable part of it is three lines. The root read-only boundary is intact:
  `git diff -- europe-2026-itinerary.html docs/ tickets/` empty, `md5sum` still
  `7c69df3208ef91c8be0fb59a56443188`.
- **Nothing sensitive moved.** Over the whole `packages/` + `apps/` diff, **0** added lines
  match `console.|fetch(|XMLHttpRequest|sendBeacon|navigator.|localStorage|sessionStorage|
  geolocation|watchPosition|EXIF|Date.now|Math.random|crypto.`. No mailbox path, no friend's
  location, no coordinate: the increment is pure geometry over the **bundled** country index,
  and the two new DOM attributes (`data-pane-kind`, `data-pane-weight`) are a `.length` check
  and a trip count.
- **The reported state is true.** `npm run typecheck` clean on both projects. `npm run test:tap`
  **1121 pass / 0 fail / 0 skipped**. `bash qa/i8i-faults.sh` **16 of 16 RED**, zero green.
  `node qa/i8i-render.mjs` **ALL CLEAR, 121 `ok` lines** — I counted them. `node qa/r39-a51.mjs`
  **12 FAIL**, `node qa/r39-render.mjs` **7 FAIL**, both exactly the counts `qa/README.md`
  publishes for them, and every FAIL maps onto a filed R39-n rather than onto a regression.

**Why this is not a SEND BACK, stated rather than assumed.** MGR-1 is real and it is new, but it
is a **layout** defect with no correctness, data or privacy consequence: every pane is at full
size, every country is drawn, nothing is hidden, and the phone — the reference viewport every
A-51 criterion is written at — is **0.3 % empty**. Sending a seven-round arc back for a CSS
consequence of one ruled clause, when the arc's actual defect is fixed and measured, would
manufacture a round rather than close one. It is routed as a **MAJOR that gates I-8b**, which is
the same shape the I-8a verdict used and is enough.

---

## MGR-1 — the measurement nobody in this arc took: the grid row, not the cell

**MAJOR. Architect. Gates I-8b.** `apps/web/src/styles.css` — A-51 **G7**.

A-51 G7 makes `.worldmap__panes` `display: grid; grid-template-columns: repeat(auto-fill,
minmax(var(--pane-min, 300px), 1fr)); align-items: start`, and gives every cell one
`--pane-cap: min(38vh, 300px)`. `align-items: start` was chosen deliberately, to fix R38-3: *"a
flex row stretches every cell to its tallest sibling … `align-items: start` on a grid does not
stretch."* It works — no cell letterboxes, which is what R38-3 asked for.

**What it also does, which no criterion in the arc can see:** a grid *row* is still as tall as
its tallest cell. A pane's height is `--pane-cap ÷ aspect`, so a wide home pane (the US, 2.26
aspect → 170 px) and a tall extent pane (Alaska, 0.80 aspect → 331 px) land in the same row, and
the difference becomes card background. R38-3's fix moved the criterion from the `<svg>` to the
**cell**; the defect moved one level further out, to the **row**. That is the same *"one clause
further out"* pattern Part 1 of A-51 diagnoses, arriving one more time.

Measured by me, `.worldmap__panes` container area minus the summed area of its cells:

| library | 390 px | 640 px | 960 px | 1440 px |
|---|---|---|---|---|
| **Europe 2026 fixture** | 0.3 % | **34.7 %** | **30.1 %** | **29.0 %** |
| **`FR`+`US`** | — | — | — | **45.6 %** |
| **worldwide 12** | — | — | — | **23.5 %** |

And at `027a7a9` — I built the pre-increment tree in a worktree, served it on port 4174 and ran
the identical script against it — the same fixture is **0 % at all eleven widths I swept**
(390 · 560 · 640 · 768 · 820 · 900 · 960 · 1024 · 1280 · 1440 · 1600). So it is unambiguously
**new at I-8i**, not a pre-existing residue.

It reads, on screen, as a large grey block where a map failed to load. On `FR`+`US` at 1440 px
the entire second half of the second grid row — two of three columns — is empty. This is a
presentation-honesty problem of the kind the original visual direction names (*"no placeholder
UI, presentation stays honest"*): nothing is false, but the surface looks broken.

**Why the architect and not the builder.** `align-items: start` is a ruled clause with a stated
reason, and the three obvious repairs each trade against something A-50 or A-51 already ruled —
stretching the cell brings R38-3's letterbox back unless the cell's background stops being the
card's; a masonry/dense flow changes reading order and therefore I18's on-screen meaning; a
per-row cap is a per-screen-size rule that A-41 Part 7 forbids for the *frame* and would need
its layout/frame boundary stated. Picking one is a design decision, not a patch.

---

## MGR-2 — I-8f was never built, and three increments shipped past its dependency

**MAJOR. Builder + breaker. Gates I-8b.**

`ROADMAP.md` §I-8f (revision 32) is a complete increment: five named files, a stated
user-visible outcome (*"Tapping a trip that will not open now leaves you looking at a card that
says so and offers to save the copy"*), and `ARCHITECTURE.md` §2.9 **A-47** behind it. It
answers QA **R35-1** plus R35-4 and R35-5. Its own entry says **"Builder + breaker,
mandatory."**

It does not exist. Greps over `packages/` and `apps/`:

- `openFailures` — **0 matches**
- `rowUnopenable` — **0 matches**
- `noteOpenFailure` — **0 matches**
- `cli.ts:68` still reads `function todayIsValid() { try { core.weekdayOf(today); … } }`, the
  pre-A-47 form, with the comment block A-47 Part 6 was to delete still above it
- `docs/BUILD-NOTES.md` — **0 matches for `I-8f`**

Meanwhile ROADMAP revision 33 sequences I-8g *"after I-8f"*, I-8g's dependency line reads *"I-8d
(shipped) and I-8f"*, and `CAIRN_VISUAL_ROADMAP.md` has repeated *"I-8b still waits on I-8f"* in
five separate blocks while I-8g, I-8h and I-8i were built and attacked. **Nothing hid this** —
the visual roadmap has said `I-8f is designed ✅ · built ❌` since revision 32 and still does, so
this is an honest board with a skipped step, not a false claim. But no gate ran between I-8a and
this one, so nobody stopped and asked. That is exactly the failure a phase gate exists to catch,
and it is being caught two increments late.

**This is not an architect item.** A-47 is ruled, I-8f's *Built* bullets are written, and no
design question is open. It is a builder pass that was skipped.

---

## Routing — I-8i

**Ten items. None blocks this verdict. Three block I-8b, and that is a hard gate.** Round 39
proposed routing for its seven; I confirm five as filed, sharpen two, and add three of my own.

| id | severity | agent | gates I-8b | one line |
|---|---|---|---|---|
| **MGR-1** | MAJOR | architect | **yes** | A-51 G7's grid leaves 29–46 % of the map card empty at ≥ 640 px; 0 % before I-8i |
| **MGR-2** | MAJOR | builder + breaker | **yes** | I-8f (A-47, R35-1) was never built; three increments shipped past its declared dependency |
| **R39-1** | MINOR | architect | **yes** | A-52's filter removal makes `worldMapFrame` able to violate A-40 clause 3; safe only by an unwritten precondition in `tools/gen-countries.mjs` |
| **R39-2** | MINOR | architect (+ 1-line builder) | no | A-52's *"[] iff no ring at all"* is false with the sign flipped; the disagreement moved instead of closing, and I12 breaks on an index A-52 now admits |
| **R39-3** | MINOR | architect | no | A-51 G6's *"greedy worst case 14"* is at least 18; residue 7's ~4,200 px becomes ~5,400 px; A-53 Part 5's *"the 14-pane ceiling contains zero extent panes"* fails at the real ceiling |
| **R39-4** | MINOR | architect + builder | no | ROADMAP I-8i's set-equality criterion counts libraries where it says panes and is unsatisfiable as written; BUILD-NOTES' correction is arithmetic on the wrong base |
| **R39-5** | MINOR | architect (+ builder test) | no | G5's third key is ISO-alphabetical one indirection out; G5's *"there is no tie left for the alphabet to break"* and L5's proof obligation are both wrong as written |
| **R39-6** | MINOR | builder | no | `WorldMap.tsx:182` — the extent pane's `aria-label` says *", shown in a separate frame"*; its visible caption does not |
| **R39-7** | MINOR | architect | no | L3's stated exception does not cover the case that fails it: a single-country `FJ` library renders Fiji at **342.2 × 2.2 px = 753 px²** |
| **MGR-3/4** | MINOR | builder | no | two BUILD-NOTES figures that do not re-derive (see below) |

### architect — one pass, and it is a small one

- **MGR-1 — rule how a grid row is sized when its cells have unequal aspect-derived heights.**
  Evidence and numbers above and in **Verified** rows 14–16. The clause to move is A-51 **G7**'s
  `align-items: start`, or the cell's background, or both; A-50's `<svg>` rule is not in
  question and should stay verbatim. **The criterion has to become the *row* or the container**
  — `container.height × container.width − Σ cell area ≤ ε` over the library set A-50 already
  uses, at 390 · 640 · 960 · 1440 — because *"the cell is not letterboxed"* is now a criterion
  that passes while the surface has a hole in it, which is precisely what R38-3 said about the
  `<svg>` criterion one round ago. **Trigger: I-8b does not ship until this is ruled and built.**
- **R39-1 — decide whether A-40 clause 3 is an invariant of the frame or a property of the
  generator, and write it down either way.** I reproduced it: an index entry whose only ring is
  `[]` or `[7]` yields `viewBox: "NaN NaN NaN NaN"`, `aspect: NaN`, `d: ""`, `missing: []` — a
  blank map, no error, nothing stated. Under I-8h the same input went to `missing` and was
  stated in words. **My own reading, which differs from round 39's framing:** *"unreachable by
  construction"* is accurate — `tools/gen-countries.mjs:426` drops every ring under three
  distinct points at the mint and `countries.gen.ts` has no other producer — so **MINOR is the
  right severity and it does not block**. But it is **not a documentation item**, and it must
  not be filed as one: `countryParts` is a public core export taking an injected index, its
  safety now depends on a filter in a different module that nowhere says it is load-bearing, and
  A-52's stated justification (*"a degenerate ring … contributes its own points to its part's
  `box`"*) is **false for a ring with no points**. A-52 bought byte-neutrality on the shipped
  artefact and paid for it with a silent total failure on any other index. Rule one of: restore
  a guard inside `countryParts`; or make `worldMapFrame`'s `missing` test total on a non-finite
  `box`; or state the generator's filter as `countryParts`' precondition with a test that fails
  if the generator loses it. **Trigger: I-8b does not ship until this is ruled** — I-8b puts a
  second surface on the same `travelStats`/index pair, and *"the map is blank and says nothing"*
  is not a failure mode to widen.
- **R39-2 — the *"iff"* in A-52 clause 1.** Measured: an entry with a finite `box` and
  `rings: []` gives `countryParts → []` but `countryKeyPoint → {lat: 5, lng: 5}`; and because
  `countryKeyPoint:184` **still carries** the `ring.length < 6` filter A-52 removed from
  `countryParts`, a 2-point ring makes the principal part's key `{5.5, 5.5}` while
  `countryKeyPoint` answers `{0, 0}` — **I12 broken on an index A-52 itself now admits**. Fix
  the ruling, then the docstring. Rule with R39-1; they are one question.
- **R39-3 — the published ceiling.** I did not re-run the 60,000-iteration search, so this is
  round 39's number and I say so; what I did confirm is that `qa/r39-a51.mjs` §G reports it and
  that A-51 G6 and A-53 Part 5 both state 14 as a maximum rather than as a found value. Correct
  G6, residue 7's px estimate, and A-53 Part 5's *"zero extent panes at the ceiling"* bullet.
- **R39-4 — ROADMAP I-8i's third criterion is unsatisfiable as written.** I ran the recount:
  **1,236** panes wider than 120° by unpadded bounds (1,237 padded), of which **1,187** contain
  one of `AQ FJ KI RU UM` and **49** do not; **1,229** is the count of *libraries* holding at
  least one such pane. Rewrite the criterion so the base is stated and the three-way
  decomposition (48 trans-antimeridian pairs + one honest `CA`+`GL` at 128.8°) is what is
  asserted, since that is what is true.
- **R39-5 — and this one deserves a decision, not only a wording fix.** My own reading:
  **round 39 graded it correctly at MINOR, and the reason is sharper than *"reading order is
  harmless."*** I re-ran the order-destroying relabel: over 23 libraries the **pane set, every
  `viewBox`, every `codes`/`home` membership and every `weight` come back identical** — so
  A-51/A-53's actual design principle, *geometry is code-blind*, **holds**. What moves is
  presentation order, in 8 of 23. So the principle is intact and two things around it are not:
  (a) G5's sentence *"unlike C6 there is no tie left for the alphabet to break"* is false —
  **22,765 of 22,877 (99.5 %)** two-country libraries with ≥ 2 panes have an adjacent pair
  separated by that key alone, and C6's objection was renamed rather than answered; (b) L5's
  stated proof obligation (*"permuting every ISO code leaves every pane byte-identical"*) is
  **stronger than what holds**, so a test written to it either fails or — as both round 38's and
  I-8i's do — quietly uses an order-**preserving** relabel and proves less than it reads.
  Correct both sentences, and rule explicitly whether an equal-weight, equal-`home.length` tie
  should be broken by a geometric key (westmost part, greatest area) or whether the canonical
  position is accepted **with the alphabet named in the open**. Either answer is fine; leaving
  G5 claiming there is no tie is not.
- **R39-7 — L3's exception clause.** I reproduced it in the DOM: a single-country `FJ` library
  renders an `<svg>` of **356 × 16 css px** with Fiji at **342.2 × 2.2 px = 753 px²** — smaller
  than the 783 px² and 899 px² rounds 37 and 38 filed as MAJOR, in a library with no cluster and
  no micro-state, i.e. outside the one exception L3 names. Not a regression (round 39 confirmed
  the `viewBox` byte-identical at `027a7a9`; A-51 residue 3 owns it). Widen L3's exception to
  name residue 3, and carry the pixel number so the next round does not re-derive it.
- **MGR-4 (architect half) — A-51's parenthetical says `derive/cluster.ts` *"gets a zero-line
  diff for the third increment running."*** The invariant is true and I verified it; the count is
  not. `cluster.ts` last changed at **I-8g / `53cdcc1`**, so I-8h and I-8i are the only two
  consecutive zero-diff increments. One word.

### builder

- **MGR-2 — build I-8f as ROADMAP §I-8f and §2.9 A-47 specify**, then hand it to the breaker,
  which that increment's own entry already requires. Do not re-scope it and do not fold it into
  another increment: it changes who can reach an export surface, which is `cairn/CLAUDE.md`'s
  mandatory-breaker trigger. **Trigger: I-8b does not ship until this is built and attacked.**
- **R39-6 — `apps/web/src/views/WorldMap.tsx:182`.** The extent branch reads
  `` `Distant parts of ${pane.codes.join(', ')}, shown in a separate frame` ``. A-51 G8 says a
  pane with `home.length === 0` *"may **never** say 'shown separately'"* and that *"`aria-label`
  follows the same two branches"*; the visible caption is `DISTANT PARTS OF FR` and nothing
  more. Make the label carry the same claim and no larger one. **Add the parity assertion**, not
  only the string — `qa/i8i-render.mjs` §C greps the caption for the literal *"shown
  separately"* and passes, which is why this survived I-8d, I-8h and I-8i. Repro:
  `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r39-render.mjs` §C, and
  `node qa/r39-a51.mjs` §M.
- **R39-2's docstring half — `packages/core/src/derive/country.ts:248`.** The shipped docstring
  repeats A-52's false *"iff"* verbatim (*"`[]` iff the index carries no ring at all for the
  code … the same one `countryKeyPoint`'s `null` has"*). One line, **after** the architect rules
  R39-1/R39-2, not before.
- **R39-5's test half — `packages/client/test/world-map.test.ts`.** Replace the
  order-**preserving** ISO relabel (`CODES[i] → Q000+i`) with an order-**destroying** one, and
  assert what actually holds: the pane set, every `viewBox`, every `codes`/`home` and every
  `weight` are invariant; pane *order* is not asserted invariant. This is independently correct
  and does **not** wait on the architect.
- **R39-4's BUILD-NOTES half.** *"measured, **1,180** do"* is `1,229 − 49`, arithmetic on the
  library count. The pane figures are 1,187 of 1,236.
- **MGR-3 — BUILD-NOTES' own scope line for I-8i is wrong twice.** It says *"Scope: **20 files
  changed, 2 added**"*; `git show --stat 10455b9` is **22 changed, 2 added, 24 total**. Its
  enumerated *Changed:* list omits `docs/CAIRN_VISUAL_ROADMAP.md` and
  `docs/CAIRN_VISUAL_ROADMAP.html`, which the same commit changed (41 and 45 lines) and which
  I-8h's entry does list. Round 39 published the correct 24/22/2 and did not flag the mismatch.
- **MGR-4 — BUILD-NOTES says `cluster.ts` has a zero-line diff *"for the fourth increment
  running."*** The zero-line diff across I-8i is real and I verified it; the count is not.
  `cluster.ts` last moved at I-8g / `53cdcc1` (57 insertions / 14 deletions), so I-8i is the
  **second** consecutive zero-diff increment. Same correction as the architect's half above.

### breaker

- **MGR-1 — the class, not the instance.** Round 39 is the strongest adversarial pass in this
  arc and I am **not** routing it a re-run. One gap: §A measured *"every pane cell is in the
  document, has a non-zero box, does not overlap a sibling"* and §D measured *"no cell
  letterboxes vertically"* at 21 widths — both are cell-scoped, and both pass on a container
  that is 46 % empty. **Add a container-occupancy assertion to the render probe set**
  (`Σ cell area ÷ container area`, over the standard library set, at the widths §D already
  sweeps) so a layout hole cannot pass a cell-shaped criterion again. That assertion is what
  would have caught this at round 39 and it is three lines.
- **Verify MGR-2's I-8f build when the builder lands it** — mandatory per ROADMAP §I-8f, not at
  my discretion.
- **Everything else in round 39 stands.** I re-ran `qa/r39-a51.mjs` (12 FAIL) and
  `qa/r39-render.mjs` (7 FAIL) and every FAIL is a filed finding with a section reference; there
  is no unreproduced finding and no attack list that missed a sensitive path — the privacy,
  redaction, constraint and root-boundary greps are all present and all clean on my own run.

---

## My own reading of round 39's seven MINORs — do any of them deserve MAJOR?

Jacob asked specifically about R39-1 and R39-5. Both times my answer is **no, MINOR is right**,
and both times the reason matters more than the grade.

**R39-1 — is *"unreachable by construction"* enough for something Jacob's family will use?**
For *severity*, yes, and I checked the construction rather than accepting the phrase.
`COUNTRY_INDEX` is `packages/core/src/geo/countries.gen.ts`, a committed artefact with exactly
one producer, `tools/gen-countries.mjs`, whose line 426 reads `if (flat.length < 6) { dropped++;
continue; }` under the comment *"A ring needs three distinct points to enclose anything."* There
is no user input path into the index, no runtime index construction, and no second producer. So
the user-facing probability today is **zero**, not *small* — which is the difference between
MINOR and MAJOR in this project's grading, and round 39 graded it correctly.

For *routing*, no — and this is where I override round 39's own framing rather than its grade.
It filed all five architect items together as *"documentation/ruling accuracy."* R39-1 is not
that. It is a **cross-module precondition that nothing states**: a public core export's safety
now rests on a filter in a build tool, and the failure it prevents is a total silent failure of
the surface (`viewBox: "NaN NaN NaN NaN"`, `missing: []`, blank map, no error) rather than a
degraded one. A-52 traded a *stated, safe* degradation for an *unstated, catastrophic* one and
bought byte-neutrality with it. **It must be ruled before I-8b, not deferred to whenever the
architect next opens §4.4** — that is the escalation, and it is the only one I am making on the
seven.

**R39-5 — is the alphabet tie-break cosmetic, or does it undermine A-51/A-53's design
principle?** Cosmetic — but only because I measured which half moves. The principle A-51 L5 and
A-53 defend is *"nothing reads which country a code is to decide geometry."* Under an
order-destroying relabel (`FR → MC`, `US → BD`, not round 38's order-preserving `Q000…Q238`) the
**partition, every `viewBox`, every membership and every `weight` are byte-identical** across 23
libraries. Geometry is genuinely code-blind. What moves is the sequence of equal-weight,
equal-size panes, in 8 of 23. C6's original objection was that the alphabet decided which
country got **framed as main and shrunk to an inset** — i.e. it decided size. Under A-51 it
decides reading order among panes that are the same size by construction. That is a
categorically smaller thing, and A-51 Part 6's *"reading order is the harmless half"* is
defensible.

So the design principle is not undermined. **Two sentences are false, and one test is weaker
than it reads**, which is why it routes as it does. If the architect wants a geometric tie-break
that is a legitimate improvement; what is not acceptable is G5 continuing to assert *"there is
no tie left for the alphabet to break"* while 99.5 % of two-pane libraries have exactly that
tie.

**The other five.** R39-3, R39-4 and R39-7 are measurement corrections to published numbers, in
documents, with no code consequence — MINOR is generous if anything. R39-2 is a false clause in
a ruling plus its copy in a docstring; it is one question with R39-1 and should be ruled beside
it. **R39-6 is the only one of the seven that is a defect in shipped code**, it is one string,
and MINOR is right: *"shown in a separate frame"* is a statement about layout, not about travel,
so no screen-reader user is being told Jacob went to Cayenne. The rule it violates says
*"verbatim and unchanged"* and it is not verbatim; that is the whole of it.

**None of the seven invalidates the shipped contract.** I confirm round 39 on that.

---

## Is the atlas-frame track closed? Partly, and I am saying which part

**Closed, and marked shippable as a track: the frame's *geometry*.** A-41 → A-48 → A-49 → A-51
G1–G6/G8, A-52, A-53 and invariants I1–I18. R38-2, R38-3, R38-4 and R38-5 are fixed; I17 — the
invariant that needed a *pair* of libraries and is the reason three adversarial rounds could not
see the original defect — holds on the exact case that defined it (adding `US` to an `FR`
library moves France's pane by zero bytes; I re-derived that myself). The model is right, the
implementation matches the ruling clause for clause, and there is no reason to expect an
eighth round on *which rectangle a country is drawn in*.

**Not closed: A-51 G7, the layout clause.** MGR-1 is open, it is new at this increment, and it
is on the same surface. The track closes when G7 is ruled and built.

`CAIRN_VISUAL_ROADMAP.md` and its `.html` twin are updated in this pass to say exactly that.

---

## Pipeline hygiene, checked because this is a phase-relevant gate

- **`CAIRN_VISUAL_ROADMAP.md` + `.html` twin — honestly synced, and honest about what is open.**
  Both carry the same newest block (*"THE NEW MAP FRAME HAS BEEN ATTACKED AND IT HELD"*), both
  say `I-8i is designed ✅ · built ✅ · verified ✅ · shippable — the manager's call`, which was
  the correct state until this file. Neither overclaims: both still carry `I-8f is designed ✅ ·
  built ❌` and *"I-8b still waits on I-8f"*, which is what let me confirm MGR-2 rather than
  discover a contradiction. Both are updated by this verdict.
- **`BUILD-NOTES.md`'s status note — accurate on every technical claim I checked, wrong on two
  bookkeeping figures.** MGR-3 (file count and the omitted roadmap files) and MGR-4 (the
  zero-diff increment count). Everything else in it — 1121/1097, 16/16 red, 121 ok, surface 79,
  0 dependency lines, byte-identical goldens, the three reference `viewBox` strings — re-derived
  exactly on my runs.
- **`qa/README.md` — indexes round 39's probes correctly.** Both `r39-a51.mjs` and
  `r39-render.mjs` are listed with their run commands, their section maps, and the expected
  **12 FAIL / 7 FAIL** at `10455b9`. I got 12 and 7.
- **`QA-FINDINGS.md`'s status note** names the commit range, the four product files and all
  seven findings with `file:line` and a repro command each. Every repro I tried reproduced.

---

## Verified — I-8i: what I ran, and what happened

All from `/home/user/europe-2026-planner`, `master` @ `6ee6bf5` (product commit `10455b9`),
Node v22.22.2, Chromium via `/opt/node22/lib/node_modules/playwright` with
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`. `git status --porcelain` **empty** before and
after; the one worktree I created at `027a7a9` for row 16 was removed and `git worktree list`
shows only the main tree.

| # | Command | Result |
|---|---|---|
| 1 | `npm run typecheck` | exit **0**, both projects; `pretypecheck` regenerated the redacted sample (`16 days, 112 stops, 31 pool, 95 places, 120 import issues, source 40955ca0b182, REDACTED per §6.6`) |
| 2 | `npm run test:tap` | `# tests 1121 · # pass 1121 · # fail 0 · # skipped 0`, 18.1 s. **BUILD-NOTES' and round 39's 1121 are both accurate** |
| 3 | `npm run golden && npm run sample && git status --porcelain` | tree **clean**; sha `40955ca0b182…`. Byte-identical regeneration — the day map and every core golden are unmoved |
| 4 | `git diff 027a7a9 HEAD -- cairn/packages/core/src/derive/cluster.ts \| wc -l` | **0**. The invariant that protects the already-shipped day map holds. `git log 6b89c91..HEAD -- …/cluster.ts` shows its last change was **I-8g / `53cdcc1`**, which is MGR-4 |
| 5 | `Object.keys(core).length` on the built namespace | **79** |
| 6 | `git diff 027a7a9 HEAD -- cairn/package.json cairn/package-lock.json \| wc -l` | **0**. No dependency added — A-53 Part 6's ruling holds in the artefact |
| 7 | `git diff --stat 027a7a9 HEAD -- cairn/packages/core/src/` | `derive/country.ts` only, **14 insertions / 7 deletions**; the executable change is the three lines removing `if (ring.length >= 6)` |
| 8 | `git show --stat 10455b9` | **24 files, 22 changed + 2 added**, 2717 insertions / 633 deletions. Round 39's figure; **BUILD-NOTES says 20 + 2** — MGR-3 |
| 9 | `bash qa/i8i-faults.sh` | `ALL FAULTS RED`; **16** `RED (expected)` lines, **0** green. I grepped for green/NOT RED/WARN and got nothing |
| 10 | `node qa/r39-a51.mjs` | **12 FAIL**, matching `qa/README.md`. §A reproduces R39-1 (`viewBox: "NaN NaN NaN NaN"`, `missing: []`) and R39-2 (`countryParts []` vs `countryKeyPoint {5,5}`; I12 `{5.5,5.5}` vs `{0,0}`). §B: my-implementation-vs-shipped identical on **24 libraries**. §J: 1236 panes / 1187 with the five / 49 without. §L: 99.5 % and the 8-of-23 reorder. §M: constraint greps all clean |
| 11 | `PLAYWRIGHT_BROWSERS_PATH=… node qa/i8i-render.mjs` | `ALL CLEAR`; **121** `ok` lines, counted with `grep -c` |
| 12 | `PLAYWRIGHT_BROWSERS_PATH=… node qa/r39-render.mjs` | **7 FAIL**, matching `qa/README.md`; all seven are R39-6 (aria parity) and R39-7 (`FJ` 356 × 16, Fiji 342.2 × 2.2) |
| 13 | **my own script**, not any `qa/` probe: load the app, drive IndexedDB to an `FR`+`US` library, screenshot and read every pane | 4 panes; order `FR(home,1) · US(home,1) · FR(extent,0) · US(extent,0)`; **France 342.3 × 236.3**, **Guiana 223.3 × 288.4**; every pane `display:block / visible / opacity 1`; viewBoxes `-4.8753 -51.4315 14.7184 10.3346`, `-125.8416 -50.5435 60.0314 26.618`, `-54.5989 -5.8306 3.0151 3.8512`, `-172.8399 -72.4066 43.9088 54.5393`. **I looked at the PNG.** It is a map of France, then a map of the USA, then two captioned territory frames |
| 14 | same script, Europe 2026 fixture at 390 × 820 and 1440 × 900 | 3 panes; the three `viewBox` strings **byte-identical** to I-8d/I-8g/I-8h; weights 6 · 1 · 0; smallest home subject **CZ 74.7 × 29.0 px** at 390. **I looked at the PNG**: GB, DE, CZ, AT, HU, HR individually legible. **No regression** |
| 15 | **my own measurement**: `container area − Σ cell area` on `.worldmap__panes`, 4 libraries × 4 viewports | Europe 2026 **0.3 % / 34.7 % / 30.1 % / 29.0 %** at 390 / 640 / 960 / 1440; `FR`+`US` **45.6 %** at 1440; worldwide-12 **23.5 %**. `display: grid`, `align-items: start` — **MGR-1** |
| 16 | **the control for MGR-1**: `git worktree add … 027a7a9`, `npm run web:build`, `PORT=4174 node tools/serve.mjs`, identical script against it | **0 % at all eleven widths swept** (390 → 1600); `display: flex`, `align-items: normal`. **MGR-1 is new at I-8i** |
| 17 | `grep -rn "openFailures\|rowUnopenable\|noteOpenFailure" packages/ apps/` | **0 matches each**; `cli.ts:68` still the pre-A-47 `todayIsValid`; `grep I-8f docs/BUILD-NOTES.md` **0**. **MGR-2** |
| 18 | privacy sweep over the added lines of the whole `packages/` + `apps/` diff | **0** matches for `console.\|fetch(\|XMLHttpRequest\|sendBeacon\|navigator.\|localStorage\|sessionStorage\|geolocation\|watchPosition\|EXIF\|Date.now\|Math.random\|crypto.` |
| 19 | root boundary, from the repo root | `git diff 027a7a9 HEAD -- europe-2026-itinerary.html docs/ tickets/` **empty**; `md5sum europe-2026-itinerary.html` = **`7c69df3208ef91c8be0fb59a56443188`**, unmoved since round 33 |
| 20 | `sed -n '415,435p' tools/gen-countries.mjs` | `if (flat.length < 6) { dropped++; continue; }` at **:426**, under *"A ring needs three distinct points to enclose anything."* R39-1's *"unreachable by construction"* is accurate, and `packages/core/src/index.ts:99` confirms `COUNTRY_INDEX` has exactly one producer |
| 21 | `grep -n r39 qa/README.md` | both probes indexed, with commands, section maps and the expected **12 FAIL / 7 FAIL** at `10455b9` |

**What I did not do.** No real phone — Chromium viewports only, the same gap the builder and the
breaker both disclosed. I did not re-run round 39's 60,000-iteration greedy search (R39-3 is its
number, attributed). I did not re-run the full 28,441-pair censuses independently of
`qa/r39-a51.mjs`; I ran that probe, which computes them from its own primitives, and checked its
outputs against A-51 Part 5 rather than re-implementing a third time. I did not attack
`apps/mobile`, ingestion or location — I-8i touches none of them.

---

## For Jacob — I-8i

**Ship it. The map problem you reopened is fixed, and I checked it with my own eyes rather than
taking the tester's word.**

You asked, four rounds ago, why a trip to France and a trip to America drew France 36 pixels
wide in a strip of empty Atlantic. It now draws a map of France, then a map of the United
States, then two smaller frames for French Guiana and Alaska labelled *"distant parts of"*.
France is **342 × 236 pixels** — about ninety times the area it had. I loaded it in a browser
and looked at the picture before I read anybody's numbers.

**Your Europe 2026 map has not changed at all** — same three panels, same frames to the byte,
and Britain, Germany, Czechia, Austria, Hungary and Croatia are each clearly visible and
tappable. That was the thing most at risk in a rewrite this size and it is intact.

**The question you put to the architect before approving this — whether calling every panel
"equal" quietly promotes a territory into a place you went — was answered correctly and I
verified the answer.** Alaska and French Guiana get a panel each so they are visible, but they
carry a weight of **zero**, they are captioned *"distant parts of"*, and they always come after
the places you actually went. I confirmed that in the rendered page, not just in the data.

**Three things need you to know about them, one of which needs a decision.**

1. **A new cosmetic problem, which I found and nobody else did.** On a laptop or tablet — not on
   a phone — the map card now has large empty grey areas: about **a third** of it on your Europe
   2026 map and **nearly half** on the France + America one. It happens because the panels sit in
   a grid and are no longer stretched to match each other, which was the fix for a different
   problem last round. Nothing is missing or wrong; it just looks like something failed to load.
   On your phone it is fine. **I am shipping the increment and routing this to the architect as
   the next thing to fix; it is a CSS-shaped decision, not a rebuild.**
2. **An increment was skipped and nobody noticed.** Back at the end of August we scheduled
   **I-8f** — the fix that makes a trip which won't open *say so on its card and offer to save a
   copy*, instead of showing a healthy-looking card whose only button is Delete. It was fully
   designed and it was never built, and three later increments were built past it. It is queued
   now and it has to land before the Profile screen. **Nothing was hidden from you** — the status
   board has said "designed ✅ · built ❌" the whole time — but no gate ran between then and now to
   stop and ask, which is my process failing rather than anyone's work.
3. **The decision I need from you.** The tester found that the panel order, when two places tie,
   is still decided alphabetically — France before the United States because F comes before U.
   The *shapes and sizes* are completely independent of country names (I checked this by renaming
   every country in the data and re-running: identical maps). It is only the reading order. Two
   options: **(a)** accept it and say so plainly in the design doc, or **(b)** break the tie by
   something geographic instead — westmost first, say, or largest first. (a) is free; (b) is a
   small change and arguably more honest to the "nothing about this map reads a country's name"
   principle you have been holding us to. **Which would you prefer?**

**What I am marking closed:** the framing question itself. Seven rounds, four architect
rulings, and this is the first one where the tester rebuilt the whole calculation independently
and got the identical answer on 24 different travel histories — and where I could not find a
counterexample either. **What I am leaving open:** the layout around it (item 1), and I-8f
(item 2). Both gate the Profile screen, which is the next thing.

---

# I-8a — the tab shell, the world map, and the token layer

> **Status: CLOSED, kept for the record.** Superseded as the current verdict by **I-8i** above;
> nothing in it is retracted. Manager, stage 4. Reviewed `master` @ `6b89c91` (QA round 33's record
> landed alongside at `e15c80d`), 2026-08-31, Node v22.22.2, Chromium via the system
> Playwright at `/opt/node22/lib/node_modules/playwright`. **Verdict: SHIP. I-8a is closed;
> I-8b may open, and four of the seven routed items gate it.**
> Scope was I-8a and nothing else. **2b does not ship here** — ROADMAP says so and this verdict
> does not move it. Every claim below has a command in **Verified — I-8a** that I ran myself,
> on this tree.
>
> **Unlike the 2a review, Playwright is available in this environment**, so the browser half
> of the board is my own evidence rather than a prior round's. I drove the shipped Europe 2026
> sample through the real UI, looked at the rendered map, and measured it before reading
> anyone's numbers for it.
>
> **The breaker's advisory lean was SEND BACK and I am overruling it, with reasons rather than
> a preference** — see *Why this is not a SEND BACK*, and *Where I disagree with round 33*,
> below. Its four MAJORs are all real; I reproduced every one. What I do not accept is its
> stated ground for blocking.

---

## Verdict: **SHIP**

**Every deliverable I-8a names is built, none is a stub, and the increment's written ship gate
is met.** I re-derived the gate clause by clause rather than reading the harness's exit code —
which matters here, because the harness's exit code is partly meaningless and I had to
establish the substance by hand.

Concretely, on my own runs:

- **`worldMapFrame`** — pure, zero-dependency, `node --test`-able, never throws for a code the
  index cannot fill, not memoised, does not mutate `stats` or the index, row order verbatim.
  18/18 in `packages/client/test/world-map.test.ts`, and I ran the frame myself against the
  real sample rather than a fixture.
- **`WorldMap.tsx` under A-40 Part 4** — W1's greppable ceiling is clean on my own grep, over a
  set **wider** than the ruling names (10 identifiers, comments included): 0 hits. W2 holds —
  the handler is on the `<path>` and there is no coordinate arithmetic in the file at all.
- **CLAUDE.md's first map bug is genuinely absent, measured on my own oracle.** Booting on
  Trips, the Map panel is mounted inside a container that computes `display: none` with
  `getBoundingClientRect().width === 0`, and its `viewBox` attribute is already
  `-171.7911 -71.3578 194.5016 52.4416`. After the tab switch it is the **same string, byte for
  byte**, and it is also the string `worldMapFrame` returns in bare Node from the same rows.
  Three independent readings, one string. That is the strongest single result in this
  increment and it is the one A-40 was written to produce.
- **The tab shell** — `TABS` ids are exactly `['trips','map']`, every id has a `render`, no
  fourth slot, `Profile.tsx` does not exist and no Profile tab is stubbed. The *"no DISCOVER"*
  ceiling is comment-stripped before it greps, so it is an honest ceiling and not one that
  passes by accident.
- **The signal-collision fix** — `opacity: .72` is gone from the stylesheet; no provenance,
  provisional or unresolved-severity selector sets `opacity` anywhere in the shipped CSS; the
  blocker's colour and the product of every ancestor `opacity` are identical on an `imported`
  row and an `own` row. This was a real design defect and it is really fixed.
- **The read-only boundary and §6.6 hold.** Root diff empty, `md5sum` unchanged at
  `7c69df3208ef91c8be0fb59a56443188`, `packages/core` byte-untouched, `ports/map.ts`
  byte-identical, export surface still **75**, `r2-redact` **0 KNOWN_LEAKS**, and the only
  match for `fonts.googleapis|gstatic|cdn.` anywhere in `apps/web` is a comment saying the app
  does not use one.

### The one thing I re-derived from scratch, because it decides the verdict: R33-1

I did not take the pixel measurements on faith. I loaded the shipped sample through the real
*"Load Europe 2026"* button, switched to Map, screenshotted the figure and **looked at it**.

The stored row is `["AT","CZ","DE","GB","HR","HU","US"]`. In a 958 × 418 px figure the rendered
country boxes are **US 516.3 · GB 45.6 · DE 44.5 · AT 36.9 · CZ 32.6 · HU 32.1 · HR 28.2** css
px, and the six European countries the trip is actually about occupy **149.2 px of 958**,
against the right edge. Looking at the picture rather than the numbers: it is a map of the
United States with a legible United Kingdom beside a clump of five continental countries that
are separated only by hairlines. It is not "a few pixels wide" as BUILD-NOTES says, and it is
not unreadable either — **it is a map of the wrong subject.**

**The breaker's re-derivation of the cause is correct and the builder's is not**, and I checked
this myself rather than adjudicating between them: the reference extent is
`-171.7911 … 22.7105`, one contiguous 194.50° span, **no country's box touches ±180°**, and
re-expressing every longitude into `[0,360)` makes the span *worse*. So BUILD-NOTES'
*"the fix is dateline-aware bounds in a core function the day map also depends on"* is wrong —
that change would leave this frame byte-identical — and A-40 Part 7 residue 1's framing of the
whole case as *"the antimeridian"* is a misdiagnosis. The cause is a single equirectangular
extent over a set containing one 106°-wide outlier. **Nobody should be asked to build
dateline-aware bounds on the strength of this finding**, and that is the single most valuable
thing round 33 produced.

**Why it does not block.** Four reasons, in order of weight:

1. **The frame is not wrong; it is framed wrong, and the framing is a ruling this increment
   obeyed.** A-40 clause 2 states, as a ruling, that *"the extent comes from core and nothing
   else"* — `worldMapFrame` collects each visited country's `box` corners and calls
   `mapBounds`. The builder implemented that literally, reported the consequence in writing
   rather than improvising past it, and A-40 Part 5 explicitly forbids a builder inventing a
   second geometry pass on its own authority. Sending this back to a builder would be sending
   back a correct implementation of the architect's own sentence.
2. **Nothing on the screen is false.** All seven countries are drawn, correctly attributed,
   correctly filled; the provisional treatment is distinct; the code list underneath names all
   seven and each is tappable; and the surface states what it could not attribute. This is a
   legibility defect, not a correctness, data-loss or privacy one.
3. **It does not get more expensive after I-8b, and the breaker's contrary claim is the one
   part of its reasoning I checked and found wrong.** Round 33 grounds its SEND BACK lean on
   *"the Profile renders the same `travelStats` rows on the same screen."* `worldMapFrame` has
   exactly **one** product consumer — `apps/web/src/views/WorldMap.tsx` — and I-8b's Profile is
   text off `travelStats`, not off the frame. The frame is map-only. So the cost of ruling on
   R33-1 during I-8b is the same as ruling on it now.
4. **I-8a is explicitly not the point at which Jacob sees a shipped 2b.** ROADMAP: *"2b does
   not ship here — the phase's map/identity pair is only half delivered until I-8b."* The gate
   at which this map reaches a user is I-8b's, and I am putting R33-1 on that gate as a hard
   blocker rather than a note.

What I will not do is ship it quietly. It goes to Jacob in plain words below, with the
decision attached, because *"drop the outlier / inset it / fit the modal cluster"* is a product
question about what *"everywhere you've been"* means, not a purely technical one.

### Why this is not a SEND BACK

Stated the same way 2a stated it, so it cannot be read as a soft SHIP: **if any one of the nine
open items were a data-loss path, a privacy leak, a wrong-person's-data path, or a named I-8a
deliverable that was not built, this would be a SEND BACK.** None is, and I checked each of
those four classes by running something rather than by reading the finding:

- **Data loss / availability.** R33-3 is the only candidate and it is real — one unreadable
  stored row leaves the Trips tab permanently unusable with `["BUTTON:CAIRN","BUTTON:TRIPS",
  "BUTTON:MAP"]` as the complete set of surviving controls, and `TabBoundary` never resets even
  after the cause is removed. **But I re-derived the reachability myself, because that is what
  decides it:** `createTrip` refuses all seven malformed dates I tried, and `fromJSON` — the
  backup/restore path — refuses six of the seven. No shipped write path mints such a row. This
  is the same class as R8-3/R8-4, which 2a and Phase 1 both carried with a trigger rather than
  blocking on.
- **Privacy.** `r2-redact` against the rebuilt `dist/`: **0 KNOWN_LEAKS**, 3 hits, all the
  pre-existing `OPTIONAL`/`BOOKINGS` identifiers. No door PIN, no booking reference, no ticket
  URL. No CDN reference, no external font, nothing new that touches a network.
- **Wrong person's data.** Nothing in this increment touches `access/`, `redactText`,
  `copyStop`, `cli export` or a provenance transition. `packages/core` is byte-untouched.
- **A named deliverable missing.** All six of I-8a's *"Built"* bullet are present and none is a
  stub. `Profile.tsx`'s absence is the spec, not a gap.

The ship gate itself is met, with one honest caveat I discharged by hand rather than waving
through — see the table below and **R33-4**.

### Where I disagree with round 33

Round 33 is a strong pass and I am recording where it is wrong, because it is committed to
`master` as the record and the next round will read it.

- **Its ground for SEND BACK does not hold.** See point 3 above: `worldMapFrame` has one
  consumer and the Profile is not it.
- **One of the numbers it certifies as exact is not.** Its closing table says *"`d` payload:
  reference library 11,090 B = 10.8 KB (AT 618, CZ 574, GB 879, HR 694, HU 522, US 7,803) …
  both figures re-computed, not quoted."* That is a **six**-code set with no `DE`. The
  reference library's actual set is seven codes including `DE` — round 33 prints exactly that
  set two rows earlier, in R33-1's own text. Re-derived by me from the real sample: **12,040 B
  = 11.8 KB (AT 618, CZ 574, DE 950, GB 879, HR 694, HU 522, US 7,803)**. Immaterial to the
  512 KB ceiling; material to the claim that every builder number was re-derived. The origin is
  BUILD-NOTES, which names the same wrong six-code set; round 33 re-derived the builder's *code
  list* rather than the sample's.
- **Its own committed probes report FAILs that its status note does not disclose.**
  `qa/r33-frame.mjs` ends `# 2 FAILED` and `qa/r33-reach.mjs` ends `# 1 claim(s) NOT
  confirmed`. Both are the probe demonstrating a finding rather than a regression — which is a
  legitimate style — but this project has now twice been bitten by exactly this (Phase 1's
  *"probe repair, five rounds overdue"*, and 2a's **B-1**…**B-4**), and the whole point of a
  disclosed FAIL count is that round 34 can tell an expected red from a new one.

None of these three changes any of round 33's findings. All four MAJORs reproduce.

---

## Routing — I-8a

Nine items. **None blocks this verdict. Four of them block I-8b, and that is a hard gate, not a
preference.** Each names its agent, its file, and its trigger.

### architect — **before I-8b**, in one pass, because they are one frame

- **A-41. R33-1 — A-40 Part 7 residue 1 is misdiagnosed, its reopening trigger has fired, and
  the fix it names would do nothing.** Residue 1 says *"reopen it with a real user, not a
  hypothetical one."* The real user's library is the shipped sample and it hits the case on
  first paint. **Do not rule dateline-aware bounds**: measured, no country in the reference set
  has a box touching ±180°, the extent is one contiguous 194.50° span, and re-expressing
  longitudes into `[0,360)` makes the span worse (350.75° vs 194.50°), so a dateline-aware
  `mapBounds` leaves this frame byte-identical — and it would change a core function the day
  map depends on for nothing. **What is actually needed is a ruling on how the lifetime frame
  is chosen when one country's box lies far outside the rest**, and A-40 clause 2's
  *"the extent comes from core and nothing else"* is the sentence that has to move or be
  qualified. Three candidate shapes, all of which are product decisions as much as technical
  ones and **all three of which are on Jacob's desk below**: fit the modal cluster and inset
  the outlier; fit everything but let the surface offer a "zoom to Europe"-style reframing;
  or accept the wide frame and say in words what it is showing. Whatever is ruled, A-40 Part 5's
  *"no second geometry implementation"* still binds — a framing choice is not a simplifier, and
  the ruling should say which side of that line it sits on. **Fold R33-6 into the same
  ruling** (below). Evidence: `qa/r33-frame.mjs` §1, `qa/r33-render.mjs` §D, and my own run in
  **Verified** rows 12–14. **Trigger: I-8b does not ship until this is ruled and built.**
- **A-42. R33-2 — A-40 clause 2's claim that `MIN_SPAN_KM` satisfies "must not open at a
  rooftop zoom" is false at world-map scale, and the criterion it licenses verifies a number
  with no rendered consequence.** Re-derived across all 239 index codes: **`VA` is the only
  code that clamps**, at exactly `MIN_SPAN_KM` = **1.2 km**, which is a *day-map* constant
  (`cluster.ts:104`: *"a zoom-16 window is ≈1.2 km wide"*) and zoom 16 **is** rooftop zoom;
  `AT` is 631 km and does not clamp, so ROADMAP I-8a's second criterion is unsatisfiable as
  written and its injected fault is green — **the builder's `AT`→`VA` substitution is sound and
  reporting it rather than editing the criterion was the right call**. Two things to rule: (a)
  what the world map's min-span guard should actually be, given it is a different surface from
  the day map with a different constant; and (b) rewrite ROADMAP I-8a's second criterion to
  assert something with a rendered consequence — as it stands the surface has no tiles and
  draws no unvisited countries, so a one-country history paints the same single polygon at any
  scale, and the only visible difference between `VA` (1.20 km, clamped, prints *"Zoomed out to
  a readable minimum"*) and `GI` (1.76 km, not clamped, prints nothing) is a claim the geometry
  does not support. **Edit the ROADMAP criterion in this pass** — the builder correctly refused
  to, and sequencing rule 5 makes it yours. Evidence: `qa/r33-minspan.mjs`, `qa/r33-render.mjs`
  §H. **Trigger: I-8b does not ship until this is ruled.**
- **A-43. R33-6 — the frame has zero inset, measured exactly.** `bounds.east` is `22.7105` and
  the easternmost drawn vertex is `22.7105`; my own measurement of the inset is **0.000000**.
  With `overflow: hidden` on `.worldmap__figure` and `vectorEffect="non-scaling-stroke"`, the
  outer half of the extreme country's stroke is clipped, and I can see it in the screenshot.
  `mapBounds` has no padding concept and W1 forbids the renderer computing one, so it belongs
  in A-40 Part 3, which does not mention it. **Rule it as part of A-41 — it is the same frame
  and it would be perverse to decide the extent twice.**
- **A-44. R33-3's design half, and only that half.** The builder correctly refused to decide
  alone where `core.lifecycle`'s read gate belongs, given A-37 Part 2 already put one around
  `travelStats`. Rule it. The concrete question: `lifecycle` → `dayNumber` → `parseIsoDate`
  throws (`summary.ts:73`) and `Library.tsx:29` calls it per row through `LifecycleChip` with
  no gate, which is A-37's own failure class on a second surface. Decide whether the gate goes
  in `lifecycle`, in a client selector, or in each surface, and say so once. **Trigger:
  before I-8b, which registers a third surface into the same shell.**
- **A-45 (new this pass, mine, not round 33's). `fromJSON` accepts a calendar-invalid date that
  produces a nonsense number on the surface I-8a just built.** Round 33 checked whether such a
  row reaches a *throw* and correctly concluded it does not. It did not check whether it
  reaches a *wrong answer*. Measured, my own run: `fromJSON` refuses `"202-01-01"`,
  `"10000-01-04"`, `"2026-8-7"`, `""`, `"March 2019"` and `"not-a-date"` — and **accepts
  `"2026-02-30"`**, a date that does not exist. Carried through the real pipeline, that trip
  gives `lifecycle` = `active`, `tripSummary` succeeds, and `travelStats` reports
  **`daysTravelled` = 183 for a two-day trip**; `"2026-13-01"` gives `0`. The Map tab renders
  `stats.daysTravelled` in its stat row, so I-8a is the first surface to print it. Reachable
  through **a shipped write path** (backup/restore of the user's own hand-edited export) —
  unlike R33-3 — which is why it is here and not filed as a curiosity. This is §2.1 **A-32**'s
  `IsoDate` *domain* question, so it is the architect's, not a builder patch. **Trigger: before
  I-8b, which renders the same number as text on the Profile — this is the item round 33's
  "gets more expensive after I-8b" argument actually applies to, and it is not one of the two it
  applied it to.** Repro: the two scripts in **Verified** rows 20–21.

### builder — the next builder pass, before any further increment quotes `i8a-faults.sh`

- **BLD-2. R33-4 — `qa/i8a-faults.sh:58` decides RED as "the suite failed", and three of the
  ten ship-gate faults are vacuous as measured.** Confirmed on my own control, not read from
  the finding: an **unmutated** copy of the tree, run at the harness's own `test/views.test.ts`
  scope, reports `# pass 22 / # fail 1` — so line 58's `grep -qE '^# fail 0$'` cannot match and
  the harness scores W1, the shared-opacity fault and the `backdrop-filter` fault **RED with no
  fault injected**. The failing test is `test/views.test.ts:84` (*"every exemption's
  justification holds"*), and the cause is `loadEurope2026` → `extract-legacy.mjs` →
  `ENOENT … /europe-2026-itinerary.html`, because a copied `cairn/` cannot reach the repo-root
  planner. **Fix it by making the verdict specific, not by making the suite green** — match the
  named `not ok` id, or take a per-test scope. Making `loadEurope2026` resolve the planner from
  the git root is the lesser fix: it papers over a harness whose verdict is *"something in the
  file went red"* when the ROADMAP asks for *"the named criterion went red"*.
  **This is not blocking, and here is exactly why:** I discharged the substance by hand. Each
  of the three mutations, applied to a fresh copy, adds **its own named failure** on top of the
  pre-existing one — `not ok 15 - I-8a / A-40 W1: WorldMap.tsx reads no layout geometry`,
  `not ok 21 - I-8a: no provenance signal is carried by opacity`, `not ok 23 - I-8a: neither
  named removal comes back`. The three criteria **are** load-bearing; the instrument does not
  establish it and I do, in **Verified** rows 8–9. Repro: `bash qa/r33-vacuity.sh`.
- **BLD-3. R33-3's recovery half.** Two things, both in `apps/web/src/App.tsx`: `TabBoundary`
  (`:87-110`) latches `message` for the session and has **no reset**, so it keeps showing the
  banner even after the cause is gone — I watched that happen. And with the Trips tab down, the
  complete set of visible controls is `["BUTTON:CAIRN","BUTTON:TRIPS","BUTTON:MAP"]`: the
  Library is the only surface with delete, export or restore, and the Library is the surface
  that threw. Give the boundary a reset (a *"Try again"* that clears `message`), and give the
  user **one** recovery that does not live inside the surface that throws. Do **not** invent
  the read-gate placement — that is **A-44**. Repro: `qa/r33-render.mjs` §F.
- **BLD-4. R33-5, `apps/web/src/styles.css:221`.** `.tabbar { position: sticky; top: 2.7rem }`
  is a hardcoded **43.2 px** against a topbar that computes **38.38 px**, so a **4.81 px**
  stripe of scrolling page content shows between the two sticky bars at every viewport —
  measured again on my own run at 375 px (`topbar bottom 38.4, tabbar top 43.2`). Derive the
  offset rather than hardcoding it. Ride the related z-index line with it: `.leaflet-top`
  computes `1000` and `.leaflet-control` `800` against `.topbar` **500** and `.tabbar` **490**,
  so the day map's zoom controls paint over both bars.
- **BLD-5. R33-8, `apps/web/src/styles.css:416`.** The token layer declares three severity
  channels and uses one: `--sev-warning` and `--sev-note` are declared at `:92-93` and appear
  in **no** rule, `.stop--flag` paints **every** conflict severity in `--sev-blocker`, and this
  pass *strengthened* it — I diffed it: `color-mix(in srgb, var(--danger) 55%, var(--line))` at
  `04eeb5d` → full `var(--sev-blocker)` = `var(--danger)` at `6b89c91`. `DayTimeline.tsx:115-117`
  already computes a `data-severity` attribute and **nothing in the CSS reads it** (0 matches).
  Wire the attribute the builder already emitted to the two channels the builder already
  declared. Correctly MINOR: measured in the browser, the reference trip's opening view renders
  **0** flagged cards, so nothing is mis-coloured on Jacob's trip today.
- **BLD-6. R33-7, `apps/web/src/App.tsx:208-223`.** `role="tablist"`/`role="tab"` is declared
  and neither half of the WAI-ARIA tablist pattern is implemented: no arrow-key navigation, and
  `tabIndex` is `[0, 0]` rather than a roving single stop. Either implement the pattern or drop
  the roles. Confirmed by reading — there is no `onKeyDown` on the tab buttons at all.
- **BLD-7. R33-9 plus one more, both in `BUILD-NOTES.md`'s I-8a addendum, doc-only.** (a) The
  scope line says *"11 new files (4 of them font binaries) and 10 changed"*; measured,
  `git diff --name-status 04eeb5d 6b89c91` is **10 added / 13 modified**. (b) More worth
  fixing: the payload row's *"reference library"* set is `AT HR CZ HU GB US` — six codes, no
  `DE` — and the reference library's actual set is `["AT","CZ","DE","GB","HR","HU","US"]`. The
  true figure is **12,040 B = 11.8 KB** with `DE 950`, not 11,090 B. Still an order of magnitude
  under the 512 KB ceiling, so nothing about A-40 Part 5 moves; correct the number so the next
  round does not re-derive a wrong one from it, as round 33 did.

### breaker — before round 34, in a commit of its own

- **B-6. Round 33's own probes report undisclosed FAILs, which is the B-1…B-4 rot recurring one
  round after it was cleared.** `node --experimental-strip-types qa/r33-frame.mjs` ends
  `# 2 FAILED` (both are R33-6's padding assertions, i.e. the probe demonstrating its own
  finding) and `qa/r33-reach.mjs` ends `# 1 claim(s) NOT confirmed` (`createTrip ACCEPTS a
  range that crosses year 9999` — it does not; it refuses). Neither count appears in
  `QA-FINDINGS.md`'s round-33 status note, which lists the four commands with no expected
  colours. **Either re-express them as positive assertions of what is true, or state the
  expected FAIL count beside each command in the status note.** A standing probe whose expected
  colour is undocumented costs the next round real time — this file has said so twice.
- **B-7. Round 33 did not attack the token layer's own claim.** Its "what I could not break"
  list is long and genuinely good on dark mode, motion, network and composition — but the
  increment's other half is *"the type scale, rule weights, radii and the signal channels
  declared once as custom properties"*, and the pass verified the two named removals and the
  11 px floor and stopped. **BLD-5 is the defect that was sitting in that gap** — three
  declared channels, one used, and a `data-severity` attribute wired to nothing — and it was
  found by reading rather than by the round. Round 34 takes the token layer as a named target:
  every declared custom property is either used or removed, and every attribute the views emit
  for styling is either read by a rule or deleted.

### Carried forward, re-placed rather than re-derived

| Item | Status at this gate | Where it now belongs |
|---|---|---|
| **R32-3, R32-4** (MINOR) | Untouched by this pass, unchanged | `QA-FINDINGS.md` round 32. Not I-8a items |
| **R31-2…R31-4, R30-2…R30-5, R29-3, R27-1…R27-3** | Untouched, unchanged | Unchanged homes |
| **2a's A-1** (provenance half), **A-2** (P2-8), **BLD-1** (P2-5) | Unchanged; none is an I-8a item and none was reopened here | 2a's routing table, unchanged triggers |
| **B-1…B-4** (2a's probe rot) | Not re-run this pass; **B-6 above is the same failure recurring**, which is the more useful signal | Fold B-1…B-4 into B-6's commit |
| **R8-3, R8-4** (MAJOR, unreachable) | Unchanged. Nothing in I-8a made either reachable — `acceptCandidate` still has no control, `deleteTrip` still only at `Library.tsx` | Phase 3, triggers unchanged |

---

## The I-8a ship gate, clause by clause, and how I checked each

ROADMAP I-8a's ship gate is three clauses. I checked all three and I did not accept the
harness's verdict for the middle one.

| Gate clause | Result |
|---|---|
| **A-40's W1 grep is clean** | **PASS**, my own grep, over a **wider** identifier set than the ruling names: `getBoundingClientRect`, `offsetWidth`, `offsetHeight`, `ResizeObserver`, `innerWidth`, `clientX`, `clientY`, `elementFromPoint`, `getBBox`, `getScreenCTM` — **0 hits** in `WorldMap.tsx`, comments included |
| **Every criterion has its injected fault red** | **PASS on substance, with the instrument defective — and the distinction is mine, established by hand.** `bash qa/i8a-faults.sh` exits **0** with all 10 measured RED. But 3 of the 10 are scoped to `test/views.test.ts`, which fails once in a copied tree with no mutation at all (`# pass 22 / # fail 1`, my own control), so those three verdicts are vacuous *as measured*. I then measured the substance directly: each of the three mutations adds **its own named `not ok`** (15 / 21 / 23). The clause is true; the harness does not establish it. **BLD-2** |
| **The map bugs have a test each rather than a comment each** | **PASS for the hidden-container bug** — and it is the strongest result here: hidden `viewBox` === shown `viewBox` === bare-Node `viewBox`, byte-identical, verified on my own oracle against the real sample. **Nominal for the min-span bug** — the test asserts `VA` clamps, which is true and correctly substituted, but clamping to 1.2 km is itself a rooftop zoom and the surface has no scale reference, so the test asserts the guard fired rather than the bug being absent. Not blocking — measured, the case has **no rendered consequence** on this surface — but the criterion is wrong. **A-42** |

### I-8a's own verification bullets, as ROADMAP writes them

| # | Criterion | Result |
|---|---|---|
| 1 | The world map fits correctly when its tab was hidden at mount | **PASS**, my own Chromium run: mounted at `display:none` with `width === 0`, `viewBox` already correct, byte-identical after the switch and identical to Node's |
| 2 | A one-country history does not exceed the min-span guard | **PASS as re-expressed (`VA`), and the re-expression is sound** — `VA` is the only clamping code in all 239, at exactly 1.2 km; `AT` is 631 km and does not clamp, so the criterion as written is unsatisfiable and its fault is green. **The criterion needs rewriting — A-42** |
| 3 | A provisional country renders differently from a confirmed one, asserted on rendered output | **PASS.** `i8a-signals.mjs` §3 green on my run; the browser fault (provisional painted in the confirmed ink) measured **RED**, and that one is a genuine browser measurement, not a vacuous one |
| 4 | A code the index cannot fill appears in `missing` and on screen | **PASS.** `worldMapFrame` never throws for `ZZ`, `''`, `'at'`, `__proto__` or a 5,000-char code; `drawn + missing` accounts for every row; the fault (drop it silently) measured **RED** |
| 5 | `travelStats` is rendered behind a boundary that can refuse | **PASS** — the Map shows *"We could not read your travel history"* with the row id, and I watched it. **But the boundary has no way out — R33-3 / BLD-3 / A-44** |
| 6 | The two signals are separable | **PASS**, and this is a real fix. No provenance/provisional/unresolved-severity selector sets `opacity` anywhere in the shipped CSS; the blocker's colour and the effective opacity product are identical on an `imported` and an `own` row |
| 7 | Neither removal comes back | **PASS**, over computed style on every element in the running app: no `backdrop-filter`, no gradient in a chrome fill, opaque topbar, drawn flat-ink mark |
| 8 | The payload ceiling is measured and recorded | **PASS on the ceiling, wrong on the number.** Re-derived: reference library **12,040 B = 11.8 KB**, index worst case (239 codes) **374,268 B = 365.5 KB**, both under 512 KB. BUILD-NOTES' 11,090 B is a six-code set missing `DE` — **BLD-7** |

---

## `cairn-constraints` and the read-only boundary, re-verified directly

| Constraint | How I checked | Result |
|---|---|---|
| §1 read-only boundary | `git diff 04eeb5d 6b89c91 -- europe-2026-itinerary.html docs/ tickets/` from the repo root, and `md5sum` after the full suite, a web build, a golden regen, the ship-gate harness (3 mutated browser builds) and ~10 Chromium sessions | diff **empty**; `7c69df3208ef91c8be0fb59a56443188` — byte-identical to the hash in Phase 1's and 2a's verdicts |
| `packages/core` untouched | `git diff --stat 04eeb5d 6b89c91 -- cairn/packages/core/` | **empty**. A-40 Part 2's requirement, discharged |
| `MapPort` untouched | `git diff --stat 04eeb5d 6b89c91 -- cairn/apps/web/src/ports/map.ts` | **empty**, byte-identical |
| §6 export surface | `Object.keys(core).length` | **75**, unmoved |
| §6.6 credentials may not reach a build | `npm run web:build && node qa/r2-redact.mjs` | **0 KNOWN_LEAKS**; 3 hits, all `OPTIONAL`/`BOOKINGS` |
| No new runtime dependency, no CDN | grep `fonts.googleapis\|gstatic\|cdn.` across `apps/web/src` and `apps/web/dist` | one hit, and it is a **comment** in `styles.css:18` saying the app does not use one. All four `woff2` are emitted into `dist/assets/` and served from the app's own origin |
| Goldens and sample byte-stable | `npm run golden && npm run sample && git status --porcelain` | tree **clean**; sha still `40955ca0b182dddcc33540accadf2a65a329bc20b9e6ca109c9884e776bb06d2` |

---

## Verified — I-8a: what I ran, and what happened

All from `/home/user/europe-2026-planner`, `master` @ `6b89c91` (record commit `e15c80d`),
Node v22.22.2, Chromium 1194 via `/opt/node22/lib/node_modules/playwright`. `git status
--porcelain` **empty** before and after; `git worktree list` shows only the main tree
(one leftover at `04eeb5d` from an earlier stage was removed).

| # | Command | Result |
|---|---|---|
| 1 | `npm run typecheck` | exit **0**, **both** projects; `pretypecheck` regenerated the redacted sample first (`16 days, 112 stops, 31 pool, 95 places, 120 import issues, source 40955ca0b182, REDACTED per §6.6`) |
| 2 | `npm run test:tap` | `# tests 915 · # pass 915 · # fail 0 · # skipped 0`, 17.8 s. **BUILD-NOTES' and round 33's 915 are both accurate** |
| 3 | `npm run golden && npm run sample && git status --porcelain` | tree **clean**, sha `40955ca0b182…` — byte-identical regeneration |
| 4 | `npm run web:build` | exit 0. Four `woff2` emitted into `dist/assets/`; the pre-existing >500 kB chunk advisory is unchanged |
| 5 | `Object.keys(core).length` | **75** |
| 6 | three `git diff --stat` from the **repo root** (`packages/core/`, `ports/map.ts`, root boundary) | **all three empty**. *(Noted because I first ran these from `cairn/` and the pathspecs silently resolved to nothing — a false negative I caught by re-running from the root. Anyone repeating this check should run it from the repo root.)* |
| 7 | `PLAYWRIGHT_BROWSERS_PATH=… bash qa/i8a-faults.sh` | exit **0**, all 10 measured RED against expected RED, `every injected fault fired` |
| 8 | **my own control**: an unmutated copy of the tree, `node --test test/views.test.ts` | `# pass 22 · # fail 1` — `not ok 5 - every exemption's justification holds`, `ENOENT … /europe-2026-itinerary.html`. **R33-4 reproduced: three of the ten ship-gate verdicts are vacuous.** The same control at `packages/client/test/world-map.test.ts` scope is `# pass 18 · # fail 0`, so the other seven faults are honestly measured |
| 9 | **my own substance check**: each of the three views-scoped mutations applied to a fresh copy, every `not ok` line printed | each adds exactly its own: `not ok 15 - … A-40 W1`, `not ok 21 - … no provenance signal is carried by opacity`, `not ok 23 - … neither named removal comes back`. **The three criteria are load-bearing. The gate's substance is met; its instrument is not.** |
| 10 | `bash qa/r33-vacuity.sh` | reproduces #8 and names the same test and the same ENOENT. Round 33's diagnosis is correct |
| 11 | `PLAYWRIGHT_BROWSERS_PATH=… node qa/i8a-signals.mjs` | **all green, 8 sections**, my own run: no `backdrop-filter` and no gradient on any element, opaque topbar, drawn mark, nothing rendered below the 11 px floor, all four self-hosted faces `loaded` from the app |
| 12 | **my own Chromium probe**, shipped sample through the real *"Load Europe 2026"* button, Trips → Map | while hidden: `display:none`, `getBoundingClientRect().width === 0`, `viewBox = "-171.7911 -71.3578 194.5016 52.4416"`. After the switch: **the identical string**. **CLAUDE.md's first map bug is absent, on my own oracle** |
| 13 | the same probe, `worldMapFrame` in bare Node from the same rows | **the identical string again.** Three readings — Node, hidden DOM, shown DOM — one byte-identical `viewBox` |
| 14 | the same probe, rendered country boxes, and **I looked at the screenshot** | 958 × 418 px figure: **US 516.3 · GB 45.6 · DE 44.5 · AT 36.9 · CZ 32.6 · HU 32.1 · HR 28.2**; the six European countries occupy **149.2 px of 958**. Stat row reads `Countries 7 · Trips 1 · Days travelled 16`; the chip list reads `AT 1 CZ 1 DE 1 GB 1 HR 1 HU 1 US 1`. **R33-1 reproduced, and it is a map of the United States** |
| 15 | **my own frame arithmetic**: max/min longitude over the reference set, and the same set re-expressed into `[0,360)` | contiguous span **194.5016°**, no box within 8° of ±180°; re-expressed span **350.75°** — *worse*. **Dateline-aware bounds would change this frame by zero. BUILD-NOTES' proposed fix is wrong** |
| 16 | **my own inset measurement**: `bounds.east` vs the easternmost vertex in every emitted `d` | `22.7105` vs `22.7105`, inset **0.000000**. R33-6 exact, and visible in the screenshot |
| 17 | **my own payload measurement** over the sample's real country set | reference **12,040 B = 11.8 KB** (`AT 618, CZ 574, DE 950, GB 879, HR 694, HU 522, US 7803`); worst case over all **239** codes **374,268 B = 365.5 KB**. Both under 512 KB. **BUILD-NOTES' 11,090 B omits `DE`** |
| 18 | `node --experimental-strip-types qa/r33-minspan.mjs` | ALL GREEN. `VA` is the only clamping code in 239; `spanKm` exactly **1.2**; `AT` **630.97 km**, not clamped; the injected fault changes the answer for `VA` and **not** for `AT`. **The `AT`→`VA` substitution is sound and the ROADMAP criterion is unsatisfiable as written** |
| 19 | `qa/r33-frame.mjs`, `qa/r33-reach.mjs`, `qa/r33-render.mjs` | All three reproduce their findings. §F: with a bad row planted, the complete visible control set is `["BUTTON:CAIRN","BUTTON:TRIPS","BUTTON:MAP"]` and the boundary still shows the banner after the cause is removed. **Also: `r33-frame` ends `# 2 FAILED` and `r33-reach` ends `# 1 claim(s) NOT confirmed`, neither disclosed in the status note — routing B-6** |
| 20 | **my own reachability check**, seven malformed dates through `createTrip` and through `fromJSON` | `createTrip` refuses **all seven**. `fromJSON` refuses `"202-01-01"`, `"10000-01-04"`, `"2026-8-7"`, `""`, `"March 2019"`, `"not-a-date"` — and **accepts `"2026-02-30"`**. R33-3's *"no shipped write path mints an unreadable row"* holds |
| 21 | **the follow-on round 33 did not run**: `"2026-02-30"` carried through the real pipeline | `fromJSON` ACCEPTED → `lifecycle` = `active` → `tripSummary` ok → `travelStats` **`daysTravelled` = 183 for a two-day trip** (`"2026-13-01"` → `0`). The Map tab prints that number. **New: routing A-45** |
| 22 | `git diff 04eeb5d:styles.css` vs current, on `.stop--flag` | `color-mix(in srgb, var(--danger) 55%, var(--line))` → `var(--sev-blocker)`. **The collapse was strengthened by this pass.** `--sev-warning`/`--sev-note` appear in **no** rule; `data-severity` is read by **0** CSS rules |
| 23 | **my own browser count** of `.stop--flag` cards on the reference trip's opening view | **0**. R33-8 is correctly MINOR — nothing is mis-coloured on Jacob's trip today |
| 24 | `grep -cE` W1's identifiers (10 of them) in `WorldMap.tsx` | **0** |
| 25 | `ls apps/web/src/views/`; the `TABS` registry test read in full | **`Profile.tsx` does not exist**; ids exactly `['trips','map']`; the *"no DISCOVER"* grep runs on **comment-stripped** source, so the ceiling is honest and the one `discover` in `App.tsx` is a doc comment quoting I-8 |
| 26 | `npm run web:build && node qa/r2-redact.mjs` | **0 KNOWN_LEAKS**; 3 hits, all `OPTIONAL`/`BOOKINGS` |
| 27 | `git diff --name-status 04eeb5d 6b89c91 \| cut -f1 \| sort \| uniq -c` | **10 A / 13 M**. BUILD-NOTES says *"11 new … and 10 changed"* — routing BLD-7 |
| 28 | `git status -sb`, `git worktree list`, `git rev-parse HEAD origin/master` | `master...origin/master`, in sync, clean tree, one worktree. The work is on `master`, per `CLAUDE.md` |

---

## For Jacob — I-8a

**There is now a map of everywhere you have been, and the app has tabs — Trips and Map.** I ran
the whole thing myself: 915 tests, the type checker, the build, the injected-fault harness, and
about ten browser sessions driving your real Europe trip through the actual screens rather than
taking anyone's word for it. **Nothing here is a stub.**

Three things you would notice:

- **The Map tab.** It fills in every country you have been to, drawn from a map bundled inside
  the app — nothing is fetched from any server, and I confirmed that by watching the network:
  every single request goes to the app itself. Tap a country and it lists the trips that took
  you there. A country you are only counted in because you are *on a trip right now* is drawn
  as an outline instead of being claimed as somewhere you have been.
- **The app looks like your planner again** — condensed display type, every number and label in
  a typewriter face, hairlines, small corners, outlined badges. The three typefaces are served
  from the app itself, so it still reads with no network at all. Two bits of glassy chrome are
  gone for good and there is a test that stops them coming back.
- **A real design bug is fixed.** An activity you had not accepted yet used to be shown by
  fading the whole row — and if that row *also* had a scheduling problem, the warning faded
  too. The more wrong it was, the fainter it got. Now the "not yours yet" mark is a dashed
  outline and the warning keeps its full colour whatever else is true of the row. I checked
  this nine different ways and it holds.

**One thing is not good, and I want to be straight about it rather than let you find it.**

Your trip includes the LA flights, so your travel history contains the United States. The map
fits itself around *everything* you have been to — and the moment the United States is in the
picture, the six European countries the trip is actually about become a small clump against the
right-hand edge, about a seventh of the width of the screen, while America takes up most of it.
I opened it and looked at it. It is not *wrong* — all seven countries are there, correctly
drawn, correctly labelled, and listed in text underneath — but it is a map of America with
Europe in the corner, which is not what "show me everywhere I've been" should feel like for
this trip.

**This needs a decision from you, and it is genuinely a product question, not a technical one.**
When one place you have been is a long way from all the others, what should the map do?

- **(a) Fit the main cluster and tuck the outlier into a corner inset**, the way an atlas puts
  Alaska and Hawaii in boxes. You see Europe properly and America is still shown, just smaller
  and off to one side.
- **(b) Fit everything as it does now**, but give you a control that reframes to the part you
  are looking at — so the default is honest about the whole span and you can zoom in.
- **(c) Leave it as it is** and have the screen say in words what it is showing you.

I have blocked the second half of this screen — the Profile, with your country and city and day
counts — until this is decided, so nothing is waiting on you today, but it is the next thing.

**Two smaller things, both scheduled with names on them:** if a stored trip record ever became
unreadable, the Trips screen would go down and there would be no button left that lets you
delete or export the trip causing it — that cannot happen from anything the app itself writes
today, but there is no way out if it ever did, so it is being fixed. And one of the checks that
proves this work is correct is measuring the right thing the wrong way; the checks themselves
are sound — I re-ran them by hand to be sure — but the instrument is being repaired so nobody
has to do that again.

**Still open from before, unchanged:** the *"accept"* button question from Phase 1, and the
"someone else's trip file with no owner in it" question from 2a. Neither is blocking anything.

**Next:** I-8b — the Profile screen, and then step 2b ships.

---

# Phase 2, step 2b (data layer) — I-5 … I-7b

> **Status: CURRENT.** Manager ruling, recorded against `master` @ `69e44d4`, 2026-08-29.
> **Verdict: SHIP.** I-5, I-5a, I-5b, I-5c, I-6, I-6a, I-7, I-7a, I-7b — and the QA arc directly
> under I-7b, A-38 and A-39 — are shipped. **I-8, the Map and Profile surfaces, is explicitly
> not included in this verdict** and remains not started: `apps/web/src/views/WorldMap.tsx` and
> `Profile.tsx` do not exist as of `69e44d4`.
>
> **This entry is a different kind of record than the other two in this file, and that
> difference is stated rather than blurred.** The 2a and Phase 1 verdicts above are each an
> independent review pass with its own re-derived evidence. This one is not: it records a
> decision Jacob made directly, closing a gap in the paper trail rather than reopening the
> work. Ten breaker rounds (22 through 32) already did the adversarial work this gate exists
> for, and round 32's own status note — still the most recent independent verification on
> record — says as much in its closing lines: *"nothing found in this round or the last three
> is a defect in shipped code … R32-1 and R32-2 are one builder pass, they need no architect
> ruling."* That builder pass ran at `f21fa42`, addressing exactly the two findings round 32
> named, no other file changed. **No breaker round has re-verified `f21fa42` since.** Jacob's
> instruction accompanying this ruling is explicit that this gap is not to be closed by
> reopening I-7's architecture, R32, or A-39 — so it isn't; this entry records the ruling and
> stops there.

## What this records

- **Shipped, per the round-32 status note and unchanged since:** the country-attribution index
  (I-5/I-5a/I-5b/I-5c — A-26, A-27, A-28), the widened `TripSummaryRow` and its rescan
  (I-6/I-6a — A-29, A-30), `travelStats` and the record census (I-7 — A-31), the civil-calendar
  fix and `provisional` (I-7a — A-32, A-33, A-34), the executed port gate and the two row read
  gates (I-7b — A-35, A-36, A-37), the seeded-double `ensureReady` upcast (A-38), and the finite
  covering set for the storage read gate (A-39).
- **Closed by the builder pass at `f21fa42`**, per that commit's own BUILD-NOTES addendum: R32-1
  (the per-id key-set assertions now check nested `cities[].countrySource`, not top-level only)
  and R32-2 (the Axis-C `revision: 0` cell is now covered via `importDoc`'s reachable path,
  rather than argued unreachable). That addendum reports 884/884 tests, both projects typecheck
  clean, `Object.keys(core).length` 75, and goldens/sample byte-identical — figures this entry
  quotes rather than re-derives.
- **Still open, and this ruling adjudicates none of it:** R32-3, R32-4 (both MINOR), R31-2,
  R31-3, R31-4, R30-2…R30-5, R29-3, R27-1…R27-3, and the carried Phase 1 list.
  `QA-FINDINGS.md`'s status note remains the authoritative record for each; nothing there is
  edited by this entry.
- **Not included, at all:** I-8. Nothing in this verdict is a statement about the Map or
  Profile surfaces, the app-shell navigation, or any visual treatment — those remain 2b's
  unbuilt remainder.

## Routing

None. This entry closes no open finding and opens none — the items listed above as still open
keep exactly the routing `QA-FINDINGS.md` and `ROADMAP.md` already give them.

---

# Phase 2, step 2a — past trips and the lifecycle

> **Status: CURRENT.** Manager, stage 4. Reviewed `master` @ `67f5588`, 2026-08-28, Node v22.22.2.
> **Verdict: SHIP. 2a is closed; 2b (I-5 … I-8) may open.**
> Scope was I-0 through I-4a and nothing else — I-5 … I-11 are not started and were not judged.
> Every claim below has a command in **Verified — 2a** that I ran myself, on this tree.
>
> **What I did not run:** the Chromium probes (`qa/p2-pasttrip.mjs`, `qa/p2b-past.mjs`,
> `qa/browser*.mjs`, `qa/r8-views.mjs`, `qa/r9-redo.mjs`, `qa/r10-editdoor.mjs`, and the other
> browser-driven files). **`playwright` is not installed in this environment** — `require('playwright')`
> fails with `Cannot find module`. I-4's *"run it in the browser, not only in Node"* clause is
> therefore taken on round 12's and round 13's own Chromium evidence rather than re-derived by me,
> and I say so rather than implying I checked it. Every headless assertion in those probes' Node
> equivalents I did run.

---

## Verdict: **SHIP**

**2a is what `BRIEF.md` and `ARCHITECTURE.md` §8.1–§8.2 say it should be, it is built, and the
reported state is true.** I re-derived every headline number rather than quoting one, and every
one of them reproduced. Nothing named in the 2a row of ROADMAP's three-steps table is missing,
stubbed, or misreported.

Concretely, on my own runs:

- **`lifecycle()`** — pure, in `derive/`, no stored status field, three stages correct at the
  boundaries, and `node cli.ts trip --today 2026-08-27` prints `[completed]` / `stage: completed`.
- **`Trip.datePrecision`** — stored, defaulted, refused when malformed, byte-identical through
  `toJSON(fromJSON(toJSON(t)))`, carried through undo/redo at depth 50, and its grep ceiling is a
  test with **one pinned exemption** (`derive/summary.ts`, which §8.4 names and which carries the
  field without branching on it).
- **The feasibility/integrity rule class** — all ten rules classified per §8.2's table; at a clock
  after `endDate` the reference trip returns **5 findings, 0 of them feasibility**; at the goldens'
  clock it returns the Phase 1 set **unmoved**.
- **The live defect closes.** This is the reason 2a exists and it is the thing I most wanted to see
  fail. It does not: at the real clock the reference trip's two `missing_lodging` warnings go to
  **zero**, and both `legacy_flag` blockers — Jacob's own Aug 18 and Aug 20 flags — stay.
- **The past-trip flow** — a real form, not a stub: 255 lines, wired into `Library.tsx`, dispatching
  only `createTrip` / `setTripMeta` / `setDayMeta`, with lifecycle chips on both `Library` and
  `TripView`. End to end in core, my own run: *"Japan, March 2019 — 東京, 京都"* mints **two distinct
  keys**, 31 dense days, **0 conflicts and 0 validation issues**, round-trip byte-identical.
- **Phase 1's ceiling is unchanged, re-derived not quoted:** 620/620, typecheck clean on both
  projects, goldens and sample byte-identical at sha `40955ca0b182`, 2/4/11 at `FIXTURE_TODAY`,
  `validateTrip` 11, `geoCheck` 0 on the clean trip and 112/112 + 92/94 under the +1° fault,
  **71** exports.

### On I-3a and I-4a's long history, and why I am not adding a round to it

Both were re-opened repeatedly (I-3a through A-9/A-11/A-12/A-13/A-17; I-4a through
A-10/A-14 … A-25, nine breaker rounds). Length is not evidence in either direction, so I judged the
**final state**, and I re-derived the two clauses of A-25 Part 6 that are cheapest to fake and most
expensive to be wrong about:

- **Clause 2, two-sided, in a throwaway worktree at `67f5588`.** Reverting `refileCityKey`'s step-4
  `order` hoist turns `readOnce.test.ts` assertion 1 red with a **one-element** offender list naming
  exactly `15 · three same-named target cities — the step-4 order tie-break: tgtCity1.order ×2` and
  nothing else. Restored, 4/4. The census catches its own subject.
- **Clause 4's null clause, my own mutation.** Planting `homeBase: null` back onto the source fixture
  reds test 4 naming exactly `srcTrip.homeBase` — i.e. the R20-2 blindness A-25 Part 1 was written to
  close is genuinely closed by a test rather than by a docstring. `DECLARED_NULLS` is `{}`.

Worktree removed; `git worktree list` shows none of mine.

**I did not re-derive clauses 1, 3, 5 and 6 a third time, and here is the reason rather than an
assertion.** Clause 1 is a set of ceilings I ran independently anyway (they are in **Verified**
below). Clauses 3, 5 and 6 were each derived twice already — once by the builder in a discarded
worktree (`BUILD-NOTES` on `f515768`) and once, independently and adversarially, by round 21
(`qa/r21-closure.mjs`, `qa/r21-clause3.sh`) — and round 21's own fresh attack of 22 document shapes
beyond the matrix returned 0 throws and 0 unnamed multi-reads. A third derivation of a clause two
independent parties already produced identical numbers for is the work §0.5 warns about: not
distinguishable from progress. What I checked instead is the thing a third derivation could not have
caught — whether the *guard* is live — and both mutations above say it is.

### The residues, checked one at a time

Each is a principled, disclosed boundary rather than something that should have been fixed:

- **A-15's `Stop.links`** — classified out loud, with a key-set assertion so a ninth `Place` field
  cannot travel unclassified. `links` is **dropped entirely**, not emptied. Verified: `qa/r15-place-copy.mjs`
  ALL OK.
- **A-21 Part 3's `toJSON` scope boundary** — drawn around one function with a stated reason, and
  A-25 Part 5 class C draws the identical boundary around `build/stops.ts` with three reasons **and a
  trigger** (the day a `Stop.placement` is built by something other than a person's own hand). A
  boundary with a trigger is a decision; one without is a gap. These have triggers.
- **A-25's classes A, B and C** — A is the skeleton scan (closing it needs `max: 5` on an array,
  which is a licence, not an exception); B is reclassified from "residue" to "floor" under A-24's own
  spread-versus-read discriminator, which is a correction rather than an excuse; C is out of scope with
  a trigger. I confirmed by running that class A's list is now complete by instance as well as by class
  after `67f5588`.

Nothing in that set is a defect wearing a disclosure.

### Why this is not a SEND BACK

I found six things. **None of them is in 2a's shipped product surface as a defect that 2a's own gate
should have caught** — four are in the *record and the verification apparatus*, and two are product
items that already had a routing which nobody executed for nine rounds. The correct manager action
for the latter is to **place them with a trigger**, which nine consecutive status notes failed to do
and which is exactly what a gate is for. Blocking a phase step that has met every criterion written
for it, in order to force work on two MINORs that a routing already exists for, would be manufacturing
a SEND BACK rather than making one.

Stated plainly so it cannot be read as a soft SHIP: **if any one of the six had been a data-loss, a
privacy leak, a wrong-person's-data path, or a named 2a deliverable that was not built, this would be
a SEND BACK.** None is.

---

## Routing — 2a

Seven items. **None blocks 2b from opening.** Each names its agent, its file, and its trigger.

### breaker — before 2b's first breaker round, in a commit of its own

This is I-0's obligation recurring inside the phase I-0 opened. I-0 exists as a whole increment with
*"user-visible outcome: NONE"* precisely because a stale FAIL costs a later round real time, and its
ship gate says **"the full board runs; every probe is PASS or gone."** I ran the full board. It does
not. Rounds 14–21 each ran only the probes in their own narrow scope, so the rot re-accumulated
unnoticed and no status note discloses it.

- **B-1. `qa/r11-recheck.mjs` dies mid-run and silently loses 9 of its 21 assertions.**
  `qa/r11-recheck.mjs:207` — `withCopy({ kind: 'pool' })` passes a pool placement with **no `cityKey`**,
  which `copyStopInto` has correctly refused since A-19 landed (revision 14): the probe aborts with
  `Error: copyStopInto: no such city undefined in trip-mine` at `packages/core/src/build/copyStop.ts:537`.
  12 of 21 assertions run; **§2.3, §2.4, §2.5 and §2.6 never execute**, which includes R10-2's entire
  end-to-end coverage through the store's own dispatch path with undo/redo. This is a stale probe, not
  a product defect — A-19's throw is correct and `StopPlacement`'s pool variant requires `cityKey` in
  the type, so only a `.mjs` caller can reach it. **Fix:** give §2.3's `withCopy` call a `cityKey` the
  target actually holds, exactly as ROADMAP revision 14 assigned `qa/r15-place-copy.mjs` §3.4 to QA.
  Do not change `copyStop.ts`.
- **B-2. `qa/r21-closure.mjs` reports 1 FAIL for a finding that closed one commit ago.**
  `qa/r21-closure.mjs:407-409` hardcodes the label `'class A — NOT enumerated in Part 5'` for
  `tgtTrip.cities.<n>`, `tgtTrip.pool` and `tgtTrip.days.<n>.stops.<n>`; the probe does not read
  `ARCHITECTURE.md`. Commit `67f5588` folded R21-1 into A-25 Part 5 and all three **are** now
  enumerated there. Re-express §6's assertion (and preferably read the list out of A-25 Part 5 rather
  than restating it) so the probe is at **0 FAIL**. Its §6b measurement stays as a `console.log`.
- **B-3. `qa/p2b-gate.mjs` §2.1's `datePrecision` ceiling is stale.** It fails on
  `packages/core/src/derive/summary.ts`, which P2-6's own fix put there and which §8.4 blesses in
  writing (*"carried and never branched on"*). `packages/core/test/datePrecision.test.ts:241` already
  pins that as the **single** permitted exemption and asserts the exemption list cannot grow silently.
  Re-express §2.1 against the same one-entry allow-list.
- **B-4. `QA-FINDINGS.md`'s status note carries two false "STILL OPEN" claims.** Nine consecutive
  rounds wrote *"STILL OPEN, unchanged and not re-litigated: R13-4, R13-5, …"*. **Both are closed.**
  `packages/core/src/conflict/detect.ts:248` reads *"stays at 71"*, and `geoOutlier.ts`'s two label
  sites are distinguishable (*"the map for a city this trip does not have"* vs *"the optional list
  for …"*). `qa/r13-gate-citykey.mjs` §7 and §8 are green and assert exactly those two things. The
  status note is the first thing a manager reads; correct it.
- **B-5 (housekeeping, no commit needed).** Four worktrees from earlier rounds are still registered:
  `/tmp/r14-pre`, `/tmp/r14-tw`, `/tmp/r15-pre`, `/tmp/r16-pre`. They are the documented differential
  fixtures for `qa/r14-horizon-copy.mjs`, `qa/r15-place-copy.mjs` §6.3 and `qa/r16-copy-depth.mjs`
  §5.3, all of which skip gracefully without them — so this is not a defect, and my "ALL OK" on those
  three is the **stronger** reading because the differential sections ran. Noted only so the next
  session knows why they exist.

### architect — before I-6, which consumes the data

- **A-1. §8.1's provenance table claims a capability the product does not have, and I-6 is the
  increment that will consume it.** §8.1 argues *"there is no `Trip.kind`, and manually-entered travel
  needs no new provenance value … the certainty of a record is already `provenance.confidence`, and it
  already means exactly the right things"*, and its first table row maps *manually entered from
  memory* → `{source:'user', confidence:'asserted'}`. **No path in the product produces that.**
  `packages/core/src/model/provenance.ts:18` — `userProvenance` hardcodes `confidence: 'confirmed'`,
  and it is what `createTrip`, `ensureDays`, `addStop` and `setDayMeta` all use. Measured, my own run:
  a trip recorded through `PastTripForm` comes back with every one of its 31 days at
  `{source:'user', state:'accepted', confidence:'confirmed'}` — the same value a booked, documented
  trip carries. The only `'asserted'` producers in `packages/core/src` are `systemSuggestion` and
  `copyStop.ts`'s `demote`. **Nothing is user-visible in 2a** (`confidence` is read by no surface in
  `apps/web`, and `displayStatus` does not consult it), which is why this is not a 2a blocker — but
  §8.4's `travelStats` and the lifetime map are derived from exactly this data, and Jacob's own
  principle is *"treat manually entered, imported, and observed travel as potentially different
  provenance rather than pretending all data has identical certainty."*
  **Second half of the same ruling, because it is the same data:** `PastTripForm` assigns the trip's
  **first** city to **every** day (KD-38, disclosed on screen and in BUILD-NOTES). Measured: for
  *"東京, 京都"*, `daysForCity(東京) = 31` and `daysForCity(京都) = 0`. Those 31 day-city facts are
  **ours, not the user's**, and they will be the lifetime map's input. Rule on whether a day-city the
  form assigned may stand as evidence in `travelStats`, and if so how the surface says which it is.
  Do not patch this in code — sequencing rule 5 makes it an architect's call.
  **Trigger: before I-6 widens `TripSummaryRow`.** ROADMAP already requires A-10/A-14 to land before
  I-6 for this exact reason; this is the same dependency, one field over.

### architect — before any share, friend or public-share-link work, and before 2b touches `importDoc`

- **A-2. P2-8 has been routed to the architect since round 12 and has never been ruled.** Nine status
  notes list it as *"still open, not re-litigated"*; ROADMAP's carried-forward table does not contain
  it; so it currently has no home at all. Reproduced by me, `qa/p2b-gate.mjs` §4.6: with
  `"ownerId":"user:marta"` present the file is refused with `ForeignDocumentError`; **delete that one
  key and the same file is adopted whole as `local:self`**, carrying 91 stops whose
  `provenance.actorUserId` is still `user:marta`, with `validateTrip` reporting **0** ownership issues
  (21 of 112 stops do not render as the importer's own; 91 do). `BRIEF.md` states as settled that
  *"`importDoc` … refuses a document owned by someone else, **visibly**"* — deleting one key defeats
  "visibly". `packages/client/src/store/store.ts:1027-1028`; KD-40's reasoning for *allowing* an
  absent owner is sound and is not what is being questioned. The open question is the one round 12
  wrote: does *allowed* also mean *adopt its foreign provenance unexamined*.
  **This is the same class of block I-4a already carries** and it deserves the same wording: it is a
  scope rule, not an open defect, and 2a's SHIP does not lift it.

### builder — in 2b's first builder pass

- **BLD-1. P2-5, `apps/web/src/views/PastTripForm.tsx:107-143`.** Routed to a builder at round 12,
  with a `file:line` and **two repro scripts already in `cairn/qa/`** — which by `cairn/CLAUDE.md`'s
  delegation table is the cheapest route this project has — and never executed. Reproduced by me,
  `qa/p2b-gate.mjs` §3.4: after recording a one-year trip, **400 undos accepted, 315 of 365 days still
  carry the city.** The city assignment is one `setDayMeta` per day, so one press is N+2 undo entries
  and the 50-entry history means a year-length trip can **never** be undone back past its own
  recording. With the form's default `'month'` precision it is 33 presses — annoying rather than
  broken — so the sharp edge is `'year'` only, which is why it is MINOR and not more. It is still a
  defect in the one flow 2a exists to deliver, in the first minute of using it.
  Repros: `qa/p2b-past.mjs` §2f (Chromium) and `qa/p2b-gate.mjs` §3.4 (headless).

### Carried forward, re-placed rather than re-derived

| Item | Status at this gate | Where it now belongs |
|---|---|---|
| **R10-1** (MINOR) | **Closed.** ARCHITECTURE §2.7 **A-8** blesses A-5b clause 2 with a reopening trigger. Nothing owed. | — |
| **R8-3** (MAJOR, unreachable) | Unchanged. `acceptCandidate` still has no control in `apps/web` — re-verified. | **Architect, Phase 3**, or earlier if Jacob pulls the accept control forward. Trigger unchanged. |
| **R8-4** (MAJOR, unreachable) | Unchanged. 2a added no in-trip delete control. | **Phase 3, with the `SyncPort`.** Trigger unchanged. |
| **R13-4, R13-5** | **Closed in code**, and QA's status note is wrong to list them. | Nothing owed to a builder — **B-4** above corrects the record. |
| **R2-18** (`qa/r2-constraints.mjs`, 1 FAIL) | Unchanged and correctly classified. The determinism grep in `test/boundaries.test.ts` walks `packages/core/src` only, so the reducer — which `cairn-constraints` §4 names — is not covered by it. The probe's own next line confirms `packages/client` is clean **today**, so this is a guard gap, not a live defect. | **Phase 1 carried list.** Not a 2a item. |
| **P2-5, P2-8** | Real, open, both routed at round 12 and neither executed. | **BLD-1** and **A-2** above. They now have a home and a trigger for the first time. |
| **`qa/p2b-gate.mjs` §1.7** (un-padded `today`) | Real and correctly not gated on: `detectConflicts(today:"2019-3-5")` returns 3 where `"2019-03-05"` returns 2, because the gate compares `IsoDate` strings while `lifecycle()` parses. Reachable only past the types — `cairn-constraints` §6 makes `YYYY-MM-DD` the contract and `apps/web`'s only clock is `ports/env.ts`. | Fold into **A-1**'s pass if the architect is in `§8.1` anyway; otherwise leave disclosed. Not owed. |
| The Phase 1 MINOR list (R6-1/2, R5-2, R11-1's record, R3-6…R3-9, the `r6-actor` residuals) | Re-run this pass at exactly their disclosed counts. **No undisclosed FAIL anywhere on the headless board.** | Unchanged. |

---

## Exit criteria — which apply to 2a, and how I checked each

ROADMAP's Phase 2 exit criteria are the **phase** gate (I-11), not 2a's. Four of the ten are 2b/2c
work and I did not judge 2a against them, per this review's stated scope. The table says which is
which and what I ran.

| # | Criterion | Applies to 2a? | Result |
|---|---|---|---|
| 1 | Phase 1's whole suite passes unchanged, every number re-derived | **Yes — sequencing rule 3** | **PASS.** 620/620; 2/4/11 at `FIXTURE_TODAY`; `geoCheck` 0 clean and 112/112 + 92/94 under +1°; `validateTrip` 11; goldens + sample byte-identical at `40955ca0b182`. All re-derived by running, none quoted |
| 2 | Injected fault — the rule class does what it claims | **Yes — I-3** | **PASS.** After `endDate`: 5 findings, **0** feasibility, composition `legacy_flag 2 / superseded_booking 1 / unverified_reference 2`, both blockers intact. Back at the goldens' clock: the original 17 exactly. `ruleClass.test.ts` states the count and one line per finding, and reasons explicitly about why *"before `startDate`"* means `FIXTURE_TODAY` |
| 3 | A past trip is silent | **Yes — I-4** | **PASS**, my own end-to-end run: 31 dense days, `Day.id === Day.date`, **0** conflicts and **0** validation issues. Injected fault (a stop after `today`) returns feasibility for that day only — `past-trip.test.ts` 49/50/51/52/53 |
| 4 | Country attribution measured, holes visible | No — **I-5/2b** | Not judged |
| 5 | Generated index inside its budget | No — **I-5/2b** | Not judged |
| 6 | Statistics cannot be stored | No — **I-7/2b** | Not judged. Spot-checked negatively anyway: no `travelStats`, no `countries.gen.ts`, nothing counting into storage exists yet |
| 7 | Injected fault — the summary is only as fresh as its write | No — **I-6/2b** | Not judged |
| 8 | Participation grants nothing | No — **2c** | Not judged |
| 9 | Round-trip and undo parity over the new fields | **Partly — the `datePrecision` half is 2a** | **PASS.** `toJSON(fromJSON(toJSON(t)))` byte-identical with the field present and absent; `fromJSON` rejects `datePrecision:'fortnight'` with `$.datePrecision`; undo/redo at depth 50 carries it (test 146); a pre-`datePrecision` document loads as `'exact'`. The participants half is 2c |
| 10 | Every new action maps 1:1 onto a core build function | **Yes — I-4** | **PASS.** The form adds **no** action: `setTripMeta` → `core.setTripMeta`, `setDayMeta` → `core.setDayMeta`, both pre-existing (test 54). The closed list of document-installing store methods is still **six**, asserted structurally at `retirement-ledger.test.ts:219` (`adoptTrip, closeTrip, createTrip, deleteTrip, importDoc, openTrip`, plus `doMerge` = exactly 7 `reseed: true` sites) |
| 11 | NO SILENT LOSS unchanged and extended to the new write paths | **Partly — the participant half is 2c** | **PASS for 2a.** The 200-step dirty-walk oracle holds; no new path assigns `state.doc`. **One note, not a finding:** the walk's step chooser dispatches `setDayMeta` only, so a `setTripMeta{datePrecision}` step is not in it — that path is covered instead by `store.test.ts` 147 (save + reopen) and `merge.test.ts` 485/486. The criterion's own wording is about participant edits, so I am not manufacturing a 2c item out of it |

### I-1 … I-4a's own ship gates, as ROADMAP states them

| Increment | Ship gate | Result |
|---|---|---|
| **I-0** | Full board runs; every probe PASS or gone; six baseline numbers with their commands | **PASS at the time; NOT true today** — see routing **B-1**/**B-2**/**B-3**. The six baseline numbers all reproduce |
| **I-1** | `lifecycle` on §2.10's list, count re-counted; CLI prints the stage; no `Date.now()`/`new Date()` in `packages/core` | **PASS.** 71 exports counted; CLI verified at three clocks; the only `Date` uses in core are `derive/summary.ts`'s pure UTC arithmetic — no ambient read anywhere, and `test/boundaries.test.ts` asserts it |
| **I-2** | The grep ceiling is a test not a promise; round-trip parity both ways; no export added | **PASS.** 0 hits under `conflict/` and `validate/`; one pinned exemption under `derive/`; the exemption list itself cannot grow silently; 71 unmoved |
| **I-3** | All Phase 1 conflict numbers unchanged; every rule carries a class; `subjectDate` tested per `RefKind` | **PASS.** 2/4/11 unmoved; 10/10 classified against §8.2's transcribed table; `subjectDate` covers day/stop/booking/trip/place/pool-stop and both unknown-id fallbacks |
| **I-4** | 2a independently shippable; criteria 1, 2, 3 and the NO-SILENT-LOSS extension pass | **PASS** — with **BLD-1** open against the same file, MINOR, routed |
| **I-3a** | Every Phase 1 and 2a conflict number unchanged; 2 suppressed `missing_lodging` at the real clock; `detectConflicts` byte-identical at all sweep clocks; the horizon still bites; `qa/r13-gate-citykey.mjs` §1/§4 at 0 FAIL | **PASS**, re-derived. `detectUngated`'s id set is **identical at all 8 clocks I swept** (17 findings each); at 200 days before the trip `detectConflicts` reports **0** `unbooked_ticketed` while `detectUngated` reports **10**; the real clock suppresses exactly the two `missing_lodging` warnings; `r13-gate-citykey` **0 FAIL** |
| **I-4a** | The slug expression nowhere in `apps/`/`packages/`; no call site outside core mints a city key; three validation codes each with an injected-fault test; A-25 Part 6's six clauses | **PASS.** The slug survives only inside a test docstring explaining what was deleted; `cityKey.test.ts` 262 asserts the no-outside-minting rule; 246/247/248 are the three injected faults; clauses 2 and 4 re-derived by me above, 1 measured, 3/5/6 taken on two prior independent derivations with the reason stated |

**On the ROADMAP's own arithmetic, one correction worth recording rather than routing.** I-3a's ship
gate says *"at a clock 200 days before the trip, `detectConflicts` reports **no** `unbooked_ticketed`
note while `detectUngated` reports **three**."* I measure **10**, not three.
`horizonGate.test.ts:200-207` already caught this and documents it: *three* is §2.7's rule table
naming the three fixture **cases** (Széchenyi, Prague Castle, Windsor), and the rule fires ten times
on the reference trip. The test asserts the three by name **and** the measured count. That is the
correct handling of a document number that is off, and I am recording it here so nobody re-derives it
a fourth time — not routing it.

---

## `cairn-constraints`, re-verified directly

| Constraint | How I checked | Result |
|---|---|---|
| §1 read-only boundary | `md5sum europe-2026-itinerary.html` before and after the full suite, a web build, a golden regen and ~78 probe runs; `git status --porcelain -- . ':(exclude)cairn'` | `7c69df3208ef91c8be0fb59a56443188` **unchanged** — byte-identical to the hash in Phase 1's own verdict; root diff **empty** |
| §1 write paths that *could* reach it | `node --test test/cli.test.ts` | **16/16.** `cli export` refuses a path escaping `cairn/`, through a symlinked file, through a symlinked parent, and under `--force`; *"the live planner is not writable through any cli command"* is a test |
| §2 zero runtime deps | `package.json` of both packages | `core` `{}`; `client` `{"@cairn/core":"*"}` — a workspace sibling that installs nothing |
| §3 bare-Node type stripping | the whole suite and every probe ran under `node --experimental-strip-types`, no build step | clean |
| §4 no ambient clock / randomness | grep over `packages/core/src` + `packages/client/src` | **zero** `Date.now()`, `Math.random()`, `crypto.randomUUID()` or zero-arg `new Date()`. The two `Date` uses are `derive/summary.ts`'s pure `Date.UTC` arithmetic. Behavioural proof: two separate processes and two CLI runs produce byte-identical output (`qa/r2-constraints.mjs`) |
| §5 no DOM/React in `packages/client` | grep for `document`/`window`/`React`/`localStorage`/`HTMLElement` | every hit is prose in a comment; `pageExit.ts` takes its targets as **arguments** rather than reaching for `window` |
| §6 export surface | `Object.keys(core).length` | **71**, and §2.10's own group counts sum to 71 (`7+17+22+6+2+2+7+3+1+4`) |
| §6.6 credentials may not reach a build | `npm run web:build && node qa/r2-redact.mjs` | **0 KNOWN_LEAKS.** 3 hits over 108 derived tokens, all `OPTIONAL`/`BOOKINGS` — KD-27's two named non-credentials. No door PIN, no booking reference, no ticket URL in `dist/`. `dist/` and the generated sample are both gitignored |

---

## Verified — 2a: what I ran, and what happened

All from `/home/user/europe-2026-planner`, `master` @ `67f5588`, Node v22.22.2.

| # | Command | Result |
|---|---|---|
| 1 | `npm run test:tap` | `# tests 620 · # pass 620 · # fail 0 · # skipped 0`, 8.9 s. **BUILD-NOTES' and QA's 620 are both accurate** |
| 2 | grep the TAP stream for `readOnce.test.ts`'s tests | `ok 505` / `ok 506` / `ok 507` / `ok 508` — **all four inside the suite**, not standalone. A-25 clause 1 |
| 3 | `npm run typecheck` | exit 0, **both** projects; `pretypecheck` regenerated the sample first (`16 days, 112 stops, 31 pool, 95 places, 120 import issues, source 40955ca0b182, REDACTED per §6.6`) |
| 4 | `npm run golden` then `git status --porcelain` | all 8 goldens + `fixtures/europe2026.sha256` = `40955ca0b182dddcc33540accadf2a65a329bc20b9e6ca109c9884e776bb06d2`; tree **clean** — byte-identical regeneration |
| 5 | `npm run web:build` | exit 0. `dist/assets/index-ok4BX8GA.js` 598.73 kB; the pre-existing >500 kB advisory is unchanged |
| 6 | `Object.keys(core).length` | **71** |
| 7 | `detectConflicts(trip, {today: FIXTURE_TODAY})` | **2 blocker / 4 warning / 11 note**, 17 total; `legacy_flag 2, missing_lodging 2, superseded_booking 1, unbooked_ticketed 10, unverified_reference 2` |
| 8 | `validateTrip(trip)` | **11** issues |
| 9 | `detectConflicts` at `2026-08-30` (after `endDate`) | **5** findings, **0** from any feasibility rule; `legacy_flag 2, superseded_booking 1, unverified_reference 2`. **Exit criterion 2** |
| 10 | `detectConflicts` at `2026-08-27` (the real clock) | `missing_lodging` **2 → 0**, both blockers intact. **The live defect §8.2 was written to close, closed** |
| 11 | `detectConflicts` with **no** `today` | 7 findings, feasibility present — edge ruling 3 holds, the gate invents no clock |
| 12 | **my own clock sweep**: `detectUngated` id-list at `2019-01-01`, `2026-01-01`, `2026-02-13`, `2026-08-01`, `2026-08-24`, `2026-08-30`, `2027-08-30`, `2030-01-01` | **identical at all eight**, 17 findings each. A-11's property, re-derived rather than quoted |
| 13 | same, 200 days before `startDate` (`2026-01-19`) | `detectConflicts` **0** `unbooked_ticketed`; `detectUngated` **10**. The horizon still bites, and it bites in the gate |
| 14 | `node cli.ts trip --today {2026-08-01, 2026-08-10, 2026-08-27}` | `[planned]` / `[active]` / `[completed]`, with `stage:` printed and the clock echoed. At the completed clock: `2 blockers, 2 warnings, 1 notes` |
| 15 | **my own end-to-end past-trip build** in core: *"Japan 2019"*, `2019-03-01…31`, cities `東京`/`京都`, precision `month`, `setDayMeta` per day | two **distinct** keys (`tcity-1`, `tcity-2`); 31 dense days; **0 conflicts, 0 validation issues**; `lifecycle` = `completed`; `toJSON(fromJSON(toJSON(t)))` **byte-identical**. **Exit criterion 3 and A-10's headline case, on my own oracle** |
| 16 | the same run, `daysForCity` per city | `東京 = 31`, `京都 = 0` — the input to routing **A-1** |
| 17 | the same run, `days[0].provenance` | `{source:'user', state:'accepted', confidence:'confirmed'}` — the other input to **A-1**. §8.1's table says memory-entry is `'asserted'`; nothing produces it |
| 18 | **A-25 clause 2, two-sided**, throwaway worktree at `67f5588`: revert `refileCityKey`'s step-4 `order` hoist | **red**, offender list a **one-element array**: `15 · three same-named target cities — the step-4 order tie-break: tgtCity1.order ×2`, and nothing else. Restored: **4/4** |
| 19 | **A-25 clause 4's null clause, my own mutation**: plant `homeBase: null` back on `sourceTrip` | test 4 **red** naming exactly `srcTrip.homeBase`. Worktree removed; `git worktree list` shows none of mine |
| 20 | `qa/r13-gate-citykey` `r14-horizon-copy` `r15-place-copy` `r16-copy-depth` `r17-hours-parser` `r18-readonce` `r19-census-gaps` `r20-census-reach` | **0 FAIL / ALL OK each.** r14/r15/r16 ran **with** their differential worktrees present, so §7, §6.3 and §5.3 executed rather than skipping |
| 21 | `qa/r21-closure.mjs` | **1 FAIL — stale, not a finding.** §6 hardcodes `'NOT enumerated in Part 5'` at `:407-409`; `67f5588` enumerated all three. Routing **B-2** |
| 22 | **the whole headless board**, all 78 `qa/*.mjs` | Every FAIL is disclosed and reproduces at its documented count: `p2b-gate` 5 (P2-5, P2-8 ×2, §1.7, §2.1), `r2-constraints` 1 (R2-18), `r10-redo` 3 (R10-1), `r3-cas2` 3, `r3-pool` 3, `r5-freshness` 4, `r6-actor` 5, `r7-r6recheck` 3, `r6-flush` 1, `r8-geo` 1, `r8-persist` 1, `r9-ledger` 2, `r21-closure` 1. **One undisclosed defect: `r11-recheck` crashes** — routing **B-1** |
| 23 | `qa/p2b-gate.mjs` §3.4, read in full | **400 undos accepted, 315 of 365 days still carry the city.** P2-5 reproduced on my own run — routing **BLD-1** |
| 24 | `qa/p2b-gate.mjs` §4.6, read in full | `ownerId` present → `ForeignDocumentError`; key deleted → **adopted as `local:self`**, 91 stops still `user:marta`, **0** ownership validation issues, 21/112 not rendering as the importer's own. P2-8 reproduced — routing **A-2** |
| 25 | `qa/r13-gate-citykey.mjs` §7 and §8 | Both **green**: no source comment claims 70, and the two `geo_outlier` label sites are distinguishable. **R13-4 and R13-5 are closed** — routing **B-4** |
| 26 | `node --test test/cli.test.ts` | **16/16**, including the four `cli export` escape refusals and *"the live planner is not writable through any cli command"* |
| 27 | `npm run web:build && node qa/r2-redact.mjs` | **0 KNOWN_LEAKS**; 3 hits, all `OPTIONAL`/`BOOKINGS` |
| 28 | `md5sum europe-2026-itinerary.html`; `git status --porcelain -- . ':(exclude)cairn'` | `7c69df3208ef91c8be0fb59a56443188`, unchanged; root diff **empty** |
| 29 | `grep` for the slug expression across `apps/` and `packages/` | one hit, inside `cityKey.test.ts`'s docstring explaining what was deleted. **The expression exists nowhere in product code** |
| 30 | `grep datePrecision` under `conflict/`, `derive/`, `validate/` | 0, 1, 0 — the one being `derive/summary.ts`, pinned as the single exemption by `datePrecision.test.ts:241`, which also asserts the exemption list cannot grow |
| 31 | `require('playwright')` | `Cannot find module`. **The Chromium half of the board could not run here** — stated in the status note rather than implied |

---

## For Jacob — 2a

**You can now record trips you have already taken, and the app stops nagging you about a trip you
have already been on.** That is step one of three in the current phase, and it is done.

Three things changed, and one of them you will feel immediately:

- **The app knows a trip can be over.** Your Europe trip ended on 22 August. Until now the app kept
  telling you, forever, that you were missing a hotel in Budapest — for nights you had already slept
  through. It no longer does. I checked this by running it: the two "missing lodging" warnings are
  gone, and your own two red flags for Aug 18 and Aug 20 are still there, which is exactly right —
  those are yours, and nothing of yours gets silenced.
- **There is a "record a past trip" form.** Title, roughly-when, and the cities. No day-by-day
  required. I entered *"Japan, March 2019 — 東京, 京都"* myself and it came back with **zero warnings
  and zero problems** — which is the whole point: a trip from seven years ago should be a record, not
  a to-do list.
- **"Roughly when" is recorded honestly.** If you only remember *March 2019*, the app stores that as
  March 2019 and says so on screen — it does not quietly claim you were there from the 1st to the
  31st.

**Nothing here is a stub.** I ran the tests (620, all passing), the type checker, the build, and 78
separate attack scripts myself rather than taking anyone's word for it.

**Two rough edges, both small, both now scheduled rather than floating:**

- **Undo, straight after recording a past trip, behaves badly.** If you record a whole *year* and
  then press Ctrl+Z, it peels the trip apart one day at a time and you cannot get all the way back.
  A month-long trip is fine, just fiddly. It was found nine rounds ago and quietly never got picked
  up; it is now assigned with a name on it.
- **The app assumes every day of a recorded past trip was in the first city you listed.** So *"Tokyo,
  Kyoto"* records 31 days in Tokyo and none in Kyoto. The form does tell you this before you press the
  button, which is the right instinct — but the next step is the *map of everywhere you have been*,
  and it will be built from exactly that data. So I have asked the architect to settle, before that
  map is built, how the app should tell the difference between *"I said I was in Kyoto"* and *"the app
  filled that in for me."* That is your own rule — never present our guess as your plan — applied one
  step ahead of where it would have bitten.

**One decision I would like from you, and it is not urgent.**

Right now, if someone sends you a trip file they exported, the app correctly refuses it as *"this
belongs to someone else."* But if that file happens to have no owner recorded in it, the app adopts
the whole thing as yours, and 91 of the activities in it stay quietly stamped with the other person's
name underneath. Nothing leaks and nothing breaks — but the app would be telling you the trip is
yours when it is not. **Do you want it to (a) refuse anything that is not provably yours, (b) accept
it but visibly badge the whole trip as imported from someone else, or (c) leave it as is until real
accounts exist in Phase 3?** I have blocked all friend-sharing and public-link work until this is
settled either way, so nothing is waiting on you today.

**Still open from Phase 1, unchanged:** the *"accept"* button question from last time is still sitting
unanswered. Not blocking anything.

**Next:** step 2b — the map of everywhere you have been, and a count of countries and cities derived
from your real trips rather than typed in. It is unblocked as of this verdict.

---
---

# Phase 1 review *(closed 2026-08-27 — kept for the record)*

> **Status: CLOSED.** Manager, stage 4. Reviewed `master` @ `218c7f0`, 2026-08-27, Node v22.22.2,
> Chromium via the system Playwright over real elapsed time. **Verdict: SHIP. Phase 1 is closed.**
> Every claim below has a command in **Verified** that I ran myself, on this tree.
>
> The previous `REVIEW.md` (`82c1a4f`, SEND BACK on R11-1) is superseded by this document and is
> preserved in git history. Its routing is closed: **A-7 is ruled (ARCHITECTURE revision 8) and
> built (`218c7f0`), and I re-verified it against my own oracle rather than against the finding.**
> The two review items that rode with it — R8-4 and the *What rides* list — are unchanged and are
> carried forward below as disclosed Phase 2 entry items.
>
> **Superseded by the 2a verdict above only where they overlap:** its "Carried to Phase 2" lists are
> re-placed in 2a's routing table, and the probe-repair item it named was discharged by I-0 and has
> **re-accumulated** (2a routing B-1).

---

## Verdict: **SHIP** *(Phase 1)*

Phase 1 is done. The engine, the client state machine and the web client deliver what the brief
and ROADMAP §4.5 name, the one blocker that held the last gate is closed, and nothing else that
is open is a data-loss, privacy or wrong-person's-data path.

### R11-1 / A-7 is closed, and I proved it with my own probe, not with the builder's

The ruling (ARCHITECTURE §2.2a **A-7**, §4.2 rule 4a) is implemented exactly as written, both
mechanisms, in the two places the ruling names and nowhere else:

- `packages/client/src/store/store.ts:432` — `if (!stillOurs && toWrite !== startedFrom)` sits
  immediately after `stillOurs` (`:419`) and before the `set` at `:440`: it upserts the library
  row from the write's own summary, sets `'conflict'` with the existing `CONFLICT_MESSAGE`, and
  returns. No install, no fence advance, no re-arm, no `lastMerge`.
- `store.ts:657` — `if (state.doc !== doc)` at the top of `doMerge`'s `chainOntoSaving`
  callback, **inside** the link and before the `try`, so the wide half of the window (the
  IndexedDB read, `fromJSON`, `mergeTrips`, `toJSON`, and anything queued ahead on the chain)
  is closed without a write being attempted at all.
- The deleted-trip branch (`:620-629`) is **not** modified, which A-7's scope paragraph
  explicitly requires — R8-4 rides on its own reachability argument and was not folded in.

I did not take the fix on the tests that ship with it. I wrote my own probe
(scratch, not committed) reproducing the measurement I made at the last gate — gate `load()`,
type during the read, then the **real 400 ms debounce with no explicit `flush()`** — and the
same again gating `saveIfVersion`. Against `218c7f0`: the other tab's edit survives in storage,
`savedVersion`/`savedDoc` do **not** move, `status` is `'conflict'`, `isDirty()` is true, the
local edit is still in `doc`, and a second press of *Merge and save* converges on both writers'
edits. Against the same probe with `store.ts` reverted to `bcf2beb` in a scratch worktree:
**8 FAIL**, `stored title=""` with `status=idle` — the loss, with the chip on *Saved*. That is a
red/green on an oracle the builder did not write.

The two ceilings hold, which is what stops the fix being a regression: the ordinary merge still
installs, still advances the fence, still reads `'idle'` with a `lastMerge` notice (in Node
**and** in real Chromium — `qa/r7-browser.mjs` drives the merge through the UI and both tabs'
edits are in IndexedDB with the chip reading *Saved*), and an edit landing during an **ordinary**
autosave still advances the fence and still re-arms.

### The breaker stage, stated honestly

**No full breaker round ran against the A-7 diff.** A targeted re-verification did. I am the gate
and that is my call to make, so here is the reasoning rather than an assertion: rounds 8, 9, 10
and 11 each found the shipped ruling correct and one adjacent door open, so the base rate says
attack the neighbourhood. I attacked it myself instead of ordering a round — five adjacent doors
after an A-7 refusal, all with real timers and all asserted on stored bytes: `closeTrip` (rule 6b
aborts, nothing lost), two `undo`s (storage intact), five further edits (every later autosave
refused by the fence), a **third** writer landing inside the merge window (not clobbered, the
conflict stands), and a concurrent merge against a concurrent write (no state where both edits
are gone). All clean. Plus the whole standing probe board, the 200-step dirty walk under three
seeds, and the full suite.

The residual risk is real but bounded: A-7 only ever *refuses*, in one branch, and its two
failure modes are "still loses data" (falsified twice, independently) and "over-refuses"
(falsified in Node and in a browser). I am not sending a phase back for a ceremonial round after
red/greening the fix on my own oracle. **Trigger, written down rather than left implicit: Phase
2's first breaker round takes `doMerge`/`writeAndSettle` as a named target**, because that is
where R3-3, R7-1, R8-4, R10-3 and R11-1 all lived.

---

## Routing — Phase 1

**Nothing is routed for Phase 1. Do not open a builder, breaker or architect task against this
verdict.** The items below are Phase 2 *entry* items, listed so nobody re-derives them, each
already disclosed by the agent that found it.

### Carried to Phase 2 — architect, at the point named, not now

- **R8-3** (MAJOR, unreachable today). Accepting a copied stop can *replace* the `adjacent_day`
  anchor and mint a `geo_outlier` blocker on a stop the user wrote. It violates A-1's
  monotonicity claim. **Trigger: it must be ruled on before any `acceptCandidate` control ships
  in `apps/web`** — and shipping that control is the cheap Phase 2 item Jacob may pull forward,
  so these two move together.
- **R8-4** (MAJOR, unreachable today). `doMerge`'s off-chain `load()` at `:612` lets a merge
  already in flight resurrect a trip the delete link just removed. A-7 deliberately did not
  reach it (its scope paragraph says so). **Trigger: whenever `deleteTrip` becomes reachable
  with a trip open, or when the `SyncPort` gives `load()` a second source.**
- **R10-1** (MINOR). Two Ctrl+Z's make A-5b clause 2 decline; either bless clause 2 or extend
  the rule. The render is identical to the one the user was already looking at.

### Carried to Phase 2 — breaker, before its first round

- **Probe repair, now five rounds overdue.** `qa/r6-flush.mjs` §6's static check and
  `qa/r7-chain.mjs`'s hardcoded structural counts report stale assertions, not defects;
  `qa/r5-freshness.mjs:602`, `qa/r2-copy2.mjs:86` and `qa/r2-import.mjs:51` are dead. Their
  FAIL counts are load-bearing in every status note in `QA-FINDINGS.md`, so a stale one costs a
  future round real time. Repair them in a commit of their own, or strike them.
- **`QA-FINDINGS.md`'s R11-1 row still records the window as *"the merge write is in flight"***.
  The authoritative statement is now ARCHITECTURE §2.2a A-7 (whole of `doMerge`); the QA row is
  the record of a closed finding and understates it. Correct it when you next touch the file.

### Carried to Phase 2 — builder, in the next pass that touches the file

- **`BUILD-NOTES.md` §4's table is stale in two rows**: *"Tests 387 pass"* (now 432) and
  *"Export surface 69 runtime symbols = §2.10's 69"* (now **70**, since A-5 added
  `reassertRetirements`). The status note at the top supersedes it and `cairn/CLAUDE.md`'s doc-cost
  map warns readers to check that note first, so this is disclosed debt rather than a false
  claim — but a number that is wrong on its face is worth one line to fix. No KD entry was added
  for A-7; none was owed, because the code matches the ruling with no divergence, and the status
  note carries the disclosure §1 exists for.

### What ships as a known, non-blocking limitation

Each is real, each is disclosed by the design or by an agent, none blocks the phase:

- **`acceptCandidate` is reachable from no control in `apps/web`**, so a copied stop stays badged
  *from a friend* forever. It fails safe — nothing of anyone else's is ever presented as Jacob's
  own — and ROADMAP §4.5's may-not-be-stubbed list does not name it. **Jacob's call** (below).
- **§6.6's stated cost:** the shipped sample is still recognisably Jacob's trip. Credentials are
  stripped by rule and the build is verified clean; personal prose is deliberately not stripped.
  Already a Phase 2 exit condition — the day a public host serves this build, the sample must be
  an invented trip.
- **A passively stale tab still reads "Saved"** (BUILD-NOTES §6). It holds an older document and
  nothing notifies it; its next write is refused, so no edit is at risk. Closing it properly
  needs cross-tab notification, which Phase 1 does not have.
- **The round-7 MINOR list** — R5-3, R5-4, R3-6…R3-9, R2-13…R2-21 and the five `r6-actor`
  residuals — unchanged and re-run this pass at exactly their disclosed counts.
- **Unverified environments, named rather than implied:** Safari and iOS (everything was driven
  in Chromium), real IndexedDB under quota exhaustion, map tiles (this sandbox has no route to
  `tile.openstreetmap.org`), `crypto.getRandomValues` over plain HTTP from a LAN address, and
  Node 24 (this environment is Node 22.22.2; `engines` says `>=22.18`).
- **Phase 2 scope by design:** RLS enforcement, sync, real friends, share revocation.

---

## Verified — Phase 1: what I ran, and what happened

All from `/home/user/europe-2026-planner`, `master` @ `218c7f0`, in sync with `origin/master`.
`git status --porcelain` was **empty** before and after; `md5sum europe-2026-itinerary.html` =
`7c69df3208ef91c8be0fb59a56443188` before and after. The read-only boundary held through the full
suite, a web build, two Chromium sessions and ~30 probe runs.

| # | Command | Result |
|---|---|---|
| 1 | `npm run test:tap` | `# tests 432 · # pass 432 · # fail 0`, zero `not ok`. **BUILD-NOTES' number is accurate** |
| 2 | `npm run typecheck` | exit 0, both projects; `pretypecheck` regenerated the redacted sample first |
| 3 | `git diff --stat bcf2beb..218c7f0` | **5 files**: `store.ts` (+33), `merge-race.test.ts` (+223), and the three docs. **Exactly what A-7 authorized — no other product file moved** |
| 4 | read `store.ts:419-458`, `:609-682`; `grep -n 'writeAndSettle('` | Both A-7 mechanisms present, in the ruling's two places; the deleted-trip branch at `:620-629` **untouched** (R8-4 not folded in); three call sites, only `:667` has `startedFrom !== toWrite` |
| 5 | `node --test packages/client/test/merge-race.test.ts` | **12 pass / 0 fail**. The six new tests map 1:1 onto A-7's table of six and every one asserts on `core.fromJSON(<the port's bytes>)` |
| 6 | same file against `store.ts` reverted to `bcf2beb` (scratch worktree) | **exactly 4 fail** — cases 2, 3, 4, 5 — and the two ceilings pass either way, which is correct. **The builder's red/green claim is true and the tests are aimed at the real defect** |
| 7 | **my own probe**: gate `load()`, dispatch during the read, **real 400 ms debounce, no explicit flush**; then the same gating `saveIfVersion` | **0 FAIL.** `stored title="OTHER TAB"`, `savedVersion`/`savedDoc` unmoved, `status=conflict`, `isDirty()=true`, the local edit still in `doc`, and a second press converges on both edits |
| 8 | the same probe against `bcf2beb`'s `store.ts` | **8 FAIL** — `stored title=""` with `status=idle`. The loss reproduces on my own oracle and is closed by this fix |
| 9 | **my own adjacent-door probe** after an A-7 refusal: `closeTrip`, two `undo`s, five further edits, a **third** writer inside the window, a concurrent merge vs. a concurrent write | **0 FAIL.** Rule 6b aborts the transition with nothing lost; storage never regresses; every later autosave is refused by the fence; the third writer is not clobbered |
| 10 | `node qa/r11-recheck.mjs` | **0 FAIL** (was 2, both R11-1). §1.3b — the zero-undo control — now reports `stored title="OTHER TAB" status=conflict` |
| 11 | probe board, all my own runs | `r3-undo` `r3-loss` `r4-switch` `r2-copy` `r3-merge` `r2-resolutions` `r2-data` `r2-access` `r10-mergeundo` `r10-prune` `r9-geo` = **0 FAIL each**; `r10-redo` 3, `r9-ledger` 2, `r8-geo` 1, `r8-persist` 1, `r7-chain` 2, `r6-flush` 2, `r3-pool` 3, `r3-cas2` 3, `r6-actor` 5, `r2-constraints` 2 — **identical to the disclosed board. No undisclosed FAIL anywhere, no regression in the previously-closed chain** |
| 12 | `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r8-views.mjs` | **0 FAIL, zero page errors**, my own Chromium run. Aug 8 renders `departs 14:30 · 1h 20m · arrives 15:50`; an `unknown` stop's control dispatches; the Optional panel and stop editor render *from a friend* **and** *From "Europe 2026"*; a dismissed conflict comes back **live**; the *Not saved* banner offers Retry and Export this copy. **B-1, B-2, B-3 still real** |
| 13 | `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r7-browser.mjs` | **0 FAIL.** The merge driven through the real UI keeps **both** tabs' edits in IndexedDB and the chip reads *Saved*, at four press gaps. **A-7 does not over-refuse the ordinary merge in a browser** |
| 14 | `CAIRN_WALK_SEED={1,4242,20260827} node --test packages/client/test/dirty.test.ts` | 15 pass / 0 fail each. The 200-step oracle walk (`isDirty() === (toJSON(doc) !== the port's bytes)`) still holds under A-7 |
| 15 | `npm run web:build` | clean |
| 16 | `npm run web:build && node qa/r2-redact.mjs` | **0 KNOWN_LEAKS.** 3 hits over 108 derived tokens, all `OPTIONAL`/`BOOKINGS` — KD-27's two named non-credentials. No PIN, no reference, no ticket URL in `dist/` |
| 17 | `Object.keys()` on `packages/core/src/index.ts` | **70 runtime symbols** — §2.10 and criterion E agree. A-7 added none, as specified |
| 18 | `node cli.ts trip` / `node cli.ts conflicts` | `16 days · 112 scheduled · 31 pooled · 95 places · 21 bookings`; `2 blockers, 4 warnings, 11 notes`; `1 error, 10 warnings`. Both blockers are `legacy_flag` — Jacob's own Aug 18 and Aug 20 flags. **No third blocker after five rounds of copy-path rulings** |
| 19 | `grep -rn 'acceptCandidate\|deleteTrip' apps/web/src --include=*.tsx` | `deleteTrip` only at `Library.tsx:101`; `acceptCandidate` **nowhere**. R8-3's and R8-4's unreachability claims still hold, on my own evidence |
| 20 | `git status -sb`, `git worktree list` | `master...origin/master`, in sync, no feature branch. The work is on `master`, per `CLAUDE.md` |

---

## For Jacob — Phase 1

**Phase 1 is done.** Open a browser and you get your real Europe trip, plus any number of other
trips: create one, switch between them, edit days and stops, see them on a map, copy an activity
out of one trip into another with the *"From Europe 2026"* credit following it everywhere it
appears, and get a conflicts panel and a validation report the current HTML page cannot give you.
The conflicts panel shows exactly two things you have to act on — your own Aug 18 and Aug 20 red
flags — and it took five rounds of design rulings to keep it honest at two rather than letting the
app cry wolf.

**The one thing that held it back last time is fixed, and I checked it the hard way.** There was a
moment where, if you had the trip open in two windows and kept typing during the fraction of a
second a merge took, the app could throw away the other window's saved work and still say *Saved*.
It now stops, keeps your typing on screen, tells you the trip was edited elsewhere, and one more
press of *Merge and save* brings both sides together. I reproduced the old bug myself, watched my
own test fail against the old code and pass against the new, and then went looking for four more
ways to reach the same loss around it. None of them worked.

**Nothing here is a stub pretending to be finished.** What is deliberately not built is written
down: no accounts, no server, no sync, no phone app, no email scanning — those are Phases 2 to 4
and always were.

**Two things worth knowing, and one is a decision only you can make.**

- **Decision: do you want an "accept" button before Phase 2?** Today, when you copy an activity
  from one of your trips into another, it stays labelled *from a friend* forever — there is no
  control that says "yes, this is mine now". That is the safe direction (nothing of anyone else's
  is ever shown as yours), but you will notice it the first time you use the feature. It is
  cheap to add, and adding it also forces one small design question we have already written down
  and parked. Say the word and it comes forward; otherwise it ships with the accounts work.
- **The demo trip is still recognisably yours.** Door PINs, booking references and ticket links
  are stripped by a rule with a test behind it, and I re-verified the build is clean today. Your
  prose is not stripped, on purpose, while this only runs on our machines. The day it serves a
  public page it has to become an invented trip — that is already written down as a Phase 2 exit
  condition, not something that can be forgotten.

Next up is Phase 2: accounts, a server, sync between your devices, and friends being able to open
your trip from a link. Phase 1 is closed and shipped.
