# Cairn — QA findings, Phase 1 **rounds 2–11** and Phase 2 **rounds 12 (2a), 13 (I-3a / I-4a), 14 (A-11…A-14), 15 (A-15…A-17) and 16 (A-18 / A-19)**

> **Status (as of `claude/i4a-r14-issues-f0bkgc` @ `bff7a81`, independently verified 2026-08-28
> — round 16, the mandatory breaker pass over the builder implementation of ARCHITECTURE
> revision 14's **A-18** and **A-19**, plus the four findings QA round 15 routed straight to a
> builder (**R15-1**, **R15-2**, **R15-4**, **R15-5**)):**
>
> | | |
> |---|---|
> | **Scope** | Exactly `b3a0c89..bff7a81`: `build/copyStop.ts` (`redacted`, `costForCopy`, `arrivalForCopy`, `weeklyForCopy`, `hoursForCopy`, A-19's three parts, three de-spread sites no finding named), `model/types.ts` (the new `place_hours_malformed` code), `validate/validateTrip.ts` (`wellFormedHours` + one `push`), `test/copyStop.test.ts` and `test/horizonGate.test.ts`. R13-4, R13-5, P2-5, P2-8, R2-18 and the Phase 1 list were **not** re-litigated. |
> | **BLOCKERS** | **0.** Both of round 15's blockers close, verified by running rather than by reading the diff. **R15-3**: a `cost.note` of *"paid with card, conf 5814731574"* and an `arrival.label` of *"Bus 8, booking GYGG45MLA9Q9"* now cross as *"paid with card, [redacted]"* and *"Bus 8, [redacted]"*, with zero `redactionHits` and neither number greppable in the recipient's `toJSON` — and the redaction is **not a wipe**: an ordinary note, label and display cross byte-identical. **R15-1**: **34** `hours` shapes through the live `fromJSON` route, including nested-object `weekly` entries, an array-like `weekly`, `__proto__` as a data key and a 500-entry array — **0** carry a credential and **0** throw. |
> | **Fixed vs still open** | **CLOSED by this pass and re-verified independently:** **R15-1**, **R15-2**, **R15-3**, **R15-4**, **R15-5**, **R15-6** — all six. With round 15's own closures (R14-1, R14-2, R14-3, R14-4), **the entire R14/R15 chain is closed**. `qa/r15-place-copy.mjs` is at **0 FAIL** after QA re-expressed its three stale lines (below). **STILL OPEN, new this round:** **R16-1** and **R16-2**, both MINOR, both to a builder; plus one **ratification** item for the architect (`place_hours_malformed`, §"The one thing an architect has to ratify" below). **STILL OPEN, unchanged and not re-litigated:** R13-4, R13-5, P2-5, P2-8, R2-18, and the whole Phase 1 list (R10-1, R8-3, R8-4, R6-1/2, R5-2, R11-1). |
> | **1. A-18 — PASS, including where the ruling only argued** | The seven `CostEstimate`/`MoveOverride` rows are implemented as ruled and I could not break any of them. The `display` predicate holds at six edges (a plain price, `''`, a space-grouped six-digit price, a price with a credential, a 6+ ALL-CAPS token, a sub-six-digit forint price). An **unclassified ninth key** is dropped from all four records the ruling enumerates — `CostEstimate`, `Money`, `MoveOverride` **and `Link`**. Redaction is **idempotent and stable across a copy chain**: A→B→C leaves `note`, `cost.note`, `arrival.label`, `display` and `hours` byte-identical at hop 2 and hop 1, with 0 credentials greppable. The two strings A-18 keeps verbatim by a *threshold-agreement* argument (`flags`, `Money.currency`) really are `STRUCTURAL_KEYS` in `tools/redact.mjs`, checked against the file and not against the prose; `label`, `open` and `close` really are not. |
> | **2. The `open`/`close` judgment call — SAFE, and measured** | The builder's disclosed call (a `weekly` entry whose `open`/`close` `redactText` would alter becomes `null`, not `[redacted]`) cannot corrupt a legitimate time: **all 240** `HH:MM`/`H:MM` strings in a 24-hour day, plus 12 near-miss formats a hand-written document might carry, are left byte-identical by `redactText`. Every shape that *is* altered (`PIN 0754`, `170000`, a URL, `YZGDTS`, `conf …`) was never a time. A well-formed entry beside a hostile one survives intact and the hostile one becomes `null` in place, so array positions are preserved. The residue is that the entry's `day` goes with it, silently — **R16-2**. |
> | **3. A-19 — PASS on all eight assertions** | The refusal throws a plain `Error` naming the key and the target id; the target is byte-identical behind it; and the **id factory is left unconsumed**, so a retry mints the same ids (not asserted by the ruling, and true). `TRANSIT_CITY_KEY` succeeds, lands in `unfiledPool`, is badged `imported` from the instant it exists and adds no issue; a key the target *does* have lands in `poolFor` with the same provenance stamp; a within-trip pool copy adds no issue. `''`, `'Transit'` and `' transit '` are all refused rather than folded into transit. The hint is dropped when unresolvable (key **absent**, not present-and-empty) and `scheduleFromPool` on the copy then succeeds through `pickDay`; a resolvable hint is preserved with `order`; an unclassified key on the hint does not travel. **No aliasing, from both branches**: mutating the source stop's own `placement` and `placement.hint` after a pool copy leaves the target byte-identical, and the same for the scheduled branch. |
> | **4. R15-4 and R15-5 — CLOSED, re-derived by mutation, not by reading** | Both were claims about *tests that cannot fail*, so both were re-verified in a throwaway `git worktree` at `bff7a81`. Moving `refileCityKey`'s step 2 above step 1 turns **exactly one** test red — `copyStop.test.ts:1510`, the new one (67 pass / 1 fail). Inverting `beyondHorizon`'s `subjects.every` to `.some` turns **exactly one** test red across the whole suite — A-17's own directional test, over the new `duplicate-stop-id-far` fixture (582 pass / 1 fail). Both mutations left the suite fully green at `bd195bd`. Ten mutations in total; the two that survive are R16-1 and its rider. |
> | **5. Numbers, my own runs at `bff7a81`** | `npm run test:tap` **583 pass / 0 fail** · `npm run typecheck` clean (both projects) · `npm run web:build` clean · `Object.keys(core).length` = **71**, with all seven of `placeForCopy`/`refileCityKey`/`costForCopy`/`arrivalForCopy`/`weeklyForCopy`/`hoursForCopy`/`redacted` module-private · reference trip **2 / 4 / 11** at `FIXTURE_TODAY` · `validateTrip` **11** issues, **not 12** — `place_hours_malformed` does not fire, because **0 of the reference trip's 95 places carry `hours` at all** · `npm run golden` + `npm run sample` regenerate byte-identically, sample sha unmoved at `40955ca0b182`, tree clean apart from my two QA files · `qa/r14-horizon-copy.mjs` **ALL OK** · `qa/r2-copy.mjs` **0 FAIL** (§H included) · `qa/prov.mjs` **0 FAIL** · `qa/r15-place-copy.mjs` **0 FAIL** · `qa/r2-constraints.mjs` **1 FAIL** (R2-18, known). Every number in the builder's addendum reproduces **except one**: its "Red before green" row claims *spreading `links` (1 red)*; the measured number is **0**. That is R16-1. |
> | **6. Byte-identity, re-derived rather than trusted** | Against a `git worktree` at `b3a0c89`: an **ordinary** copy — a reference-trip-shaped stop with no `cost.note`, no `arrival.label`, no place `hours`, a plain `display` and one link — is **byte-identical** to pre-A-18. And on the reference trip itself, **0 of 51** non-empty `cost.display` strings are altered by `redactText` and 0 stops carry a `cost.note` or an `arrival.label`, so A-18 drops no real price and has no live exposure. `copyStop.ts` contains **no `as string`** and, comments stripped, **exactly one** spread — `{ ...target }`, the recipient's own document. Both of BUILD-NOTES' greppable claims hold, once you strip the comments that quote the constructions the ruling forbids. |
> | **7. The disclosed residue, measured on real data rather than argued** | A-15/A-18 let a `Stop`'s `links` travel (`qa/r2-copy.mjs` §H pins it) and A-18 explicitly does not change that policy. Measured: **34** of the reference trip's stops carry links, and **0** of those 34 hrefs carry a reference-shaped token (`[A-Z0-9]{6,}` or a 6+ digit run) anywhere in path or query. The disclosed reopening trigger — *the day anything writes `Stop.links` from a source the user did not type* — has **not** fired: `importLegacyDays` is the only writer and it reads Jacob's own `book` field. Recorded so round 17 does not re-derive it. |
> | **`cairn-constraints`, re-checked** | Determinism (no `Date.now()`/`Math.random()`/`crypto.randomUUID()` in core or client), zero runtime deps (`{}` in the root and `@cairn/core`, `{"@cairn/core":"*"}` in client), no DOM/React under `packages/client/src` — all clean. **Round 15's §6 violation is closed**: `copyStopInto` no longer throws on any document shape. A-19's new throw is on an *argument*, which §2.1 classifies as programmer error, and it is the only new throw site. `redactText` is not ReDoS-able on the unvalidated strings that now reach it: 200 000 characters in ≤ 2 ms on four adversarial shapes. |
> | **Read-only boundary** | `europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo root: untouched. The only files this round writes anywhere are `cairn/qa/r16-copy-depth.mjs` (new), `cairn/qa/r15-place-copy.mjs` (three lines re-expressed, explicitly authorised) and `cairn/qa/README.md`. No implementation file, no test file, no `ARCHITECTURE.md`, no `ROADMAP.md`. |
> | **Gate verdict** | **A-18 and A-19 both close, and with them the whole R14/R15 chain — R14-1, R14-2, R14-3, R14-4, R15-1, R15-2, R15-3, R15-4, R15-5, R15-6.** The credential leak round 2 filed as R2-3 and round 14 re-filed as R14-4 is finally closed on **every** carrier the four rounds found: `Stop.note`, `Place.note`, `Place.links`, `Place.hours.note`, `Place.hours.weekly`, `Stop.cost.note` and `Stop.arrival.label`. The copy path is now the same shape as §6.6's sample path — enumerate to a scalar, redact what is not structural, refuse what has no honest unknown — and I could not find a string that crosses it unclassified. **The two findings that survive are both MINOR and neither blocks a share or friend path**: one is a test that cannot fail on a construction with no live carrier, the other is a warning that does not fire on all the documents it was added to describe. |
>
> **New probe this round:** `qa/r16-copy-depth.mjs` (headless, **2 FAIL by design** — R16-1 ×1,
> R16-2 ×1; every other line is a confirmation that must stay at 0). Deterministic call sequences
> only, no races and no sleeps. §5.3 is a differential and prints `skip` without
> `git worktree add /tmp/r16-pre b3a0c89`. Nothing under `cairn/` is ever written by it.
>
> **`qa/r15-place-copy.mjs` is now at 0 FAIL, and three of its lines were re-expressed to get
> there** — A-19 assertion 7 says in writing that the builder does not edit anything under `qa/`,
> so this was QA's job and this round did it. §3.4 asserted against a document A-19 now refuses to
> return and is a `throws` assertion now, with the two legal keys measured beside it. §3.2's R15-4
> line and §5.1's R15-5 line were literal `ok(..., false, …)` — statements about a gap in the
> *shipped suite*, which no product change could ever turn green — and now point at the tests that
> closed them, each **mutation-verified in a scratch worktree first**. The probe's remaining count
> reflects only genuine defects.
>
> **The round-15 status note below is superseded by this one** and is kept as the record of what
> was true at `bd195bd`.

## Round 16 — A-18 / A-19 + R15-1 / R15-2 / R15-4 / R15-5 (`claude/i4a-r14-issues-f0bkgc` @ `bff7a81`)

Every row was produced by running the repro, not by reading the diff. Routing says *builder* when
the code or its test diverges from a sound ruling, and *architect* when a decision was made that
no ruling covers.

| id | severity | file:line | defect | repro | routing |
|---|---|---|---|---|---|
| **R16-1** | MINOR | `packages/core/test/copyStop.test.ts:1281`–`1295` × §2.14 A-18 position 2 | A-18's mechanical stop is the key-set assertion forced against a **hostile** source — *"so the assertion catches a re-introduced spread and not only a deleted field"*. The hostile source populates an unclassified key on `cost` and on `arrival` and **not on `links`**, so the fifth row of the assertion (`Object.keys(copy.links![0])` vs `LINK_FIELDS`) runs against a two-key fixture link and is `{label,href}` whatever the construction. Measured in a scratch worktree at `bff7a81`: reverting the `links` line to `{ ...l }` leaves **583/583** tests green **and** `qa/r2-copy.mjs` at 0 FAIL. BUILD-NOTES' own "Red before green" row claims *"spreading `links` (1 red)"*; the measured number is **0**, which is a disclosure error as well as a coverage gap. No live carrier today — `fromJSON`'s `parseLinks` rebuilds every `Link` as `{label, href}`, so a third key needs a hand-built in-memory document — which is why this is MINOR and not the R15-1 it structurally resembles. **Rider, same class:** restoring `redactText(p.note) as string` in `placeForCopy` also leaves 583/583 green, so A-18's *"`redacted()` replaces every `as string` in this file"* is unpinned too; harm is nil for the same reason (`parsePlace` validates `note` with `str()`), but it is the cast the ruling named as the mechanism R15-1 crossed through. | `node --experimental-strip-types qa/r16-copy-depth.mjs` §1.2 | **builder** — the ruling and the code are both right; the fixture is not. Adding `links: [{label, href, eleventh: '…'}]` to the existing `hostile` object at `:1281` is a one-line change that turns the mutation red. |
| **R16-2** | MINOR | `packages/core/src/validate/validateTrip.ts:406`–`417` (`wellFormedHours`) × `packages/core/src/build/copyStop.ts:157`–`164` (`weeklyForCopy`) | The two guards landed in the **same commit** and hold **different** definitions of a well-formed `weekly` entry, so the new `place_hours_malformed` does not fire on every document whose hours the copy silently discards. `weeklyForCopy` additionally requires `Number.isFinite(day)` and an `open`/`close` that `redactText` leaves byte-identical; `wellFormedHours` requires only `typeof day === 'number'` and `typeof open === 'string'`. Three shapes measured as dropped-and-unwarned: `close: '170000'`, `open: 'https://vendor.test/x'`, `open: 'YZGDTS'`. In each, the recipient's `weekly` entry becomes `null` — indistinguishable from *"this day is unknown"*, which is `OpeningHours`' own documented meaning — and **neither** document says anything. That is exactly the sentence the new IssueCode was added to satisfy: BUILD-NOTES calls it *"what says so to the user before they wonder where their hours went"*. Bounded to MINOR because none of the three is a plausible legitimate opening time (verified: all 240 `HH:MM`/`H:MM` strings in a day and 12 near-miss formats are untouched by `redactText`, so a real time is never dropped) and because the reference trip has no `hours` at all. The reverse direction — a warning where the copy loses nothing but a non-string `hours.note` — is over-reporting, and is not a defect. | `qa/r16-copy-depth.mjs` §2.3 | **builder** for the mechanism (one predicate, one place, called by both — `weeklyForCopy` returning `null` for a redaction reason is a *copy-boundary policy* and should be distinguishable from *malformed*), and **architect** for the ratification question below, which is the same finding read one level up. |

### The one thing an architect has to ratify, and my recommendation

The builder added **`place_hours_malformed`** (a new `IssueCode`, level `warn`, `ref:{kind:'place'}`)
without a ruling, disclosed it in BUILD-NOTES as *"the one thing in this pass an architect has to
ratify"*, and marked it in `types.ts` as not being in §2.9's printed list. Two questions, answered
separately because they have different answers.

**Is it safe as shipped? Yes — measured, not assumed.** The reference trip is unmoved at **11**
`validateTrip` issues and **2/4/11** conflicts, because 0 of its 95 places carry `hours`.
`validateTrip` is still deterministic and still never throws on any of the 34 `hours` shapes.
`Object.keys(core).length` is still 71 and the goldens and sample regenerate byte-identically.
The `Issue` obeys every contract §2.9 and R13-7 impose: `warn` (not `error`) for *"shaped oddly"*,
a resolvable `{kind:'place'}` ref, structured `params`, a message that names the place rather than
an opaque id, exactly one per malformed place rather than one per entry, and none at all on a
well-formed `hours`. And **nothing in the repo switches exhaustively on `IssueCode`** — no
`Record<IssueCode, …>`, no `switch (issue.code)` in `packages/client`, `apps/web` or `cli.ts` — so
an unratified code cannot render as `undefined` anywhere. Typecheck is clean.

**Does it need ratification anyway? Yes, and for a bigger reason than the printed list.** The
bookkeeping half is real but small: §2.9's list already lags the type by A-10's three codes, so
this is drift joining existing drift, and it should be swept in one pass rather than argued about.
The substantive half is R16-2 read one level up. There are now **three** independent answers in
this repo to *"what is a well-formed `OpeningHours`"* — `serialize/fromJSON.ts:294` (a raw cast,
i.e. *anything*), `validate/validateTrip.ts:406` and `build/copyStop.ts:157` — and no two of them
agree. Round 15 routed R15-1 to a builder with the instruction *"and `parsePlace` should validate
`hours` the way it validates every other field"*; A-18 then ruled that the pass *"changes nothing
in `fromJSON`"*, and the builder, correctly obeying the ruling, closed the two symptoms with two
new predicates instead of the one cause. So the parser gap that produced **both** R15-1 and R15-2
is still open, and the compensating guards were written independently and diverge. That is a
design question — *refuse at the parser, or accept and warn?* — with an A-10 precedent on each
side, and it is exactly the class §2.9 reserves for the architect.

**Recommendation: ratify it as shipped — do not revert it, and do not block on it.** It is a
correct, well-formed, defensive addition that measurably moves nothing, and it answers the half of
R15-2 that said *"nothing warns the user first"*. But ratify it in a ruling that also decides
whether `parsePlace` validates `hours`, because if it does, both `wellFormedHours` and
`weeklyForCopy`'s structural half become dead code and R16-2 closes with them. I could not
substantiate any severity beyond MINOR for the divergence itself, and I am not inventing one.

### What I attacked and could **not** break (round 16)

- **A-18's redaction, in both directions and down a chain.** Six `display` edges, an unclassified
  key on all four enumerated records, a two-hop copy chain (A→B→C) whose `note`, `cost.note`,
  `arrival.label`, `display` and `hours` are byte-identical at both hops with 0 credentials
  greppable, and `redactText` proved idempotent on its own output. An ordinary note, label and
  display cross **byte-identical** — a rule that redacts everything passes the credential
  assertion and is wrong, and this one does not.
- **`Place.hours`, past round 15's six shapes.** 34 shapes through the live `fromJSON` route:
  nested-object `weekly` entries, two levels of nesting, an entry that is an array, a string, a
  number, `true`, `{}`, missing `close`, a string `day`, `1e999` and `-1e999` as a `day`, a
  fractional and an out-of-range `day`, a numeric and an object `open`, `__proto__` as a data key,
  a `constructor` key, an array-**like** `weekly`, a second `weekly` nested under another key, a
  numeric/object/credential `hours.note`, and 500 entries half of them hostile. **0 threw, 0
  leaked, and `Object.prototype` is unpolluted.** The copy's own output is always a well-formed
  `OpeningHours`, so the recipient inherits no warning.
- **A-19 from every side I could find.** All eight builder assertions, plus three the ruling does
  not make: the id factory is unconsumed behind the refusal; `''`, `'Transit'` and `' transit '`
  are refused rather than folded into transit; and an unclassified key on the `hint` does not
  travel. The aliasing check was run from the *source stop's own* placement — A-19's own "copy it
  where it already sits" call — and from a caller-owned scheduled placement, mutating both
  afterwards.
- **The two mutation findings, re-derived rather than trusted.** Ten mutations in a scratch
  worktree at `bff7a81`, each reverted. The counts are in `qa/README.md` so round 17 does not
  re-derive them. Only two survive the suite, and both are R16-1.
- **The ceilings, the differential and the boundary.** 71 exports with all seven new helpers
  module-private; 2/4/11 and 11 `validateTrip` issues; goldens and sample byte-identical; an
  ordinary copy byte-identical to `b3a0c89`; `npm run web:build` clean; repo-root planner, `docs/`
  and `tickets/` untouched.
- **`cairn-constraints`.** Determinism, zero runtime deps, no DOM/React in `packages/client`, and
  §6's throw discipline — all clean. Round 15's one violation is closed. `redactText` is not
  ReDoS-able on the now-unvalidated strings that reach it (200 000 chars, ≤ 2 ms, four shapes).
- **A sensitive-path sweep over the diff.** No `console.`, `fetch(`, `localStorage` or
  `process.env` anywhere in `copyStop.ts`; the new `Issue` carries a place name and a place id and
  no coordinate, no note and no `hours` content, so it adds nothing to R2-18's class.

### Confirmed by design, recorded so nobody re-derives them (round 16)

- **A `cost` with `amounts: []` and a credential-shaped `display` crosses as no price at all.**
  A-18 argues the `display` hole is *filled* because `costLabel` derives the figure from
  `amounts`; with `amounts: []` — which `fromJSON` accepts — there is nothing behind it. §6.6
  redacts the same string on the sample path, so the two thresholds still agree, and this is the
  disclosed residue of the ruling rather than a divergence from it. Not filed.
- **A placement whose `kind` is out of the union is silently coerced into a pool placement with
  `cityKey: undefined`, past A-19's own city check.** A-19 part 2's two-armed ternary makes the
  else-arm the pool branch; before this pass `addStop` stored the caller's object as given. It is
  unreachable from TypeScript (`StopPlacement` is a discriminated union) and §2.1 calls an
  out-of-union argument programmer error either way, and `validateTrip` does report the result as
  `pool_stop_unknown_city`. Recorded, not filed — it becomes a finding the day an untyped caller
  exists.
- **`Money.currency` is unvalidated free text that crosses verbatim.** `fromJSON` checks only
  `str()`, and `costForCopy` copies it as *"an ISO code"*. It is a `STRUCTURAL_KEY` in
  `tools/redact.mjs`, so §6.6's sample path does not redact it either — the same
  threshold-agreement argument A-18 makes for `flags`, checked against the file rather than the
  prose. Not filed, and named here so round 17 does not re-derive it.
- **`Stop.name` is the one disclosed *disagreement* between the two thresholds**, not an
  agreement: `redactStop` runs it through `redactText` on the sample path and `copyStopInto` does
  not. A-18's measurement reproduces exactly — 4 of 143 stop names altered, all four false
  positives (three timetable designators, one bar name), 0 credentials; and 0 of 95 `Place.name`s.
  Architect-blessed in A-18's own words. Not filed.

> **Status (as of `claude/i4a-r14-issues-f0bkgc` @ `bd195bd`, independently verified 2026-08-28
> — round 15, the mandatory breaker pass over the builder implementation of ARCHITECTURE
> revision 13's **A-15**, **A-16** and **A-17**, plus the mechanical **R14-3**):**
>
> | | |
> |---|---|
> | **Scope** | Exactly `3409420..bd195bd`: `build/copyStop.ts` (`placeForCopy`, `refileCityKey` step 2, the `PlaceLink` clone), `conflict/rules/types.ts` (comment only), `test/copyStop.test.ts`, `test/horizonGate.test.ts` and `qa/r14-horizon-copy.mjs`. Round 14's own open list was re-derived only where this diff claims to close it. R13-4, R13-5, P2-5, P2-8 and the Phase 1 list were **not** re-litigated. |
> | **BLOCKERS** | **2, both the same harm class as R14-4 and both still open.** **R15-1** — `placeForCopy` still spreads the source: `hours.weekly.map(w => ({...w}))` carries *every* key a `weekly` entry actually holds, and `fromJSON` casts `place.hours` unvalidated, so a door PIN, a confirmation number, a mailbox address and a vendor voucher URL land in the recipient's document through `hours` exactly as they used to land through `note`. A-15's own words — *"there is no remaining spread of a source `Place` into the target document; a builder who leaves one has not landed this ruling"* — name the defect. **R15-3** — `Stop.cost.note` and `Stop.arrival.label` are the same class of free text on the same path and cross **verbatim**; §6.6's sample path redacts both, §2.14 rules 3 and 5 copy both. That is the exact fail-closed / fail-open asymmetry A-15 calls *"the finding"*, applied to `Place` and not to the `Stop` beside it. |
> | **Fixed vs still open** | **CLOSED by this pass and re-verified independently, by running rather than by reading the diff:** **R14-4** for the three fields the ruling enumerates (`note` redacted and *not* wiped, `links` absent rather than emptied, `hours.note` redacted, `at` cloned, key-presence rules exact, reuse branch untouched, all four credentials un-greppable) — but **not** for `hours.weekly`, which is R15-1; **R14-2** (A-16's four steps behave as ruled on every shape I could build: two same-named cities, blank name, unresolvable key, stale source in both directions, the coincidental cross-document key, same `.id` different object byte-identical, determinism); **R14-1** (A-17 changed no code — `detectConflicts` is byte-identical to `3409420` at seven clocks — and the probe edits are the two the ruling authorises); **R14-3** (the clone holds from both directions, and every neighbouring alias is already fresh). **STILL OPEN, new this round:** **R15-1** (BLOCKER, builder), **R15-3** (BLOCKER, architect), **R15-2** (MAJOR, builder), **R15-4**, **R15-5**, **R15-6** (MINOR). **STILL OPEN, unchanged and not re-litigated:** R13-4, R13-5, P2-5, P2-8, R2-18, and the whole Phase 1 list (R10-1, R8-3, R8-4, R6-1/2, R5-2, R11-1). |
> | **1. A-15's field table — PARTIAL** | The seven-row table is implemented exactly for six of its rows, and I could not break any of them: a credential-shaped note redacts to `[redacted]` with zero `redactionHits`, a *non*-credential note (`"entrance is on the north side"`, a street number, a year, `"the booking is done"`, 5 000 characters of prose, Unicode prose) crosses **byte-identical**, an absent `note`/`hours` is not invented, a `null` `at` stays `null`, `links` is **absent** and not emptied, and the reuse branch keeps the target's own row. Over-redaction is bounded to the three shapes §6.6 already discloses as over-broad (a 6+ letter ALL-CAPS word, a bare URL, a spaced phone number). The seventh row — `hours` — is where it fails, and it fails *because* the ruling's table reasons about the `Place` **type** while `fromJSON` lets the **document** carry something else. |
> | **2. A-15's mechanical stop — real, and it measures the wrong layer** | `PLACE_FIELDS: Record<keyof Place, true>` does fail `typecheck` on a ninth field, and the key-set test does fail when a classified field goes missing. Mutation-tested: letting `links` through fails 2 tests, skipping `redactText` on `note` or on `hours.note` fails 1 each, aliasing `at` fails 1, reverting R14-3 fails 1, inventing an absent `note` key fails 1. But the guard is over `keyof Place` — one level deep — and the leak is one level below that, inside `weekly`, where nothing is enumerated and nothing is validated on the way in. |
> | **3. A-16 — PASS, on behaviour** | All five builder assertions reproduce, plus the shapes the ruling names as new-and-uncovered. The stale source falls to name matching and then to step 3 and mints **no new** `unknown_city_key`; `fromJSON(toJSON(t))` as the source is byte-identical to the same-object call (the assertion that fails under `===`); two different documents sharing `city-1` do **not** match; a blank-named city keeps the link within one trip and still takes step 3 across two. Mutation-tested: dropping the same-document conjunct, using `===`, and reading the key from `source` instead of `target` each turn exactly one test red. A trip-id collision between two library documents — the coincidence step 2 would misread — is **not reachable**: `importDoc` re-mints a colliding id before it lands. |
> | **4. A-17 — PASS on the code, PARTIAL on the test** | No code changed, and I confirmed it rather than reading it: `detectConflicts` on the reference trip is byte-identical to `3409420` at seven clocks. The `Rule` obligation is asserted and is not vacuous — deleting `unbooked_ticketed`'s `{kind:'day'}` subject turns A-11(3), A-11(5) **and** A-17's new test red, the last one on the `duplicate_id` document with its own message. The judgment call the builder disclosed (sweeping `0 ≤ daysOut ≤ horizonDays`) is sound and I could not construct a case it wrongly excludes. What the test cannot do is **R15-5**. |
> | **5. Numbers, my own runs at `bd195bd`** | `npm run test:tap` **568 pass / 0 fail** · `npm run typecheck` clean (both projects) · `Object.keys(core).length` = **71**, with `placeForCopy` and `refileCityKey` module-private and unexported · reference trip **2/4/11** at `FIXTURE_TODAY` · `validateTrip` **11** issues · `npm run golden` + `npm run sample` regenerate byte-identically, tree clean · `qa/r14-horizon-copy.mjs` **0 FAIL** with both worktrees present · `qa/r2-copy.mjs` **0 FAIL** · `qa/prov.mjs` **0 FAIL** · `qa/r2-constraints.mjs` **1 FAIL** (R2-18, known). Every number in the builder's addendum reproduces. |
> | **6. Byte-identity, re-derived rather than trusted** | Against a `git worktree` at `3409420`: `detectConflicts` on the reference trip identical at seven clocks; the copied **stop** identical byte-for-byte; the copied **place** identical in every field except the one key A-15 removes (`links`), and nothing else moved. So this pass changed exactly what the three rulings say it changes, and nothing beside it. |
> | **`cairn-constraints`, re-checked** | Determinism, zero runtime deps and no DOM/React under `packages/client/src`: unchanged and clean. **One constraint is newly broken** — §6 *"core throws only on programmer error; domain problems come back as `Issue[]`"*. `copyStopInto` now throws a raw `TypeError` on six `place.hours` shapes `fromJSON` accepts. That is **R15-2**. |
> | **Read-only boundary** | `europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo root: untouched. The only file this round adds anywhere is `cairn/qa/r15-place-copy.mjs`. |
> | **Gate verdict** | **A-16 and A-17 close. A-15 does not — it closed three of the four carriers it enumerated and opened a crash.** The round-14 batch is *not* clean: R14-4's harm class is still live through `Place.hours.weekly` (builder work, the ruling is right) and through `Stop.cost.note` / `Stop.arrival.label` (architect work, the ruling never looked there). **Neither may ship into a share or friend path**, for the same reason R14-4 could not: it is the only place in the design where data crosses a person boundary, and it still applies §6.6 to part of the payload. R14-3 and R14-1 are genuinely done. |
>
> **New probe this round:** `qa/r15-place-copy.mjs` (headless, **17 FAIL by design** — R15-1 ×7,
> R15-2 ×2, R15-3 ×5, R15-4 ×1, R15-5 ×1, R15-6 ×1; every other line in the file is a
> confirmation that must stay at 0). Deterministic call sequences only, no races and no sleeps.
> §6.3 is a differential and prints `skip` without `git worktree add /tmp/r15-pre 3409420`;
> nothing under `cairn/` is ever written. Three of this round's findings are about **tests that
> cannot fail**, and each was established by mutating product code in a throwaway
> `git worktree` at `bd195bd` — never in this tree.
>
> **The round-14 status note below is superseded by this one** and is kept as the record of what
> was true at `fb3ff34`.

## Round 15 — A-15 / A-16 / A-17 + R14-3 (`claude/i4a-r14-issues-f0bkgc` @ `bd195bd`)

Every row was produced by running the repro, not by reading the diff. Routing says *builder*
when the code diverges from a sound ruling and *architect* when the code is faithful to a ruling
that did not look where it needed to.

| id | severity | file:line | defect | repro | routing |
|---|---|---|---|---|---|
| **R15-1** | **BLOCKER** | `packages/core/src/build/copyStop.ts:187`–`188` (`placeForCopy`) × §2.14 A-15 | A-15's closing instruction is *"there is **no remaining spread** of a source `Place` into the target document; a builder who leaves one has not landed this ruling."* One is left: `weekly: p.hours.weekly.map((w) => (w === null ? null : { ...w }))`. `{ ...w }` copies whatever keys the entry actually has, and `fromJSON`'s `parsePlace` passes `hours` through as a **raw cast** (`fromJSON.ts:294`) — the only field in that whole hand-rolled parser that is not structurally validated — so a `weekly` entry may carry anything. A source place whose `hours.weekly[0]` is `{day, open, close, note: "Front door PIN 0754, conf 5814731574 - ask for jacob@example.com", href: "https://vendor.example/booking/GYGG45MLA9Q9"}` lands in the recipient's document with all four credentials intact and greppable in every later `toJSON`. Same for `hours.note` when it is not a string: `redactText` returns a non-string unchanged and `as string` hides that from the compiler, so `{pin: 'PIN 0754'}` crosses whole. This is R14-4's harm, through the one field of the eight whose contents the ruling's table assumed rather than enumerated. | `node --experimental-strip-types qa/r15-place-copy.mjs` §1.1, §1.2 | **builder** — the ruling is right and its own sentence names this. `placeForCopy` should build a `weekly` entry field by field (`{day, open, close}`) exactly as it builds `at`, which is the shape that also fixes R15-2; and `parsePlace` should validate `hours` the way it validates every other field. |
| **R15-3** | **BLOCKER** | `packages/core/src/build/copyStop.ts:292`–`293` × §2.14 rules 3 and 5 × §6.6's free-text row | The copied **stop** carries `cost: { ...src.cost, … }` and `arrival: { ...src.arrival }`. `CostEstimate.note` and `Arrival.label` are free text and go through nothing: a stop whose `cost.note` reads *"paid with card, conf 5814731574"* and whose `arrival.label` reads *"Bus 8, booking GYGG45MLA9Q9"* arrives in the recipient's document verbatim — four `redactText` patterns hit the first, three the second, and both numbers are greppable in the recipient's `toJSON`. §6.6's **sample** path redacts both today (`tools/redact.mjs`'s `redactStop` runs `cost.note` through `redactText`, and `redactStringsDeep` catches `arrival.label`, which is not a `STRUCTURAL_KEY`), so the two thresholds already disagree about these two strings — which is precisely the *"sample path fails closed, copy path fails open"* asymmetry A-15 calls **the** finding. A-15 applied that argument to `Place` and stopped; §2.14 rule 5 still says `arrival` *"copies verbatim"* and rule 3 still says *"`cost` is copied"*, in those words. | `qa/r15-place-copy.mjs` §2.1 | **architect** — the code is faithful to two rules that say to copy these, and §6.6's *"Free text"* row names `Stop.note` but not the two strings nested inside the same stop. Same routing and same reasoning as R14-4: only an architect can reconcile §2.14 and §6.6, and once ruled the mechanism is two `redactText` calls. Worth ruling in the same pass: A-15's key-set guard has no counterpart for `Stop`, so the *next* field added to `CostEstimate` or `Arrival` travels verbatim too. |
| **R15-2** | MAJOR | `packages/core/src/build/copyStop.ts:187` × `packages/core/src/serialize/fromJSON.ts:294` × ARCHITECTURE §2.1 / `cairn-constraints` §6 | `p.hours.weekly.map(...)` assumes a shape `fromJSON` does not enforce, so `copyStopInto` now throws a raw `TypeError` (*"Cannot read properties of undefined (reading 'map')"*) on **six** `place.hours` shapes the parser accepts: `{}`, a string, a number, an array, `null`, and `{weekly: 'mon-fri'}`. All six copy cleanly at `3409420`, so this is a regression introduced by the A-15 build. `validateTrip` says nothing about `hours` on any of them, so nothing warns the user first, and core's own contract is *"throws only on programmer error; domain problems come back as `Issue[]`"* — a malformed imported document is not programmer error. Bounded to MAJOR rather than BLOCKER because `BrowsePane` catches the throw and shows the message as an error toast, so the app does not collapse: the Copy button simply stops working, with a `TypeError` string where a sentence should be. | `qa/r15-place-copy.mjs` §1.3 | **builder** — the field-by-field `weekly` entry R15-1 needs also has to tolerate a `weekly` that is not an array. Same fix, same commit. |
| **R15-4** | MINOR | `packages/core/test/copyStop.test.ts:1026` × §2.14 A-16 step 1 | A-16 makes the *order* of steps 1 and 2 load-bearing in writing (*"it stays **first**… a copy may not paper over it by inventing one — so shape 3 takes step 3 **even within one trip**, deliberately"*). The test that claims to pin it cannot fail: its fixture files the place under `'city_gone'`, a key **neither** document holds, so step 2's `target.cities.some(...)` is `false` whatever the order. Verified by moving step 2 above step 1 in a scratch worktree at `bd195bd`: **568/568 tests pass and `qa/r14-horizon-copy.mjs` prints `ALL OK`**, including the §5.7 line A-16 names as the pin. The order *is* observable — on a stale source that lacks a key the **target** has since gained, step-1-first yields step 3 (coordinate only) and step-2-first files the place under the target's key. Same rider, same class: `name`'s *"verbatim"* row is unpinned too — putting `redactText` on `placeForCopy`'s `name` leaves 568/568 green, because the only fixture name is `'Habyt Vienna'`, which no pattern matches. | `qa/r15-place-copy.mjs` §3.2 (the observable-divergence document; the mutation itself is a scratch-worktree edit the probe describes rather than performs) | **builder** — the ruling is sound; the fixture is not. A source whose `cityKey` the source cannot resolve **and the target can** is the document that distinguishes the two orders. |
| **R15-5** | MINOR | `packages/core/test/horizonGate.test.ts:343` × §2.7 A-17 point 3 | A-17's safety argument has two halves: a horizoned rule emits a resolvable `{kind:'day'}` subject, **and** `beyondHorizon` suppresses only when *every* subject is beyond. The new directional test catches the first half and cannot catch the second. Its `duplicate_id` fixture builds the two days in ascending order, so `subjectDate`'s *"first day holding that id"* is always the **earlier** one — the ambiguous subject therefore always resolves **nearer** than the day the rule iterated, and `every` versus `some` is unobservable on it. Mutation-verified in a scratch worktree at `bd195bd`: changing `beyondHorizon`'s `subjects.every(...)` to `subjects.some(...)` — an inversion of §8.2 ruling 1's asymmetry, the thing A-17 point 3 is buying — leaves **568/568 green**, A-17's own test included. On the same document with `days` reversed the mutation withholds **61** findings inside their own horizon. §8.2's *own* `every` (`suppressedAsPast`) is covered — three shipped tests go red when it is inverted — so the horizon's asymmetry is the one with no shipped coverage at all. `qa/r14-horizon-copy.mjs` §1.3 does catch it, with an injected rule; the shipped suite does not. | `qa/r15-place-copy.mjs` §5.1 | **builder** — A-17's ruling is sound and its wording (*"a `duplicate_id` document"*) is satisfied; the fixture chosen makes the assertion unfalsifiable in the direction that matters. A fixture whose ambiguous subject resolves *further* than the iterated day, or an injected rule as `qa/r14-horizon-copy.mjs` §1.3 already uses, closes it. |
| **R15-6** | MINOR | `packages/core/src/build/copyStop.ts:205`–`219` (`copyStopInto`, the `placement` argument) × §2.2 A-10's change table as amended by A-14 | A-14 re-filed `Place.cityKey` because it is *"the one place in the system where a record **moves between documents**"*, and its change table puts `StopPlacement.pool.cityKey` in the *"Nothing else — they compare keys and never read them"* row. That is true inside one document and false at the same boundary: `copyStopInto` takes the caller's `placement` verbatim and validates only the `scheduled` branch's `dayId`, so a `{kind:'pool', cityKey}` carrying the **source's** key is written straight into the target and `validateTrip` reports `pool_stop_unknown_city` — an **error** with no UI able to repair it, which is R13-6's harm class one field over. MINOR only because no shipped caller offers a pool placement: `BrowsePane` always passes `{kind:'scheduled'}`. The moment "copy into the pool" exists, it is a MAJOR. | `qa/r15-place-copy.mjs` §3.4 | **architect** — whether a cross-trip pool placement re-files, refuses, or is the caller's problem is the same §2.14 question A-14 answered for the place, and A-14's own change table is what says it needs no answer. |

### What I attacked and could **not** break (round 15)

- **A-15's redaction, in both directions.** Eleven place notes across the copy boundary: plain
  prose, an empty string, a street number, a four-digit year, an opening-hours line, Unicode
  prose, *"the booking is done"*, and 5 000 characters — all **byte-identical**. Only the three
  §6.6 already discloses as over-broad move (a 6+ letter ALL-CAPS word, a bare URL, a spaced
  phone number). A credential-shaped note redacts to zero `redactionHits` while staying visibly
  `[redacted]` rather than silently emptied, `hours.note` redacts, `links` is **absent** and not
  emptied, an absent `note`/`hours` is not invented, and a `null` `at` crosses as `null`.
- **A-15's mechanical stop, by mutation.** Eight mutations of `placeForCopy` and its call site,
  each run against the full suite: letting `links` through (2 red), skipping `redactText` on
  `note` (1), skipping it on `hours.note` (1), aliasing `at` (1), inventing an absent `note` key
  (1), reverting R14-3 (1), dropping A-16's same-document conjunct (1), using `===` (1), reading
  the key from `source` (1). Only two mutations survive the whole suite, and both are findings
  above (R15-4's two riders).
- **A-16 against everything I could build.** Two same-named cities, three-way `order` ties, a
  blank name within and across documents, an unresolvable key, a **stale source in both
  directions** (city deleted, and city deleted *and* renamed), a coincidental `city-1` shared by
  two documents, the same document as a re-parsed object, and the same copy run twice. All as
  A-16 rules. `importDoc` re-mints a colliding trip id, so the one coincidence step 2 could
  misread is unreachable through the shipped import route — checked in `store.ts`, not reasoned
  about.
- **R14-3, from both sides and past its own claim.** Mutating the **source** document's inline
  `at` after the copy leaves the target byte-identical, and mutating the **target**'s leaves the
  source byte-identical; `{kind:'none'}` is a fresh object; mutating the source `Place`'s `at`,
  `hours.weekly[0]` and `name` after the copy reaches nothing. Every neighbouring alias I could
  think of — `cost`, `cost.amounts[i]`, `arrival`, `links[i]`, `flags` — is already a fresh
  object, so R14-3 has no sibling left in `copyStopInto`.
- **A-17's obligation assertion.** Deleting `unbooked_ticketed`'s `{kind:'day'}` subject in a
  scratch worktree turns A-11(3), A-11(5) and A-17's directional test red, the last one **on the
  `duplicate_id` document** and with its own message. The builder's disclosed judgment call
  (`0 ≤ daysOut ≤ horizonDays`) is provable as written and I could not build a case it wrongly
  excludes.
- **The ceilings and the boundary.** 71 exports with `placeForCopy` and `refileCityKey`
  module-private and not exported from their own module; reference trip 2/4/11 at
  `FIXTURE_TODAY`; `validateTrip` 11 issues; goldens and sample regenerate byte-identically;
  `npm run typecheck` clean; repo-root planner, `docs/` and `tickets/` untouched.
- **The differential against `3409420`.** `detectConflicts` byte-identical at seven clocks (so
  A-17 really did change no code); the copied **stop** byte-identical; the copied **place**
  identical in every field but the single key A-15 removes. Nothing moved that no ruling asked
  to move.
- **`cairn-constraints`.** Determinism, zero runtime deps, no DOM/React in `packages/client`,
  read-only boundary — all clean. The one violation is §6's throw discipline, filed as R15-2.

### Confirmed by design, recorded so nobody re-derives them (round 15)

- **Dropping `Place.links` changes cross-trip copies of the reference trip, and that is the
  ruling.** 31 of the reference trip's 95 places carry links; every cross-trip copy of one of
  those now delivers a place with no `links` key. The goldens and the sample do not move because
  neither performs a copy. Intended, per A-15's four reasons.
- **The reference trip has no exposure to R15-1, R15-2 or R15-3 today.** 0 of 143 stops carry a
  `cost.note` or an `arrival.label`; 0 of 95 places carry `hours`, and none of the 95 notes is
  credential-shaped. The live route for all three is the same one R14-4 was filed on —
  `fromJSON` / `importDoc`, which accepts every one of these shapes and round-trips them.
- **`pruneOrphanedCopyPlace` is unaffected by A-15 and A-16.** It reads `place.kind`,
  `attribution` and link counts, none of which either ruling touches. A-16's within-trip reuse
  makes the copy share the original's row, and clause 3 (*"no stop anywhere still links it"*)
  correctly declines to prune while the original stop is there — checked in both deletion
  orders.
- **`redactText`'s over-broad shapes are not this pass's defect.** An ALL-CAPS word, a bare URL
  and a spaced phone number are redacted out of a place note. §6.6 states the ALL-CAPS cost in
  writing and measures it at 0 strings on the reference trip; the other two are the patterns
  doing their job. Recorded, not filed.

> **Status (as of `master` @ `fb3ff34`, independently verified 2026-08-27 — round 14, the
> mandatory breaker pass over the builder implementations of ARCHITECTURE revision 12's four
> rulings **A-11**, **A-12**, **A-13** and **A-14**, which between them close round 13's
> R13-1 / R13-2 / R13-3 / R13-6):**
>
> | | |
> |---|---|
> | **Scope** | Exactly `4dd50d1..fb3ff34`: `conflict/rules/types.ts` (`Rule.horizonDays`), `rules/unbookedTicketed.ts` (the deleted `delta > 60`), `conflict/detect.ts` (`beyondHorizon`, `runRules`'s `crashed`, `detectUngatedChecked`), `conflict/resolve.ts` (`syncResolutions`' crash refusal), `build/copyStop.ts` (`refileCityKey`, rule 4's three-step decision), the new `model/cityName.ts`, and the test files `horizonGate.test.ts` / `faultFixtures.ts` / `retirementGate.test.ts` / `copyStop.test.ts` / `cityName.test.ts` / `geoCheck.test.ts`. The Phase 1 open list, P2-5, P2-8, R13-4 and R13-5 were **not** re-litigated. |
> | **BLOCKERS** | **1 — R14-4.** `copyStopInto` rule 4 hands the referenced `Place`'s `note` and `links` across a trip boundary **unredacted**, so a door PIN, a booking confirmation number, a vendor voucher URL and a mailbox address all land in the recipient's document and in every later export of it. This is the un-fixed half of round 2's own BLOCKER **R2-3**, which the status table above records as *"Fixed and verified closed (`b5c742b`)"* — only the `Stop.note` half was fixed. §6.6's free-text table already names `Place.note` as credential-bearing; §2.14 rule 4 does not run it through anything. |
> | **Fixed vs still open** | **CLOSED by this pass and re-verified independently, by running rather than by reading the diff:** **R13-1** (A-11 — `detectUngated`'s id set is identical at **434** clocks over **ten** documents, not six over six; the 60-day boundary is a gate now and not a rule guard; a clock step backwards retires nothing in core, through the store and combined with a crash), **R13-3** (A-12 — 1, 2, 4 and **all ten** rules crashing at once, a **clock-dependent** crash, 25 rounds of dismiss/crash/recover with zero state leaked, and the discriminating genuine-fix case that defers and then resumes), **R13-2** (A-13 — the inert call is gone, the test is named for the crossing it runs, and the tripwire really does turn **red**, for the right reason, under a *real* rule increment rather than a synthetic one), **R13-6** (A-14 — cross-trip copies re-file cleanly, reuse across trips is restored, the no-match case adds no row and no issue). **STILL OPEN, new this round:** **R14-4** (BLOCKER, architect), **R14-2** (MAJOR, architect), **R14-1** and **R14-3** (MINOR). **STILL OPEN, unchanged and not re-litigated:** R13-4, R13-5, P2-5, P2-8, and the whole Phase 1 list (R10-1, R8-3, R8-4, R6-1/2, R5-2, R11-1). |
> | **1. A-11's property, attacked past its own test — PASS** | The shipped test sweeps six clocks over six documents. I swept **434** clocks (every day from 2025-11-01 for 430 days, plus 2019, 2027, 2030 and 2099) over **ten** documents — the six fault fixtures, a 60-day-boundary trip, a `duplicate_id` document, the reference trip with a live dismissal, and the reference trip with a retired row so the *"it has come back"* path is exercised. `detectUngated`'s sorted id list is **identical everywhere**. I then injected rules into `RULES` at `horizonDays` **0, −1, NaN, Infinity and 1e9**, with an **integrity** class, beside a horizon-free rule, with mixed-date subjects and with **no** subjects: the un-gated set contains the finding in every one of those cases, §8.2 ruling 1's asymmetry holds for the horizon exactly as for the gate, and `beyondHorizon` is inert without a horizon or without a clock. Five malformed clocks (`'2026-8-1'`, `'not-a-date'`, `'2026-13-45'`, `''`, an ISO instant) add no throw site to `detect.ts`. |
> | **2. KD-48 — the measurement is real** | Re-derived from the **fixture**, not from the rule: I counted, by hand and independently of `unbookedTicketed`, the reference trip's scheduled stops with no `bookingId`, a `cost` and a link. **Ten**, and they are the ten the rule reports, and the three §2.7 names (Széchenyi, Prague Castle, Windsor) are among them. The test is not accepting whatever the code does — the hand count and the rule agree, and the 11-note ceiling still holds with ten of the eleven from this rule. |
> | **3. A-12 — PASS, including the cases the builder did not run** | Multiple simultaneous crashes (1, 2, 4 and all ten rules) all return the **same trip reference** with nothing stamped, and `detectUngatedChecked` reports every crashing rule in `RULES` order. A **clock-dependent** crash defers a *genuine* retirement at the clock where the rule throws and does not defer it at a clock where it works — the discriminating case, since the un-gated set then differs from the gated one because of the crash and not the calendar. 25 rounds of dismiss/crash/recover on one document leak nothing: 50 calls, `revision` unmoved. Through the real store with a real storage port, one render during a crash writes nothing, and retirement **resumes** on the next real recompute. |
> | **4. A-13's tripwire — PASS, and it is genuinely reachable** | Not taken on trust and not tested with the builder's one-line hack. In a scratch `git worktree` I made a **plausible next increment** — `unbooked_ticketed` also covering a ticketed **pool** stop, whose only subject has no day of its own and therefore resolves through §8.2 ruling 2's `endDate` fallback — and the tripwire went `not ok`, carrying A-13's own instruction (*"A-9 assertion 4's LITERAL mechanism has just become achievable… Write that test, in this commit"*). It inspects 75 feasibility findings covering 5/5 feasibility rules, and it measures the **un-gated** set so the gate cannot hide what it is looking for. |
> | **5. A-14 — the mechanism is right; the "what does not change" claim is not** | Assertions 1–5 all reproduce, including the three-same-named-cities tie-break (lowest `order`, then document position — checked at orders `2,1,1`, `1,1,0`, `0,0,0`, negative and fractional), Unicode folding at the boundary (NFC/NFD, NBSP, tab/newline, case — match; zero-width space, fullwidth `Ｖ`, dotted `İ`, `ß`/`ss` — no match, so the copy takes step 3, which is the safe direction), double-hop A→B→C in both the step-2 and step-3 flavours, and KD-47's disclosed pre-A-14 gap (**real, and MINOR as disclosed** — one duplicate row, bounded, no *new* error). What does **not** hold is A-14's own closing paragraph: **R14-2**. |
> | **6. The `lisbonWithCopiedPlaceStop` rework — verified, and it is not weaker** | The original fixture really is dead: with a Lisbon-only trip the copy now takes step 3, no `Place` travels, and all 14 A-6/A-6a tests lose their precondition — I built both fixtures side by side and confirmed it. The replacement is a genuine test of what A-6 needs tested: the copy-borne `Place` is still **measured** (`nearest !== null`), still `unanchored`, still a real outlier at **2 329 km**, and its nearest anchor is still `home_base` — the same anchor and the same distance the pre-A-14 fixture produced, because the stub city's `centre` defaults to `{0,0}` and is 5 600 km away, so it never becomes the nearest. One Browse-and-copy click still mints no `geo_outlier`, and pointing a **user-authored** stop at the copied place still ends the exemption (`every`, not `some`) and mints the blocker — which is the clause that would be lost if the fixture had been weakened. |
> | **7. Byte-identity, re-derived rather than trusted** | `detectConflicts` diffed against a `git worktree` at `78b490f` (the commit **before** A-11/A-12/A-13) over **435** clocks × three documents. Identical on the reference trip and on a 60-day-boundary trip. It **diverges on a `duplicate_id` document** — 123 of 435 clocks — which is **R14-1**. `npm run golden` + `npm run sample` regenerate byte-identically and leave the tree clean; the sample sha is unmoved. |
> | **8. Numbers, my own runs at `fb3ff34`** | `npm run test:tap` **554 pass / 0 fail** (the builder's number, reproduced) · `npm run typecheck` clean (both projects) · `npm run web:build` clean · `Object.keys(core).length` = **71**, and `detectUngated` / `detectUngatedChecked` / `normalizeCityName` are all off it · reference trip **2 blockers / 4 warnings / 11 notes** at `FIXTURE_TODAY` and `2/4/7`, `2/2/1`, `2/2/1`, `2/4/1` at `2026-08-14`, `-08-27`, `2027-01-01`, `2019-01-01` · `validateTrip` still the known 11 issues (`warn:cost_basis_mixed` ×10, `error:lat_lng_out_of_range` ×1) · `qa/r2-copy.mjs` **0 FAIL**, `qa/prov.mjs` **0 FAIL** (neither had been run at a commit carrying *both* builder passes) · `qa/r2-constraints.mjs` **1 FAIL** (R2-18, known). |
> | **KD numbering and disclosure — PASS** | `### KD-n` headings in BUILD-NOTES are contiguous **1…49** with no duplicates and no gap across the two parallel passes, and `node --test test/disclosure.test.ts` passes 5/5. KD-47's three judgment calls and KD-48's re-measurement are both accurate; KD-49's probe edits are within what A-13 pre-authorises. |
> | **`cairn-constraints`, re-checked** | No `Date.now()` / `Math.random()` / `crypto.randomUUID()` in `packages/core` or `packages/client`; the two `new Date(…)` sites in `derive/summary.ts` are pure arithmetic on an injected date string and are pre-existing. No DOM, `window` or React under `packages/client/src`. Zero runtime dependencies in the root workspace and in `@cairn/core`. `normalizeCityName` lives in `model/` and is imported once, so there is no second copy to drift. |
> | **Read-only boundary** | `europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo root: untouched. The only file this round adds anywhere is `cairn/qa/r14-horizon-copy.mjs`. |
> | **Gate verdict** | **A-11, A-12 and A-13 are done. A-14's mechanism is done; A-14's claim about what it leaves alone is not, and the copy path still carries the credential leak round 2 filed as a BLOCKER.** So: I-3a is closed, I-4a's conflict half is closed, and the copy/social primitive needs one more architect pass. **R14-4 must be answered before any share or friend path ships**, because it is the only place in the design where data crosses a person boundary and it applies §6.6 to half the payload. R14-2 should be answered in the same ruling — it is four lines of `refileCityKey`. |
>
> **New probe this round:** `qa/r14-horizon-copy.mjs` (headless, **15 FAIL by design** with both
> scratch worktrees present and **14** without one — R14-1 ×2, R14-2 ×5, R14-3 ×2, R14-4 ×6; every
> other line in the file is a confirmation that must stay at 0). Not timing-dependent —
> deterministic call sequences only, no races and no sleeps. Two sections are differentials against
> other commits and print `skip` without a second checkout; the header names the two
> `git worktree add` commands, and neither writes anything under `cairn/`.
>
> **The round-13 status note below is superseded by this one** and is kept as the record of what
> was true at `4dd50d1`.

## Round 14 — A-11 / A-12 / A-13 / A-14 (`master` @ `fb3ff34`)

Every row was produced by running the repro, not by reading the diff. Routing says *builder* when
the code diverges from the ruling and *architect* when the code is faithful to a ruling whose
reasoning has a hole.

| id | severity | file:line | defect | repro | routing |
|---|---|---|---|---|---|
| **R14-4** | **BLOCKER** | `packages/core/src/build/copyStop.ts:169` (and `:164`) × §2.14 rule 4 / rule 5 × §6.6's free-text table | Rule 4 copies the referenced `Place` with `{...refiled, id: newId('place')}`, so the **place's** `note` and `links` cross the trip boundary verbatim while rule 5 redacts the **stop's** `note` two lines later. A place note reading *"Front door PIN 0754, conf 5814731574 — ask for jacob@example.com"* and a link `https://vendor.example/booking/GYGG45MLA9Q9` land intact in the recipient's document: five of `redactText`'s six patterns hit the copied string and all four credentials are greppable in the recipient's `toJSON`. This is the half of round 2's BLOCKER **R2-3** that was never fixed — R2-3's own text says *"`Place.note` and `Place.links` copy with the place"*, the status table records R2-3 as closed, and only `Stop.note` was. | `node --experimental-strip-types qa/r14-horizon-copy.mjs` §5.9 | **architect** — §2.14 rule 4 *tells* the builder to copy the place, and §6.6 already classifies `Place.note` as free text that must be redacted; the two documents disagree and only an architect can reconcile them. The mechanism is three lines (`redactText` on `note`, and the same rule-3 argument applied to `links`), so a builder can land it the moment it is ruled. |
| **R14-2** | MAJOR | `packages/core/src/build/copyStop.ts:91`–`103` (`refileCityKey`) × §2.14 A-14's *"Copying within one trip is unchanged: … the key comes back identical, and the reuse search matches the original place exactly as today"* | `refileCityKey` never special-cases `source === target`, so a **within-trip** copy is re-filed by name like any other. On a trip that holds two cities of the same name — which A-10 explicitly blesses, and which is what a there-and-back itinerary through a hub looks like — a place filed under the *second* Vienna is silently re-filed onto the *first*, `samePlace` then fails against the original row, and a **duplicate `Place` row** is written under the wrong city. A-14 assertion 2's *"`target.places.length` is unmoved"* is false for exactly this document. Two further shapes take step 3 within one trip and lose the place link entirely (the stop drops to `{kind:'inline'}`, losing the place's `note`/`links`/`hours`): a city whose name folds to `''`, and a place whose `cityKey` the source itself cannot resolve. Reproduced through `core` **and** through the real store and reducer — one Copy click. | `qa/r14-horizon-copy.mjs` §5.2, §5.7, §5.10 | **architect** — the builder implemented A-14 step 2 literally and correctly; it is A-14's *"what does not change"* paragraph that is false. The fix is one early return (`if (source === target) return cityKey`, or: the source's own key is the winning candidate whenever the target holds it), but which one it is is a §2.14 ruling. |
| **R14-1** | MINOR | `packages/core/src/conflict/detect.ts:133` (`beyondHorizon` → `subjectDate`) × §2.7 A-11 assertion 5, *"`detectConflicts` is provably output-neutral"* | The proof rests on *"`unbooked_ticketed`'s two subjects are the stop and its own day, both resolving through `subjectDate` to that day's date"*. `subjectDate` resolves a `{kind:'stop'}` ref by scanning `trip.days` for the **first** day containing that id, which is not the day the rule was iterating when the same stop id appears on two days. On such a document `detectConflicts` diverges from pre-A-11 at **123 of 435 clocks**, and the horizon **leaks**: a note **73 days out** survives a 60-day gate. The direction is safe (over-reporting only, never hiding something actionable), and the document is malformed — `validateTrip` calls it `duplicate_id` (error) — but `fromJSON` accepts it, so `importDoc` is a live route. | `qa/r14-horizon-copy.mjs` §1.5 (standalone), and §1.4 for the pre-vs-post byte differential (needs `git worktree add /tmp/r14-pre 78b490f`) | **architect** — A-11 point 2 names `subjectDate` as the resolver, so the code is faithful and it is assertion 5's *proof* that has the hole. Either narrow the claim to documents `validateTrip` accepts, or have the rule carry its own subject date. |
| **R14-3** | MINOR | `packages/core/src/build/copyStop.ts:150` (`let place = src.place;`) | When the source stop's place is `{kind:'inline'}` or `{kind:'none'}`, `copyStopInto` assigns the **same object** into the target document — the two trips then share one `PlaceLink` and one mutable `LatLng`. KD-47's third judgment call spends a paragraph explaining that A-14's step 3 must clone *"because `copyStopInto` is pure and the two documents must not end up sharing one mutable `LatLng` object"*, and then the pre-existing branch two lines above does exactly that. No code mutates a `LatLng` today, which is the only reason this is MINOR — the same sentence KD-47 uses about its own case. | `qa/r14-horizon-copy.mjs` §5.3 | **builder** — `{ ...src.place }` plus a cloned `at`, matching the step-3 branch it sits beside. |

### What I attacked and could **not** break (round 14)

- **A-11's invariant, 434 clocks × 10 documents.** Sorted `detectUngated` id lists identical
  everywhere, including on documents carrying a live dismissal and a retired row (so the
  *"it has come back"* detail path runs), and on a `duplicate_id` document.
- **The horizon as a mechanism, not just as `unbooked_ticketed`'s constant.** Injected rules at
  `horizonDays` 0, −1, `NaN`, `Infinity` and `1e9`; an **integrity** rule declaring a horizon
  (the gate applies it — A-11 says only a feasibility rule *may* declare one, asserted rather
  than typed, and the shipped table still has exactly one); a horizon-free rule beside a
  horizoned one; a finding with one subject inside and one beyond (kept — §8.2 ruling 1's
  asymmetry); every subject beyond (dropped); and **no** subjects (never suppressed).
- **The 60-day boundary itself.** Gated: fires at Δ59 and Δ60, withheld at Δ61 and Δ62 — strictly
  `> horizonDays`, matching the deleted guard. Un-gated: present at all four, and it is **one**
  conflict id across the boundary, so content-addressing is clock-free.
- **A-12 against everything I could think of.** Ten rules crashing at once; a crash that only
  happens at some clocks, over a document whose dismissal is *genuinely* fixed (deferred at the
  crashing clock, retired at the working one); 25 crash/recover cycles with `revision` unmoved;
  and through the store, one render during a crash writing nothing and retirement resuming after.
- **A-13's tripwire, forced red by a real increment**, not by the builder's synthetic one — and it
  failed with A-13's own message and named the ruling.
- **A-14's five builder assertions**, the three-way tie-break under five different `order`
  arrangements, eight Unicode/whitespace folding cases at the copy boundary, double-hop copies in
  both flavours, and KD-47's disclosed gap (real, bounded at one duplicate row, mints no new
  error — MINOR as disclosed).
- **The `geoCheck` fixture rework.** Both fixtures built side by side: the old one is genuinely
  dead, the new one measures the same anchor at the same distance and still exercises A-6's
  `every`-not-`some` clause and the acceptance-monotonicity clause.
- **The ceilings.** 71 exports, 2/4/11 at `FIXTURE_TODAY`, 11 validation issues, goldens and
  sample byte-identical, KD ids contiguous 1…49, `test/disclosure.test.ts` green, 554/0.
- **`cairn-constraints`.** Determinism, zero-dep, no DOM in `packages/client`, read-only boundary.

### Confirmed by design, recorded so nobody re-derives them (round 14)

- **A crash is deterministic for a document, so `store.getDerived()`'s cache-miss guard is not a
  hole.** Retirement runs only when `derivedFor` returned a new cache object. A rule is a pure
  function of the document, so a rule that threw will throw again on the same document at the
  same clock — the only thing that can make it stop throwing is a document change or a code
  change, and both invalidate the cache. A second render at the same `(document, today)` really
  does have nothing to retry. Measured, and not filed.
- **A-12's residual cost, named rather than found.** While a rule crashes, a dismissal whose
  conflict was genuinely fixed is *not* retired — so if the data then reverts, the finding comes
  back still dismissed. A-12 states this trade in writing and prefers it to the alternative
  (retiring on an incomplete analysis, permanently). Confirmed to behave exactly as written.
- **An integrity rule that declared `horizonDays` would be gated by it.** A-11 says only a
  feasibility rule may declare one and that this is *"asserted in the same test, not enforced by
  a type"*. The assertion is present, the shipped table has one horizon on one feasibility rule,
  and the mechanism does not care about class — which is the documented state, not a defect.
- **`normalizeCityName`'s conservative failures are the right direction.** A zero-width space, a
  fullwidth letter, a Turkish dotted `İ` and `ß`/`ss` all fail to match, so the copy takes step 3
  and the place does not travel. That is A-14's own preference — a hole over a confident wrong
  filing — and the Hermes guard behaves identically.
- **Stop `links` copy verbatim across the boundary and that is deliberate.** `qa/r2-copy.mjs` §H
  reports two order/ticket-shaped hrefs travelling and does not fail on them: a stop link is a
  vendor page, `Stop.ticket` is the credential and rule 3 drops it. `Place.links` is a different
  question and is part of **R14-4**, because it travels with a record nobody badged.
- **The reference trip has no exposure to R14-4 today.** All 95 of its places carry a `note` and
  **none** is credential-shaped; `addPlace` is not on `index.ts`, so the shipped app has no write
  path for a place note. The live route is `fromJSON`/`importDoc`, which accepts one and
  round-trips it. R2-3 was filed a BLOCKER on exactly this footing — *"no exposure exists today"*
  — and the primitive ships now.

> **Status (as of `master` @ `4dd50d1`, independently verified 2026-08-27 — round 13, the
> mandatory breaker pass over ROADMAP **I-3a** (§2.7 A-9) and **I-4a** (§2.2 A-10), plus the
> two orchestrator follow-ups KD-42 and KD-44):**
>
> | | |
> |---|---|
> | **Scope** | Exactly `23f37b9..4dd50d1`: `conflict/detect.ts` (`runRules`/`detectUngated`), `conflict/resolve.ts` (`syncResolutions(trip, at)`), `rules/unbookedTicketed.ts` (the deleted `delta < 0`), `rules/geoOutlier.ts` (`cityLabel` + KD-44's fallback), `build/createTrip.ts` (`CityInit.key?`), `validate/validateTrip.ts` (three new codes), `store.ts`'s `retireResolutions`, and the slug deletion in `PastTripForm.tsx` / `Library.tsx`. The Phase 1 open list and P2-5 / P2-8 were **not** re-litigated. |
> | **BLOCKERS** | **0.** No data loss, no privacy leak, no wrong-person's-data path in this batch. |
> | **Fixed vs still open** | **CLOSED by this pass and re-verified independently:** P2-1's filed repro (`qa/p2b-gate.mjs` §1.10/§1.11 → 0 FAIL — a clock crossing §8.2's gate in *either* direction, swept over seven clocks, retires nothing and returns the same trip reference) and P2-2 (**including the Chromium half the builder disclosed he had not run** — I ran `qa/p2b-past.mjs` §3: 東京/京都 get two distinct minted keys, day 1 carries the first, 0 validation issues). **STILL OPEN, new this round:** R13-1 and R13-6 (MAJOR, both architect), R13-2…R13-5, R13-7, R13-8 (MINOR). *(Builder amendment, after `30d6288`: **R13-7 and R13-8 are now CLOSED** — see the follow-up note under the round-13 table. R13-1…R13-6 are unchanged and still open.)* *(Builder amendment, after `be1ed01`: **R13-6 is now CLOSED** — §2.14 **A-14** built, `qa/r13-gate-citykey.mjs` §10 at 0 FAIL. R13-1…R13-5 unchanged by that pass.)* **STILL OPEN, unchanged:** P2-5, P2-8, and the whole Phase 1 list (R10-1, R8-3, R8-4, R6-1/2, R5-2, R11-1). |
> | **1. A-9's core claim — PARTIAL** | Retirement genuinely stops answering to §8.2's gate: seven clock steps forward and backward across `endDate` retire nothing and return the same reference; a genuine fix still retires at any clock, in core and through the store; an unrelated edit at a post-gate clock retires nothing. **But the gate is not the only clock-driven suppression left.** `unbooked_ticketed`'s surviving `delta > 60` half is a second one, and unlike §8.2's it is applied *inside* `detectUngated` — so one backwards clock step across that boundary permanently retires a live dismissal, bumps `revision`, dirties storage and re-arms the finding with *"it has come back"*. That is **R13-1**, P2-1's harm class through the door A-9 decided to leave open. |
> | **2. `detectUngated` off the surface — PASS** | Not in `Object.keys(core)` (71, unchanged); named by no file under `packages/client/src`, `apps/web/src` or `cli.ts`; no consumer outside core deep-imports a core module path; and the string does not appear in the built `apps/web/dist` bundle. `subjectDate`, `UNBOOKED_HORIZON_DAYS` and `TRANSIT_CITY_KEY` are all internal too. |
> | **3. A-9 assertion 4's substitution — PARTIAL (R13-2)** | The builder's disclosure is accurate: extending `endDate` cannot un-gate `missing_lodging` at a post-`endDate` clock (its subjects are its own days), and I reproduced that. What the substituted test actually runs is *the same document at a clock inside the trip* — and its `setTripMeta({endDate:'2026-09-30'})` is **inert**: byte-identical result with and without it. The harm A-9(4) names *is* proven (live resolution attached, no *"it has come back"*, with a faithful pre-A-9 control); the mechanism the test's name and comment claim is not exercised at all. |
> | **4. A-10 attacked — PASS** | 22 adversarial names (`東京`, `京都`, `transit`/`Transit`/`TRANSIT`, `__proto__`, `constructor`, `{"key":"city-0"}`, `city-0`, `-`, a 4096-char name, `🇯🇵 Tokyo`, two `Zürich`s, two Parises) → **22 distinct keys**, none reserved, none `"-"`, and only the whitespace-only name reported (`city_name_empty`). All three new codes fire on the shapes only import/hand-edit can produce; a differently-cased `"Transit"` key is correctly *not* reserved. |
> | **5. `fromJSON`'s silence — PASS** | A pre-A-10 document carrying the `"-"` collision **opens** through `fromJSON`, through `migrateDoc` and through the store's `importDoc`, and `validateTrip` is what reports it (`duplicate_city_key`, error). Reserved-key and blank-name documents parse too. Nothing upstream chokes on a previously-tolerated document. |
> | **6. Byte-identity, re-derived independently** | Not trusted, re-run: `detectConflicts` + `validateTrip` + `tripSummary` + `trip.cities` on the reference trip at **six clocks and with no clock**, serialised and diffed against the **same script run in a `git worktree` at `23f37b9`** — 52 229 bytes, `diff` clean. `fixtures/golden/*` + `fixtures/europe2026.sha256` regenerated with **both** the pre-change and the post-change code and diffed against the committed files: identical, working tree stays clean. Source sha `40955ca0b182` both sides. |
> | **7. KD-42 — verified** | `Object.keys(core).length === 71`; §2.10's own enumerated group counts sum to `7+17+22+6+2+2+7+3+1+4 = 71`. The claim holds exactly. One residue: `detect.ts:192`'s comment, written in the same pass, still says *"stays at 70"* (**R13-4**). |
> | **8. KD-44 — the problem moved, it did not go** | The raw key is gone from the sentence, which was the fix. But the phrase is substituted where a noun phrase for a *place* belongs, so the reference trip's own injected fault now reads *"…on a city this trip does not have is 9030 km from…"*, and both label sites (`the X map` / `the X optional list`) collapse to the identical phrase — **R13-5**. Six other `validateTrip` messages still print a raw opaque key — **R13-7**. |
> | **Numbers, my own runs at `4dd50d1`** | `npm run test:tap` **515 pass / 0 fail** · `npm run typecheck` clean · `npm run web:build` clean · `npm run cli -- trip` / `-- conflicts` / `-- day` all run · `qa/p2b-gate.mjs` **5 FAIL**, exactly the five the builder disclosed (P2-5, P2-8 ×2, the §1.7 un-padded-`today` crash, the §2.1 `summary.ts` ceiling) · `qa/confid2.mjs` **0 FAIL** · `qa/r2-constraints.mjs` **1 FAIL** (R2-18, known) · `qa/p2b-past.mjs` in real Chromium **3 FAIL**, all probe rot (**R13-8**). Every number in BUILD-NOTES' current status note reproduces. |
> | **`cairn-constraints`, re-checked** | Determinism: the new `ctx.ids.newId('city')` is the injected factory, and the behavioural two-process byte-identity check passes; zero runtime deps in `core`/`client`; no DOM, `window` or React under `packages/client/src`; no coordinate reaches `Conflict.params`. |
> | **Read-only boundary** | `europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo root: untouched. The only file this round adds anywhere is `cairn/qa/r13-gate-citykey.mjs`. |
> | **Gate verdict** | **I-3a and I-4a both do the thing they were contracted to do, and neither is finished.** 0 BLOCKER, 2 MAJOR — and both MAJORs are *design* gaps in the two rulings rather than build errors, so both go back to the architect. **I-5/I-6 are not blocked by them** (neither touches `TripSummaryRow`, `lifecycle` or the summary path), but **R13-6 must be answered before any copy-heavy increment ships**, because it makes every cross-trip copy between two product-created trips emit a `validateTrip` **error** the user cannot clear. |
>
> **New probe this round:** `qa/r13-gate-citykey.mjs` (headless, **16 FAIL by design** — §1 R13-1 ×7,
> §3 R13-2 ×2, §4 R13-3 ×2, §7 R13-4, §8 R13-5 ×2, §10 R13-6 ×2; every other line in the file is
> a confirmation that must stay at 0). Not timing-dependent — deterministic call sequences only.
>
> **The round-12 status note below is superseded by this one** and is kept as the record of what
> was true at `5a3c723`.

## Round 13 — I-3a / I-4a (`master` @ `4dd50d1`)

Every row was produced by running the repro, not by reading the diff. Severity ranks data loss
and wrong-person's-data above "feature does not work" above rough edges; the routing column says
*builder* when the code diverges from the ruling and *architect* when the code is faithful to a
ruling whose reasoning has a hole.

| id | severity | file:line | defect | repro | routing |
|---|---|---|---|---|---|
| **R13-1** | MAJOR | `packages/core/src/conflict/rules/unbookedTicketed.ts:37` × §2.7 A-9's *"the far-future half stays and needs nothing"* | `delta > UNBOOKED_HORIZON_DAYS` is a **second** clock-driven suppression and it is applied inside `detectUngated`, so a clock step **backwards** across the 60-day boundary retires a live dismissal permanently, bumps `revision` and dirties storage with no edit — P2-1's exact harm, through the one door A-9 chose to leave open. | `node --experimental-strip-types qa/r13-gate-citykey.mjs` §1.1, §1.2, §1.3 | **architect** — A-9's *"as a clock advances `delta` only shrinks"* assumes a monotone clock — ruled in §2.7 **A-11** (revision 12) and built: **CLOSED**, see the follow-up note below |
| **R13-6** | MAJOR | `packages/core/src/build/copyStop.ts:126` × §2.2 A-10's *"what this changes elsewhere — the complete list"* | `copyStopInto` copies a `Place` with `{...original}`, so it carries the **source trip's** minted `CityKey` into the target. Between two product-created trips the keys can never match, so every cross-trip copy of a place-linked stop leaves the recipient's document reporting `unknown_city_key` (**error**) with no UI able to repair it. Under the pre-A-10 slug two trips to Vienna both said `vienna` and the copy was clean — the control proves it. | `qa/r13-gate-citykey.mjs` §10 | **architect** — A-10's change table does not mention `copyStopInto`; whether the copied place re-points by normalised name is a §2.14 ruling, not a builder's call — ruled in §2.14 **A-14** (revision 12) and built: **CLOSED**, see the follow-up note below |
| **R13-2** | MINOR | `packages/core/test/retirementGate.test.ts:103` | A-9(4)'s substituted test calls `setTripMeta(t2, { endDate: '2026-09-30' })` and the call is **inert** — the assertions produce a byte-identical result with it removed, because the clock it then reads (`2026-08-26`) is inside the *original* range. The harm is proven; the mechanism the test name claims is not exercised. | `qa/r13-gate-citykey.mjs` §3 | **builder** — either drop the inert call and rename the test to what it measures, or route the *literal* A-9(4) back to the architect as unachievable — routed, and ruled unachievable in §2.7 **A-13** (revision 12); built: **CLOSED**, see the follow-up note below |
| **R13-3** | MINOR | `packages/core/src/conflict/detect.ts:152` × A-9 point 1 | A-9 says a crash *"can never be the thing that retires a resolution"*. It can: the `catch` replaces a crashing rule's **whole output** with one `rule_error` note, so all of that rule's real findings leave the un-gated set and `syncResolutions` retires every live dismissal they carried — permanently, at the same clock, with no edit. The `!crashed` conjunct protects the note, not the findings. MINOR only because no content route into a crash survives `fromJSON` today (five tried, all refused). | `qa/r13-gate-citykey.mjs` §4 | **architect** — the sentence in A-9 point 1 is false as written — ruled in §2.7 **A-12** (revision 12) and built: **CLOSED**, see the follow-up note below |
| **R13-4** | MINOR | `packages/core/src/conflict/detect.ts:192` | The comment written by this same pass still reads *"§2.10's runtime symbol count stays at 70"*. KD-42 corrected both prose sites in `ARCHITECTURE.md` and `ROADMAP.md` and missed the code. (KD-42's substance is correct — verified 71 both ways.) | `qa/r13-gate-citykey.mjs` §7 | **builder** — one word |
| **R13-5** | MINOR | `packages/core/src/conflict/rules/geoOutlier.ts:61,68,74` | KD-44 moved the legibility problem rather than removing it. The phrase is substituted where a noun phrase for a place belongs, so the reference trip's own injected fault reads *"“Austrian National Library” **on a city this trip does not have** is 9030 km from…"*; and both label sites now emit the identical string, so a reader can no longer tell a city map from an optional list — the distinction `whereOf` exists to draw. The comment at `:58` also describes the behaviour the change deleted. | `qa/r13-gate-citykey.mjs` §8 | **builder** — same routine-UX class KD-44 was resolved under (e.g. *"a map for a city this trip does not have"* / *"an optional list for …"*) |
| **R13-7** | MINOR | `packages/core/src/validate/validateTrip.ts:111,133,176,187,280,402` | Six `Issue.message` strings still interpolate a raw opaque `CityKey` — *"Place "Belvedere" references unknown city "acity-1""*, *"Two cities share the key "city-7""*. Two of those codes are A-10's own, and the other four became opaque the day keys started being minted. KD-44 fixed exactly one instance of this class and left six, all of them user-visible in the Issues panel. | `qa/r13-gate-citykey.mjs` §10 (`R13-6b`); direct: `validateTrip` on any cross-trip copy | **builder** — **CLOSED**, see the follow-up note below |
| **R13-8** | MINOR | `qa/p2b-past.mjs` §1c, §2d, §3d | Three Chromium assertions still measure the **deleted slug** — they expect `primaryCity === 'tokyo'` and expect the app to *report* the 東京/京都 collapse that no longer happens. 3 FAIL that describe nothing shipping. This is exactly what KD-43 identified and repaired for `p2b-gate` §3.3; the Chromium probe was left because the builder disclosed he did not re-run it. | `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/p2b-past.mjs` (needs `npm run web:build && node tools/serve.mjs`) | **builder** — repoint at the minted key, keep every assertion — **CLOSED**, see the follow-up note below |

> **Builder follow-up, 2026-08-27 (after `30d6288`) — R13-7 and R13-8 are CLOSED.** Scope was
> those two rows only; R13-1, R13-2, R13-3, R13-4, R13-5 and R13-6 were not touched.
>
> - **R13-7.** All six `validateTrip` messages resolve the key to `City.name` where the trip has
>   the city and compose a legible phrase where it does not — `geoOutlier.ts`'s `cityLabel`
>   pattern, unchanged. `Issue.params` keeps the raw key at all six; `primary_city_not_in_cities`
>   gained `cityKey` beside the `primaryCity` it already carried, so the six expose the key under
>   one name. Nine tests in `packages/core/test/cityKey.test.ts`, all watched red first.
>   BUILD-NOTES **KD-46**, which also records the two judgment calls the finding did not settle (a
>   blank `City.name` counts as unresolvable; the `transit` sentinel gets its own sentence rather
>   than the *"a city this trip does not have"* fallback, which would be false for it).
> - **R13-8.** `qa/p2b-past.mjs` §1c, §2d and §3d repointed, none deleted. §1c/§2d look the city up
>   by the **name** the user typed and read the minted key back off the persisted document; §3d is
>   inverted — the collapse it expected the app to report cannot happen after A-10, so it asserts
>   there is nothing to report, which fails again if the collapse returns (`duplicate_city_key`
>   renders in that same panel). One assertion **added** (§3d0): "zero issues on screen" is only
>   evidence if the Validation panel is the panel being read, and it now proves that from the
>   panel's own empty state. Run for real in Chromium before and after: **3 FAIL → 0**.
> - **One number this pass moved that the routing did not predict.** `qa/r13-gate-citykey.mjs`
>   goes **13 FAIL → 12**, not to 13: its §10 `R13-6b` assertion — *"the issue a person reads does
>   not print the raw opaque key"* — is an R13-7 assertion filed under §10 because a cross-trip
>   copy is how it is reached. R13-6 itself is untouched and its first §10 assertion still fails.
> - **Verified, this pass:** `npm run typecheck` clean · `npm run test:tap` **524 pass / 0 fail**
>   (was 515) · `npm run web:build` clean · `qa/p2b-past.mjs` 0 FAIL · `qa/r13-gate-citykey.mjs`
>   12 FAIL · `qa/p2b-gate.mjs` 5 FAIL, `qa/confid2.mjs` 0, `qa/p2-pasttrip.mjs` 0, `qa/r3-pool.mjs`
>   3 and `qa/r3-cas2.mjs` 3 — the last two confirmed identical at `30d6288` in a `git worktree`.

> **Builder follow-up, 2026-08-27 (after `78b490f`) — R13-1, R13-2 and R13-3 are CLOSED.** Scope
> was A-11/A-12/A-13 and nothing else; R13-4 and R13-5 were not touched by this pass, and R13-6 was
> closed by the parallel A-14 pass.
>
> - **R13-1 (A-11).** `Rule` gains `horizonDays?: number`; `unbookedTicketed` **declares**
>   `horizonDays: UNBOOKED_HORIZON_DAYS` and its `if (delta > UNBOOKED_HORIZON_DAYS) continue;` is
>   deleted. `detect.ts` grows `beyondHorizon(trip, conflict, today, horizonDays)`, symmetrical with
>   `suppressedAsPast` and under the **same `gate` conjunct**, so `detectUngated` disables it exactly
>   as it disables §8.2's gate. `ctx.today` stays in the rule file for `summary` and `params.daysOut`
>   — prose — and no branch reads it. **§1.1 ×1, §1.2 ×4 and §1.3 ×2 all close.**
> - **A-9's greppable ceiling is replaced, not deleted.** *"`ctx.today` in exactly one rule file"*
>   was a proxy for a property the grep could not see, since the surviving suppression lived in the
>   one file the grep permitted. The property is now swept directly: for one document,
>   `detectUngated` returns the **same conflict ids at all six clocks** (`2019-01-01`, `2026-08-01`,
>   `2026-08-24`, `2026-08-30`, `2027-08-30`, `2030-01-01`), over the reference fixture **and** five
>   injected-fault fixtures that between them make all ten rules fire — the sweep fails if any rule
>   is silent everywhere. `packages/core/test/horizonGate.test.ts`. (The probe's own §9 grep still
>   passes: the token is still there, for prose.)
> - **R13-3 (A-12).** `syncResolutions` returns the trip **unchanged** if any rule threw during the
>   detection it is deciding from — trip-wide, before any row is stamped, because mapping a stored
>   `conflictId` back to its rule means parsing the id, which A-9 refused. `detect.ts` grows
>   `detectUngatedChecked(trip, opts): { conflicts, crashed }`; **`detectUngated`'s array return
>   shape is unchanged**, so §1/§5/§9's probe assertions still call it verbatim and stay independent
>   evidence that A-11 worked. Neither name is on `index.ts`; 71 runtime symbols before and after.
>   **§4 ×2 close.**
> - **R13-2 (A-13).** The inert `setTripMeta({endDate})` call is deleted from
>   `packages/core/test/retirementGate.test.ts` and the test renamed to the **clock crossing** it
>   runs; every assertion and the pre-A-9 control are kept. A-13's tripwire is added — *no
>   `feasibility` rule emits a finding whose subjects all resolve through §8.2 ruling 2's `endDate`
>   fallback* — over the reference fixture and every injected-fault fixture, verified red by
>   temporarily making `missing_lodging` emit a `{kind:'trip'}` subject. **§3 ×2 close**, and the
>   two lines that close are **retired rather than fixed**: A-13 authorises replacing §3's first
>   assertion with the tripwire, and the second measured a call the same ruling orders deleted, so
>   it now checks what A-13 actually requires of the test file. BUILD-NOTES **KD-49**.
> - **One number the ruling stated that measurement moved.** A-11 assertion 4 says `unbooked_ticketed`
>   fires **three** times on the reference trip; it fires **ten** (the *three* are §2.7's three named
>   fixture cases). The test keeps A-11's shape with the measured count and additionally asserts the
>   three named cases are among the ten. BUILD-NOTES **KD-48**.
> - **Verified, this pass:** `npm run typecheck` clean · `npm run test:tap` **554 pass / 0 fail**
>   (539 at `78b490f`; +15 — 7 in the new `horizonGate.test.ts`, 7 net in `retirementGate.test.ts`,
>   1 in `packages/client/test/retirement-clock.test.ts`) · `qa/r13-gate-citykey.mjs` **11 FAIL → 0**
>   · `npm run golden` byte-identical, sample sha unmoved at `40955ca0b182`. Not run: any browser
>   probe — nothing in `apps/web` changed.

> **Builder follow-up, 2026-08-27 (after `be1ed01`) — R13-6 is CLOSED.** Scope was A-14 and
> nothing else; R13-1…R13-5 were not touched by this pass (A-11/A-12/A-13 were built in a parallel
> pass over `conflict/`).
>
> - **R13-6.** `copyStopInto` rule 4 now runs A-14's three-step decision before any reuse search:
>   find the source's city by key, re-file by `normalizeCityName` onto the target's own key (lowest
>   `order`, then document position), or — no city of that name in the target — the place does not
>   travel and the stop keeps the coordinate (`{kind:'inline'}`, or `{kind:'none'}` when the source
>   place had no coordinate). No `Place` row is added in the third case and `target.cities` is never
>   touched. `normalizeCityName` is a new module, `packages/core/src/model/cityName.ts`, off the
>   export surface — 71 runtime symbols before and after. **§10 goes 1 FAIL → 0**, and the probe as
>   a whole 12 → 11; the remaining 11 are R13-1 ×7, R13-2 ×2 and R13-3 ×2. The pre-A-10 slug control
>   still passes, and `qa/r2-copy.mjs` and `qa/prov.mjs` are 0 FAIL.
> - **One consequence the finding did not name and this pass had to answer.** 14 of the A-6/A-6a
>   tests in `packages/core/test/geoCheck.test.ts` are built on a fixture that copies a place-linked
>   stop into a **Lisbon-only** trip. That is now A-14 step 3, so no `Place` travels and the
>   copy-borne place those tests measure stops existing. Every assertion was kept; the fixture's
>   trip gained a second city named after the source place's own city with no coordinates supplied,
>   which keeps the copy on step 2 while leaving the place unanchored. Reasoning: BUILD-NOTES
>   **KD-47**, which also records the two other judgment calls (a target place still carrying a
>   *source* key from a pre-A-14 copy is not matched and is duplicated once — no migration was
>   ordered; and step 3 clones the `LatLng` rather than aliasing it).
> - **Verified, this pass:** `npm run typecheck` clean · `npm run test:tap` **539 pass / 0 fail**
>   (was 524; +15) · `qa/r13-gate-citykey.mjs` **11 FAIL**, §10 clean · `qa/r2-copy.mjs` 0 ·
>   `qa/prov.mjs` 0 · `npm run golden` byte-identical. All of it run in a detached `git worktree` at
>   `be1ed01` carrying only this pass's files, because a parallel builder was editing `conflict/` in
>   the same tree. **Not run:** any browser probe (nothing under `apps/` changed); Node 24.

### R13-1 — the clock still retires a dismissal, and A-9 named the door it left open

Worth the prose because the reasoning is the evidence, and because it is the one finding that
re-opens a closed one.

A-9 deletes `unbooked_ticketed`'s `delta < 0` guard and keeps `delta > UNBOOKED_HORIZON_DAYS`,
with an argument stated in the ruling itself: *"as a clock advances `delta` only shrinks, so the
60-day horizon can only ever admit a finding, never withdraw one."* Every word of that is true
**of a monotone clock**. `apps/web`'s `systemClock()` (`apps/web/src/ports/env.ts:12`) returns
the device's **local** date — deliberately, because §2.1 is wall-clock. A local date is not
monotone: it steps back by a day whenever the device moves far enough west, which is the second
half of every itinerary this product exists to plan, including its own reference trip
(Budapest UTC+2 → London UTC+1 → LA UTC−7). It also steps back when a user corrects a wrong
device clock.

Measured (`qa/r13-gate-citykey.mjs` §1.2 in core, §1.3 through the real store and a real
`memoryStorage` port). One ticketed, priced, unbooked stop on a day exactly 60 days out:

- dismissal recorded at `today = 2026-01-01`, `delta = 60` → the rule fires, the row is live;
- the device date steps back one day to `2025-12-31`, `delta = 61` → **the rule withholds, and
  `detectUngated` withholds it too** (§1.1: `detectUngated` returns 0, not 1). This is the whole
  defect in one line — §8.2's gate is skipped for the un-gated set, but the rule's own horizon
  is not, because it lives inside `rule.run`;
- `syncResolutions(trip, '2025-12-31')` therefore reads *"not in the set"* as *"fixed"*:
  `retiredAt = "2025-12-31"`, `revision 4 → 5`, a different trip reference;
- through the store the same sequence writes the retirement to storage — one `getDerived()`
  after the clock moves, no keystroke;
- and because retirement is monotone (A-5, A-5a, A-5b), moving the clock back to `2026-01-01`
  restores nothing. The finding returns carrying `resolution: null` and the detail line *"You
  dismissed this on 2026-01-01 and it went away; it has come back."* — the sentence A-9 exists
  to stop being false.

What makes this a design finding rather than a build one: the builder implemented A-9 exactly,
including the greppable invariant A-9 asked for (`ctx.today` appears in exactly one rule file —
verified, §9). The invariant A-9 *claims* that grep establishes — *"§8.2's gate is the only
clock-driven suppression in the system"* — is false, and the grep cannot see it, because the
surviving suppression is in the one file the grep permits. The fix is a ruling: either the
far-future horizon moves out of `rule.run` into something `detectUngated` can disable the way it
disables the gate, or `syncResolutions` stops treating a horizon-withheld finding as evidence of
a fix. Both are A-9-shaped decisions.

### What I attacked on I-3a / I-4a and could **not** break

- **§8.2's gate × retirement, both directions.** Seven clock steps — `2026-08-01`, `25`, `27`,
  `30`, `2027-08-30`, `2019-01-01`, `2026-08-26` — applied in sequence to a document with a live
  dismissed `missing_lodging`: **the same trip reference comes back every time**, `retiredAt`
  stays `null`, `revision` never moves.
- **The point of §2.7 is not lost.** A genuine fix (book the lodging) retires at a post-gate
  clock, at a pre-trip clock, and through the store into storage (`retiredAt: "2026-09-10"`).
  An *unrelated* edit at a post-gate clock retires nothing.
- **`syncResolutions`' two early returns.** No live row → same reference (incl. a document whose
  only rows are already retired). `''`, `'yesterday'`, `'2026-13-45'`, `'26-08-30'`, `undefined`
  and `null` as `at` → same reference, live rows intact. This also closes the §1.7 un-padded-
  `today` crash *for retirement*: `isIsoDate` refuses `'2019-3-5'` before `detectUngated` sees it.
- **`detectUngated`'s containment.** Off `index.ts`, named by nothing outside `packages/core`,
  no deep module-path import from `packages/client`/`apps/web`/`cli.ts`, and absent from the
  built bundle.
- **A-10 against hostile names.** 22 of them, listed above; 22 distinct keys, no collision, no
  reserved shadow, no prototype mischief, and the document round-trips.
- **A-10 against previously-tolerated documents.** The `"-"` collision opens through `fromJSON`,
  `migrateDoc` and `importDoc`; the Library row renders (`cityCount: 2`); `validateTrip` is the
  only thing that complains, which is exactly what A-10 specified.
- **The reference trip.** Keys still `vienna,dubrovnik,split,prague,budapest,london`; validation
  issues still 11; conflicts still 2 blockers / 4 warnings / 11 notes at `FIXTURE_TODAY`; the
  un-gated set on the completed trip is strictly larger than the gated one (17 vs 5) and contains
  every gated finding.
- **Both byte-identity claims, re-derived rather than trusted** — the worktree diff and the
  double golden regeneration described in the status note.
- **`store.retireResolutions`' new `cache !== prev` cost control.** I could not find a sequence
  where it skips a retirement that should have happened: `derivedFor`'s key is
  `(document identity, today)`, and any document change produces a new identity, so a cache hit
  genuinely means retirement already ran for that pair.

### Confirmed by design, recorded so nobody re-derives them (round 13)

- **`createTrip` honours an explicit `key: ''` verbatim and nothing reports it.** A-10 says
  *"when it is present it is honoured verbatim"* and `createTrip.ts:96` says `''` is a key on
  purpose. Equality-only consumers all behave (`poolFor`, `daysForCity`, `cityRange`,
  `orderedCities`, `tripSummary`), and the document round-trips. Not filed.
- **`createTrip` still accepts a non-string `key` (e.g. `5`) and produces a document `fromJSON`
  refuses** at `$.cities[0].key` — P2-7's harm class. **Pre-existing, not I-4a's**: at `23f37b9`
  `CityInit.key` was required and equally unvalidated. Reachable only past TypeScript.
- **`PastTripForm` reads the minted key back off the created document** and guards with
  `if (key)`, so an empty key would silently skip the whole day loop — unreachable while
  `createTrip` mints, and correct as written.
- **Two cities with the same name in one trip now get two keys** where the slug gave them one.
  A-10's cross-trip identity is by normalised name, so this is the ruling working, not a defect.
- **No CSS truncates a conflict summary** — `.stop__conflict` and `.conflict` wrap; the only
  `text-overflow: ellipsis` in `apps/web` is on `.spine__daytitle`, which renders `day.title`.
  So R13-5 is a grammar defect, not a layout one.


> Phase 2 **2a** breaker pass: I-0…I-4 plus the KD-38 / absent-`ownerId` follow-up):**
>
> | | |
> |---|---|
> | **Scope** | Exactly the two commits `f26905d` and `5a3c723` and what they land: `lifecycle()`, `Trip.datePrecision`, `Rule.class` + the `detect.ts` feasibility gate, `PastTripForm.tsx` (incl. KD-38's city assignment), and the `fromJSON`/`importDoc` absent-`ownerId` fix (KD-40). Phase 1's open list (R8-3, R8-4, R10-1, R5-2, R6-1/2, the round-3 MINORs) was **not** re-litigated — the suite and the probe board were re-run to confirm no regression, and that is all. I-5…I-11 were not touched. |
> | **BLOCKERS** | **0.** No data loss, no privacy leak, no wrong-person's-data path in this batch. |
> | **The four angles** | **1. Feasibility gate — PASS**, with one MINOR (P2-4) and one design finding adjacent to it (P2-1). All ten classes match §8.2's table; integrity findings are byte-identical before and after `endDate`; `subjectDate` is correct for all seven ref shapes incl. the pool/place/trip/unknown-id fallbacks; ruling 1's asymmetry, ruling 3's no-clock case and `today:''` all behave. On the **real** trip at the **real** clock the gate suppresses exactly **2 warnings**, both `missing_lodging` (Budapest 3 nights, London 1 night) — the live defect, closed, with no blocker suppressed. **2. `datePrecision` — PARTIAL**: the greppable ceiling holds under my own walk (0 hits under `conflict/`, `derive/`, `validate/`, 0 in `packages/client`), 11 malformed values are refused with `$.datePrecision`, absent → `'exact'` both ways, undo/redo at depth 50 carries it — but **`mergeTrips` drops it** (P2-3, MAJOR) and `setTripMeta` does not runtime-guard it (P2-7). **3. The past-trip form — PARTIAL**: KD-38's fix is real and holds in Chromium (31/31 and 365/365 days carry the city, criterion 3 still reads zero on screen, a straddling trip with a real city behaves) — but the city **key** derivation breaks on the phase's own headline case (P2-2, MAJOR) and one Ctrl+Z peels the assignment (P2-5). **4. `ownerId` — PASS on the check that mattered**: a present foreign owner is still refused with `ForeignDocumentError`, nothing installed, nothing written; 8 non-string shapes still fail the parse at `$.ownerId`; absent, `null` and `''` are all adopted as the local owner, and `''` is not a legal `UserId` anywhere (`validateTrip` calls it `owner_missing`, an error). One design question remains (P2-8). |
> | **NEW in round 12 — MAJOR (3), MINOR (5)** | **P2-1** (architect) the gate × §2.7: a dismissal is **retired by the clock alone**, and merely opening a finished trip dirties and rewrites it. **P2-2** (architect) `東京` and `京都` both become city key `"-"`; nothing validates duplicate city keys. **P2-3** (builder) `mergeTrips`' `TRIP_FIELDS` omits `datePrecision`, so the other tab's change is discarded *and unreported*. Plus **P2-4** (rule_error gated), **P2-5** (Ctrl+Z peels the day loop), **P2-6** (the Library states exact dates for a fuzzy trip), **P2-7** (`setTripMeta` accepts a value `fromJSON` refuses), **P2-8** (an ownerless foreign document is adopted unmarked). |
> | **Numbers, my own runs at `5a3c723`** | `npm run test:tap` **479 pass / 0 fail** · `npm run typecheck` clean · `npm run web:build` clean · `qa/baseline.mjs` **0 FAIL** (2 blockers / 4 warn / 11 notes; geoCheck 0/112, 0/94, 112/112, 92/94) · `qa/accept.mjs` **28 pass / 0 fail** · `qa/r2-import.mjs` **0 FAIL** · `qa/prov.mjs` **0 FAIL** · `qa/p2-pasttrip.mjs` in real Chromium **0 FAIL**, 30 assertions · `qa/r2-constraints.mjs` **1 FAIL** (R2-18, the known determinism-grep gap). Every number the builder reported reproduces. |
> | **`cairn-constraints`, re-checked directly** | Zero runtime dependencies (`core` `{}`, `client` `{"@cairn/core":"*"}` — workspace-internal); no `Date.now()`/`Math.random()`/`crypto.randomUUID()` anywhere in `packages/core/src` or the reducer (only doc comments naming them); no DOM, no `window`, no React import in `packages/client/src`. |
> | **Read-only boundary** | `europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo root: **untouched** (`git diff --stat HEAD --` on all three is empty; the only new files anywhere are `cairn/qa/p2b-*.mjs`). |
> | **Gate verdict** | **2a is shippable-with-follow-ups, not clean.** 0 BLOCKER, 3 MAJOR. Nothing in the batch is a reason to stop 2b — but **P2-1 and P2-2 should go to the architect before I-6**, because I-6's `cityKeys` widening consumes exactly the day/city data P2-2 corrupts, and P2-1 is a rule about when a finding leaving the set means "fixed". P2-3 is a builder patch of one array literal. |
>
> **New probes this round:** `qa/p2b-gate.mjs` (headless, **19 FAIL by design** — §1.8 P2-4, §1.10/§1.11 P2-1, §2.5 P2-3, §2.6 P2-7, §2.7 P2-6, §3.3 P2-2, §4.6 P2-8; everything else in the file is a confirmation that must stay at 0) and `qa/p2b-past.mjs` (Chromium, **6 FAIL by design** — §2f P2-5, §3 P2-2, §4 P2-6). Neither is timing-dependent; both are deterministic call/click sequences.
>
> **The round-11 status note below is superseded by this one** and is kept as the record of
> what was true at `c6c6e2b`.

> **Status (as of `master` @ `c6c6e2b`, independently verified 2026-08-27 — round 11, the
> final gate re-verification of the two R10 fixes, two items only):**
>
> | | |
> |---|---|
> | **Scope** | Exactly two things: **R10-3** (the merge → Ctrl+Z → storage-overwrite BLOCKER) and **R10-2** (the `StopEditor` door past A-6a's prune), plus a full-suite/typecheck regression check. R10-1, R8-3, R8-4 and every round 2–7 open item were **not** investigated. |
> | **R10-3 — FIXED, closed** | The exact original repro is closed. `qa/r10-mergeundo.mjs` is **0 FAIL** (was 2): after the merge `history.past` is 0, Ctrl+Z is a no-op, and **storage** (the bytes the port was handed, re-parsed) still reads `title="OTHER TAB"` with the chip on *Saved*. `store.test.ts`'s new `QA R10-3` test asserts on `core.fromJSON(storage.docs.get(tripId))` — genuinely the persisted payload, not in-memory state. Adversarially, past the builder's test (`qa/r11-recheck.mjs` §1): a **non-empty `future`** at merge time (two pending redos) is cleared too and three Ctrl+Shift+Z after the merge restore nothing; six pre-merge snapshots plus **ten** Ctrl+Z leave storage intact. |
> | **R10-2 — FIXED, closed** | `qa/r10-prune.mjs` **ALL OK** (§5 was 1 FAIL) and `qa/r10-editdoor.mjs` in real Chromium **0 FAIL** (was 1) — six user actions, and the copy-borne `Place` is read back out of IndexedDB as *pruned*, 0 orphans, no third blocker. Adversarially (`qa/r11-recheck.mjs` §2): `place → {kind:'none'}` prunes; a re-point to a **different** place prunes the one it left; a **pooled** copy prunes; `moveStop` and `reorderStop` **cannot** change `place` at all (§2.10 holds — nothing to prune there); the over-prune guard survives a second linker **in the pool**; and the `updateStop` **action** (the one `StopEditor` dispatches) prunes through the reducer. |
> | **Red/green, re-derived independently** | The six new tests were run against the **pre-fix** product code (worktree at `83627f7`): **4 fail / 73 pass**. The two that pass there are the two that assert *non*-pruning. The builder's red/green claim is accurate and the tests are aimed at the real defects. |
> | **Numbers, my own runs** | `npm run test:tap` **426 pass / 0 fail**, `npm run typecheck` clean, `npm run web:build` clean. No regression anywhere in the Phase 1 persistence/geo suite (R2-1, R3-1…R3-4, R4-1/2, R5-1/2, R7-1…R7-3, R8-1/R8-2, A-1…A-6a are all covered by that suite and all still green). |
> | **NEW in round 11 — BLOCKER (1), pre-existing, NOT the R10-3 mechanism** | **R11-1** — if the user types **while the merge write is in flight**, `writeAndSettle`'s `stillOurs` guard declines to install the merged document, and the un-merged local document is then autosaved over storage under the **post-merge** `savedVersion`. The other tab's edit is destroyed in storage, silently, chip on *Saved*. **No undo is involved** — the control run with zero keystrokes of undo loses it identically — and it reproduces byte-identically at `83627f7`, i.e. the R10-3 fix neither caused nor cures it. |
> | **Gate verdict** | **Both items under test are CLOSED. 0 BLOCKER and 0 MAJOR among findings the gate has already routed.** R11-1 is new, is a race rather than a deterministic keystroke, and is a *design* question about what a merge owes a document the user has since typed into. Everything else open (R10-1 MINOR, R8-3/R8-4 MAJOR-but-unreachable, the round-7 MINOR list) is unchanged and disclosed. |
>
> **New probe this round:** `qa/r11-recheck.mjs` (headless — §1 R10-3 beyond the builder's
> test, §2 R10-2 beyond it; **2 FAIL, both R11-1**, everything else 0 FAIL).
>
> **The round-10 status note below is superseded by this one** and is kept as the record of
> what was true at `9ced6e7`.

> **Status (as of `master` @ `9ced6e7`, independently verified 2026-08-27 — round 10, the
> narrow A-5b / A-6a gate re-verification, two items only):**
>
> | | |
> |---|---|
> | **Scope** | Exactly two things: **A-5b** (`redo()` releases the retirement ledger under the four-clause rule; `undo()` unchanged) and **A-6a** (`removeStop` prunes the one `Place` a copied stop orphans, under its four clauses, and nothing else). Nothing else was investigated. **R8-3, R8-4 and every round 2–7 open finding were deliberately not re-run.** |
> | **A-5b — PASS** | Implemented exactly as §2.7 revision 7 states: release-then-`set`, one emit, four clauses, `undo()` carries no release. **R9-1's own Chromium repro `qa/r9-redo.mjs` is 0 FAIL** (was 2). Adversarial beyond the builder's test (`qa/r10-redo.mjs`): redo with an empty future, redo of an unrelated action with a mark held, undo of an `unresolveConflict` (the one shape a `rowsFor` rule would fire on), two interleaved conflicts, the 50-entry history limit (50 undos + 50 redos), an A→B→A trip switch, and a `mergeWithStored` reseed with a live future — all clean, the A-5b invariant asserted after every step. One MINOR residual, **R10-1**. |
> | **A-6a — PASS** | All four clauses correct and no over-prune anywhere I could reach (`qa/r10-prune.mjs`): pool removals, day→pool moves, accepted copies, rejected copies, copy-of-a-copy, a stop id duplicated across a day and the pool, purity, one revision bump, `samePlace` reuse with a user stop still linking, the ONE documented cost, undo/redo through the store, and the real fixture at scale (**2 blockers, 92→92 places, 61 orphans untouched, `place-68` still blocks under +1°**). `qa/r9-geo.mjs` is **ALL OK** (was 3 FAIL). |
> | **NEW in round 10 — BLOCKER (1), MAJOR (1), MINOR (1)** | **R10-3 (BLOCKER, out of the two-item scope, found while probing `redo`)** — `mergeWithStored` does not clear the undo history, so **one Ctrl+Z after a merge writes a pre-merge snapshot over storage and destroys the other tab's saved edit**, silently, with the chip reading *Saved*. **R10-2 (MAJOR)** — R9-2's orphan is still reachable through `StopEditor`: typing coordinates into a copied stop replaces its place link, no `removeStop` runs, and the fixture carries a third `geo_outlier` blocker naming `place-copy-1` again. **R10-1 (MINOR)** — `qa/r9-ledger.mjs` §1.2c/d still FAIL: with two Ctrl+Z's instead of one, A-5b clause 2 declines because the document `undo` pushed into `future` is the re-asserted one. |
> | **Not regressions** | R10-1, R10-2 and R10-3 all reproduce identically at `9ba5aec` (pre-implementation worktree). The A-5b/A-6a diff introduced none of them. |
> | **Numbers, re-derived** | `npm run test:tap` **420 pass / 0 fail**, `npm run typecheck` clean, `npm run web:build` clean — the builder's numbers are accurate. |
> | **Gate verdict** | **The two items under test are clean: A-5b PASS, A-6a PASS.** The Phase 1 gate is **not** clean, on findings adjacent to them: **1 BLOCKER (R10-3), 1 MAJOR (R10-2)**, plus R8-3/R8-4 (MAJOR, untouched since round 8). **Recommend SEND BACK — architect first for all three new items.** |
>
> **New probes this round:** `qa/r10-redo.mjs` (headless, 3 FAIL — all R10-1), `qa/r10-prune.mjs`
> (headless, 1 FAIL — R10-2 §5), `qa/r10-editdoor.mjs` (Chromium, 1 FAIL — R10-2 end to end),
> `qa/r10-mergeundo.mjs` (headless, 2 FAIL — R10-3).
>
> **The round-9 status note below is superseded by this one** and is kept as the record of
> what was true at `773f8ea`.

> **Status (as of `master` @ `773f8ea`, independently verified 2026-08-27 — round 9, the
> narrow A-5 / A-5a / A-6 gate-verification pass, four items only):**
>
> | | |
> |---|---|
> | **Scope** | Exactly four things, all new since round 8: **(1)** R8-1 — retirement across undo with the A-5a veto added; **(2)** KD-36 case 1 — a second dismissal surviving further edits; **(3)** KD-36 case 2 — the same case surviving a storage round-trip / reseed; **(4)** A-6 — copy-borne `Place` exemption and its behaviour at acceptance. R2–R7 were **not** re-litigated. **R8-3 and R8-4 were not investigated** — both remain open, disclosed and out of scope, and both still FAIL in their round-8 probes (`r8-geo.mjs` 1 FAIL, `r8-persist.mjs` 1 FAIL, exactly as the builder reported). |
> | **FIXED — verified closed on my own evidence** | **R8-1** (undo does not un-retire, at six undo/redo depths, after a trip switch, after a reopen, and with a second dismissal interleaved) and **R8-2** (the copy path mints no `geo_outlier` blocker: two source trips, `samePlace` reuse, one-of-two acceptance, both-accepted, `every`-not-`some`, and the user-authored→copy-only handover all behave as A-6 rules). `qa/r8-undo.mjs` in Chromium **0 FAIL**; `npm run test:tap` **412 pass / 0 fail** (the builder's number, re-run). |
> | **NEW in round 9 — MAJOR (2)** | **R9-1** — **Redo** does not release the retirement ledger, so redoing a dismissal the user just undid produces a **stillborn** dismissal: the conflict renders unresolved and the row is stamped `retiredAt` in the document permanently. KD-36's own symptom (*"never un-retires" implemented as "never resolve again"*) through the one door A-5a's veto does not cover. **R9-2** — deleting a copied stop **orphans** the `Place` `copyStopInto` rule 4 dragged in, and A-6 clause 1 measures an orphan at `'certain'` — so Browse → Copy → **×** puts a third `geo_outlier` **blocker** on the real fixture, naming `place-copy-1` (*Blue Cave, Biševo*). R8-2's own symptom sentence, one click later. |
> | **Reachability, stated plainly** | **Both are reachable in the shipped UI.** R9-1 reproduced end to end in Chromium in seven user actions (`qa/r9-redo.mjs`): the Conflicts panel's *"Not a problem"* (`Panels.tsx:72`), `Ctrl+Z` and `Ctrl+Shift+Z` (`App.tsx:33`; there is also a Redo button, `TripView.tsx:54`). R9-2 uses `BrowsePane.tsx:35`'s copy button and `DayTimeline.tsx:192`'s unconditional `×`. |
> | **BLOCKERS** | **None.** No data loss, no privacy leak, no wrong-person's-data path in any of the four items. R9-1 is recoverable (pressing *"Not a problem"* again works — that path releases); R9-2 is a false blocker, not a lost record. |
> | **What I tried and could NOT break** | Ten sequential further edits after a second dismissal; edits on the conflict's **own** subject day; an id-moving edit and back; a **third** dismissal with three rows for one `conflictId`; five close/reopen round trips with an edit between each; an A→B→A trip switch; the `mergeWithStored` reseed path; a genuine retirement occurring while a live row for the same id is present (§1.4). On A-6: two source trips reusing one `Place` via `samePlace`; accepting one of two copies, then both; the user deleting their own linking stop; the user adopting a copy-borne place; and `rejectCandidate` (which leaves the stop badged in the document, so the exemption correctly survives). All clean. |
> | **Gate verdict** | **NOT clean: 0 BLOCKER, 2 MAJOR on the four items under test.** The three ledger obligations A-5a names are all met and the A-6 rule is right as written — but each of the two rulings has one adjacent door left open, and both are user-reachable, and both are the *same defect the ruling was written to close*, reached one action further along. **Recommend SEND BACK — architect first for both** (R9-1 changes A-5's *"nothing else releases"* closed list; R9-2 changes A-6 clause 1's *"an orphan is measured at certain exactly as today"*). Neither is a builder-only patch. |
>
> **New probes this round:** `qa/r9-ledger.mjs` (headless, 4 FAIL by design — all one root
> cause, isolated in §4), `qa/r9-geo.mjs` (headless, 3 FAIL by design — §4.2/§4.3 synthetic,
> §5.2 on the real fixture), `qa/r9-redo.mjs` (Chromium, 2 FAIL by design).
>
> **The round-8 status note below is superseded by this one** and is kept as the record of
> what was true at `0a58c81`.

> **Status (as of `master` @ `0a58c81`, independently verified 2026-08-27 — round 8, the
> narrow gate-breaker pass over the SEND-BACK work only):**
>
> | | |
> |---|---|
> | **Scope** | The diff `5bdd0dc..0a58c81` and nothing else: B-1…B-7 plus the architect's A-1…A-4. R2–R7 were **not** re-litigated; the 387-test suite and typecheck were confirmed clean by the orchestrating session and were not re-derived here. |
> | **PASS — verified on my own evidence** | **B-1** (`travelLine`, §2.12 arithmetic incl. midnight, missing/malformed `HH:MM`, a pooled `journey`, and no arrival maths leaking onto `transfer`/`unknown`). **B-3** (credit renders in all four stop-rendering views; no other record class can carry a non-null `attribution`). **B-4/A-3** (bound exhaustion reproduced for real: 5 writes, `status:'error'`, `FLUSH_EXHAUSTED_MESSAGE` verbatim, debounce re-armed, banner clears when the re-armed write lands, nothing lost; the `'error'` exit correctly does **not** re-arm). **B-5** (7 dist hits → **3**, and all three are the two justified `NOT_CREDENTIALS` false positives — `DE4345` and `Booking 338 441 5948` are gone; the rule is derived and red-greened). **B-7** (symlinked file, symlinked directory, `--force`, `..` traversal and the `cairn-backup` sibling prefix all refused; no-clobber exits 3). **A-4** (69 runtime symbols; nothing in `apps/web`, `cli.ts`, `tools/` or `fixtures/` reaches past `core/src/index.ts`, static or dynamic). **B-6's R7-1/R7-2 halves** (merge guard holds, zero unhandled rejections). |
> | **NEW in round 8 — MAJOR (4)** | **R8-1** — `store.undo()` restores a pre-retirement snapshot, so a dismissed **blocker** comes back *"Marked dismissed"* after Ctrl+Z; §2.7's *"never un-retires"*, opened by B-2's own fix. **R8-2** — one Browse-and-copy click mints a third `geo_outlier` **blocker** on the real fixture, via the `Place` `copyStopInto` rule 4 drags across; A-1 exempts the copied stop and not the place. **R8-3** — accepting a copied stop can **replace** the adjacent-day anchor and mint a blocker on a stop the user wrote themselves; A-1's monotonicity claim is false for `adjacent_day`. **R8-4** — `mergeWithStored`'s off-chain `load()` lets a merge already in flight resurrect a trip the delete link just removed (`in storage=true in library=true` — R7-3's own measurement, through a different door). |
> | **Reachability, stated plainly** | **R8-1 and R8-2 are reachable in the shipped UI in four clicks each** (`qa/r8-undo.mjs` in Chromium; `qa/r8-geo.mjs` §1 through the store's own dispatch path). **R8-3 and R8-4 are not** — `acceptCandidate` has no control in `apps/web`, and `deleteTrip(activeTripId)` cannot be reached because `Library.tsx` renders only when `state.doc === null`. Both are still real violations of rulings written this revision. |
> | **BLOCKERS** | **None.** No data loss, no privacy leak and no wrong-person's-data path was found in the SEND-BACK diff. |
> | **Not gating, one line each** | `travelLine` prints *"(+1 day)"* for a run over 24 h, and renders `NaN:NaN` / `16:0.7000000000000455` for a `NaN` or fractional `arrival.mins` — none of which the importer, the UI or `JSON.parse` can produce. A day-map marker tooltip shows a copied stop's name with no badge or credit (§2.14 rule 7's fifth surface; pre-existing, out of B-3's scope). `FLUSH_EXHAUSTED_MESSAGE` is not on `packages/client`'s index while `CONFLICT_MESSAGE` is. A subscriber that throws inside `dispatch` aborts before `scheduleSave()`, so the edit sits dirty with nothing scheduled (R7-2's neighbour; the three §4.2 backstops still apply). |
> | **Probe rot confirmed, not patched** | BUILD-NOTES' status note is accurate on both counts: `qa/r6-flush.mjs` samples `status` 200 ms after the abort, and §4 above shows the re-armed write lands and clears the banner inside that window — the assertion is stale, not a defect. `qa/r5-freshness.mjs` §5.7 still crashes on `core.accept`. |
> | **Gate verdict** | **No BLOCKER. Four MAJORs, all in code or rulings this pass introduced or claimed to close.** R8-1 and R8-2 are user-reachable and both defeat a promise the gate review's own routing was written to obtain (§2.7's retirement rule; A-1's *"copying does not mint blockers"*). **Recommend SEND BACK for those two**; R8-3 and R8-4 can ride to a following pass on the reachability argument, provided they are written down rather than inferred. |
>
> **New probes this round:** `qa/r8-geo.mjs` (headless, 2 FAIL by design), `qa/r8-persist.mjs`
> (headless, 2 FAIL by design), `qa/r8-undo.mjs` (Chromium, 1 FAIL by design). The builder's
> `qa/r8-views.mjs` was re-run unmodified: **0 FAIL**, zero page errors.
>
> **The round-7 status note below is superseded by this one** and is kept as the record of what
> was true at `32a3839`.

> **Status (as of `master` @ `32a3839`, independently verified 2026-08-26 — round 7):**
>
> | | |
> |---|---|
> | **Fixed — verified closed on my own evidence, not the builder's** | **R3-3** (MAJOR) — `chainOntoSaving` is the only assignment to `saving` (`store.ts:185`, one hit in statement position, three call sites) and, structurally, `ports.storage.saveIfVersion` has **one** call site and `writeAndSettle` **three**, all inside it: no write path can opt out. Max writes in flight from one store is **1** (was **2**) in a three-way pile-up, in both merge branches and on the double-press path. In real Chromium the R3-3 sequence now ends with both tabs' edits in IndexedDB and the chip reading **"Saved"**. `qa/r7-chain.mjs` (**oracle: 10 FAIL at `584c218` → 3 at `32a3839`**), `qa/r7-browser.mjs` §1, `qa/r3-merge.mjs` 0 FAIL, `qa/r3-cas.mjs` A 0 FAIL. |
> | **NEW in round 7 — MINOR (3), all pre-existing at `584c218`, none a regression** | **R7-1** — `mergeWithStored()` re-entered before it settles leaves `status='conflict'` over a correctly merged document; **not reachable through the UI** (Chromium sweep at 0/30/80/150 ms: the second press never lands). **R7-2** — `emit()` has no per-listener error isolation and `scheduleSave`'s `void save(...)` turns a throwing subscriber into an **unhandled promise rejection**. **R7-3** — `deleteTrip` calls `ports.storage.delete` off the chain, so a queued expect-absent write resurrects a just-deleted trip; **not reachable through the UI** (Delete lives only in `Library.tsx`, which needs `state.doc === null`). All three → **builder**. |
> | **R6-1 / R6-2 — re-derived, not assumed** | Both reproduce exactly as filed (`qa/r7-r6recheck.mjs`, written this round, independent of `r6-flush.mjs`). **Both confirmed MINOR on my own evidence:** three backstops each run and each clean — the next keystroke re-arms and the edit lands; `registerPageExit`'s `visibilitychange`→`hidden` **and** `pagehide` both flush the disarmed edit; `beforeunload` still calls `preventDefault()` while dirty. The chip reads **"Unsaved changes"**, never "Saved". **No data-loss path.** |
> | **Still open, re-run and unchanged by `32a3839`** | **R3-6/R3-7/R3-8** (`qa/r3-pool.mjs`, 3 FAIL). **R3-9 + `qa/r3-cas2.mjs` §5–§7** (3 FAIL). **R2-6** (`qa/r2-access.mjs`, 1 FAIL). **R2-7** (`qa/r2-resolutions.mjs`, 1). **R2-9** (`qa/r2-data.mjs`, 1). **R2-18** (`qa/r2-constraints.mjs`). **R2-4** (`qa/r2-redact.mjs`, 7 hits). **R5-2 residual + R5-3** (`qa/r5-freshness.mjs`, 4 FAIL). **R5-4**. **R5-5/R5-2** (`qa/r6-actor.mjs`, 5 FAIL). **R6-1/R6-2**. **R3-1, R3-2, R3-4, R4-1, R2-11 stay closed** (0 FAIL each). |
> | **Round-7 numbers, my own runs** | `npm test` **333 pass / 0 fail** (counted with `--test-reporter=tap`), `npm run typecheck` clean on both projects, `npm run web:build` clean. The commit's and BUILD-NOTES' numbers are **accurate**. |
> | **Probe rot found this round, documented not patched** | `qa/r6-flush.mjs` §6's static check (`/^\s*saving = (?!saving)/`) now matches `chainOntoSaving`'s own `saving = run;` and falsely reports R3-3 open — one of its three FAILs is stale, the real R6-1/R6-2 count is **2**. `qa/r2-constraints.mjs`'s zero-dep check counts the workspace-internal `@cairn/core`; the root workspace declares no runtime dependencies at all, so `cairn-constraints` §2 is met and only R2-18 is real there. |
> | **Gate verdict** | **No open BLOCKER and no open MAJOR anywhere in the write/persistence path.** Everything still open there is MINOR, two of them UI-unreachable, and R2-6 is Phase-2-scoped by ROADMAP's own deliverables line (`access/ predicates.ts — defined now, enforced in Phase 2 — §6.2`), verified against that text this round. **Recommended for the manager's Phase 1 gate review.** |
>
> **The round-6 status note below is superseded by this one** and is kept as the record of what
> was true at `5f92145`.

> **Status (as of `master` @ `5f92145`, independently verified 2026-08-26 — round 6):**
>
> | | |
> |---|---|
> | **Fixed — verified closed on my own evidence, not the builder's** | **R5-1** (BLOCKER) — `flushForTransition` now re-asserts `dirty()` after every write and loops; the mid-flush edit reaches **storage** in all five affected transitions, in Node (`qa/r6-flush.mjs` §1–§2) and in real Chromium (`qa/r5-browser.mjs`, my own run: **0 of 5 delays lose the reorder**, was 5 of 5). **R5-2** (MAJOR) — `accepted_by_non_member` fires on all three missing-actor shapes plus seven more I constructed (`0`, `12345`, `true`, `{}`, `[…]`, `' '`, a real non-member), across **all four** ref kinds the rule claims (day, scheduled stop, pool stop, booking), with the reference-trip ceiling re-derived from the real fixture: **0 issues, 180 provenance records, 156 accepted, 0 attributed** (`qa/r6-actor.mjs`). **R5-5** (MINOR) — `core.accept`/`core.reject` are gone from the runtime surface (`typeof === 'undefined'`), the checked wrappers survive, nothing else references them; runtime export count 112 → 110. |
> | **NEW in round 6 — MINOR** | **R6-1** — exhausting `FLUSH_MAX_ATTEMPTS` returns `false` with `persistence.status === 'idle'`, and `App.tsx` renders a banner only for `'conflict'` and `'error'`: the click aborts the transition and **says nothing**. **R6-2** — the same path cancels the debounce timer on its final pass and never re-arms it, leaving a dirty document with **no scheduled autosave** (verified: no further write in 200 ms = ten debounce periods with the user idle). Both `qa/r6-flush.mjs` §3, both **builder**. |
> | **Independently red-green verified** | I reverted all three fixes in a scratch copy of the tree (never in `cairn/`) and re-ran the suite: **12 tests fail** — 7 R5-1, 2 R5-2, 3 R5-5. My own probes go from 3 FAIL → 12 FAIL (`r6-flush`) and 5 → 17 (`r6-actor`) against the same mutation. The tests are not passing for the wrong reason. |
> | **Still open, re-confirmed unchanged by `5f92145`** | **R3-3** (MAJOR — `qa/r3-merge.mjs` 2 FAIL, `qa/r3-cas.mjs` A, and three bare `saving =` assignments still in `store.ts`). **R3-6/R3-7/R3-8** (`qa/r3-pool.mjs`, 3 FAIL). **R3-9 + `qa/r3-cas2.mjs` §5–§7** (3 FAIL). **R2-6** (`qa/r2-access.mjs`, the malformed `expiresAt` still fails open). **R2-7** (`qa/r2-resolutions.mjs`). **R2-9** (`qa/r2-data.mjs`). **R2-18** (`qa/r2-constraints.mjs`). **R2-4** (`qa/r2-redact.mjs` — 7 hits, the same `DE4345` / `Booking 338 441 5948` doc-comment leak into `.js.map`). **R5-3** (`qa/r5-freshness.mjs` §2.4 still FAILs — the drain loop does not change it). **R5-4** (no timer in `apps/web`). All re-run this round; none fixed, worsened or masked. **R3-1, R3-2, R3-4, R4-1, R2-11 stay closed** (`qa/r3-undo.mjs`, `qa/r3-loss.mjs`, `qa/r4-switch.mjs`, `qa/r2-copy.mjs` — 0 FAIL each). |
> | **Round-6 numbers, my own runs** | `npm test` **331 pass / 0 fail** and `npm run typecheck` clean on both projects at `5f92145` — the commit's and BUILD-NOTES §5's reported numbers are **accurate**. `dirty.test.ts`'s 200-step walk re-run under five seeds (1, 7, 99, 20260827, 424242): 15/15 each. |
> | **Probe rot, untouched by design** | `qa/r5-freshness.mjs:602` still crashes on `core.accept` — that is the R5-5 fix taking effect, it is documented in BUILD-NOTES, and it was **not** patched. Everything before the crash (§1–§5) still runs and was used. `qa/r2-copy2.mjs` and `qa/r2-import.mjs` remain rotten from round 5. |
>
> **The round-5 status note below is superseded by this one** and is kept as the record of what
> was true at `c3c79b3`.

> **Status (as of `master` @ `c3c79b3`, re-verified 2026-08-26 — round 5):**
>
> | | |
> |---|---|
> | **Fixed and verified closed in round 5** | **R4-1** — `dirty()` is now reference identity against `persistence.savedDoc`; `savedRevision` is gone from `AppState`; the undo-then-a-different-edit sequence writes, in Node and in real Chromium (`qa/r4-browser.mjs` 4/4). **R4-2** — the port mints 16 fresh CSPRNG bytes per write, the `epoch`/counter/`meta` store are gone, and a token from a destroyed database is refused by its replacement (`qa/r4-epoch.mjs` 6/6). **The two other F2 instances** — `derived.ts` re-keys on `(document identity, today)` and `DayMap.tsx` depends on the cache object; both verified, and neither moves the bug elsewhere. **The R2-11 ruling's first half** — `acceptCandidate`/`rejectCandidate`/`copyStopInto` throw on `null`/`undefined`/`''` over the full ref matrix, with the input trip byte-identical and `revision` unmoved after every throw. |
> | **NEW in round 5 — BLOCKER** | **R5-1** — `flushForTransition()` decides the transition may proceed from `persistence.status` alone, sampled *after* its own flush. An edit dispatched while that flush is in flight is silently discarded by five of the six document-changing transitions, `isDirty()` then reads `false` because there is no document left to be dirty about, and the indicator reads "Saved". R4-1's category (a write that is never attempted for a document that differs from storage — §2.2b F1) surviving in the function the F1 fix was written for. Reproduced deterministically in Node **and 5/5 in real Chromium** with two clicks. |
> | **NEW in round 5 — MAJOR** | **R5-2** — `validateTrip`'s `accepted_by_non_member` excludes a falsy actor (`if (!actor \|\| …) return`), so an attributed, `state:'accepted'` record with `actorUserId` of `null`, `undefined` or `''` is never flagged; §2.9's own predicate has three conjuncts and this shape satisfies all three. **Classified (b), an implementation defect inside the approved design** — see the classification section. Not import-only: `addStop` copies `StopInit.provenance` verbatim and `accept()` is publicly exported with an unchecked `UserId \| null`, so two public calls mint it. |
> | **NEW in round 5 — MINOR** | **R5-3** — a store in `'conflict'` with **nothing** unwritten can never leave the trip: every transition re-flushes, is refused again, and aborts. **R5-4** — nothing in `apps/web` re-renders on a date change, so the derived cache's new `today` key is correct but is not consulted across midnight in an idle tab. **R5-5** — `core.accept`/`core.reject` are on the public export surface with `actorUserId: UserId \| null` and no runtime check, which is the R2-11 ruling's gate with a public bypass. |
> | **Still open, re-verified unchanged by round 5** | **R3-3** (MAJOR, `qa/r3-merge.mjs`, `qa/r3-cas.mjs` A — now **three** bare `saving =` assignments). **R3-6**, **R3-7**, **R3-8**, **R3-9** (MINOR, `qa/r3-pool.mjs`, `qa/r3-cas2.mjs` §5-§7). **R2-6** (`qa/r2-access.mjs`, six malformed `expiresAt` still `canView=true`). **R2-7** (`qa/r2-resolutions.mjs` — nothing in `apps/web` calls `store.syncResolutions()`). **R2-18** (`qa/r2-constraints.mjs`). **R2-9** (`qa/r2-data.mjs`). All re-run this round; none fixed, worsened or masked by `c3c79b3`. |
> | **Round-5 numbers, run rather than taken on faith** | `npm test` **318 pass / 0 fail**, `npm run typecheck` clean on both projects, at `c3c79b3` — the commit's and BUILD-NOTES' reported numbers are **accurate**. `qa/r4-browser.mjs` 4/4 ok, `qa/r4-epoch.mjs` 6/6 ok, `qa/r2-copy.mjs` 36/0 — all three re-run in Chromium/Node by the tester, matching the builder's report. |
> | **Probe rot, not a product defect** | `qa/r2-copy2.mjs:86` and `qa/r2-import.mjs:51` crash on `JSON.parse(await storage.load(id))`: `load()` has returned `{doc, version}` since `3a124a2` (§2.2a rule 4). They have not run since round 2. Left as-is — fixing them is not a product change and should not be smuggled into a QA commit. |
>
> **The round-4 status note below is superseded by this one** and is kept as the record of what
> was true at `3a124a2`.

> **Status (as of `master` @ `3a124a2`, re-verified 2026-08-26 — round 4):**
>
> | | |
> |---|---|
> | **Fixed and verified closed** | **R2-3** (`copyStopInto` credential leak, `b5c742b`). **R2-2** (the vanishing pool stop, `a746d75`). **R2-1** (the concurrent-save race) — closed by `a746d75` and no longer reopenable through undo. **R3-1**, **R3-4**, **R3-2** — closed by `3a124a2`'s §2.2a `StorageVersion` fence and flush-before-transition; all re-run, all clean. **R3-5** — closed *incidentally*: the fence no longer parses the stored record, so an expect-absent write can no longer match a corrupt one (`qa/r3-cas2.mjs` §3, 6/6 now `ok:false`). The builder reported R3-5 as untouched; it is in fact fixed. |
> | **NEW in round 4 — BLOCKERs** | **R4-1** — `dirty()` compares `Trip.revision` against `savedRevision`, and undo-then-a-different-edit re-issues a revision the store already wrote, so `flushForTransition()` skips the write and the trip switch proceeds over an unsaved edit with "Saved" on screen. R3-2, through the counter §2.2a left in place. **R4-2** — the §2.2a `epoch` is cached in the port closure and never re-read, so a tab surviving a storage wipe stamps the *recreated* database with the *dead* one's epoch against a counter that has rewound to 0; a token minted by a database that no longer exists is then accepted by its replacement, and the writer reads "Saved". R3-4's ABA, one level up, in the mechanism written to prevent it. |
> | **Still open, re-verified unchanged by round 4** | **R3-3** (`mergeWithStored` assigns `saving` instead of chaining — MAJOR), **R3-6**, **R3-7**, **R3-8**, **R3-9** (MINOR). **R2-6** (malformed `expiresAt` fails open), **R2-11** (`acceptCandidate` by a non-owner reads `'own'`), **R2-18** (the determinism grep skips `packages/client`). All re-run; neither fixed, worsened nor masked by `3a124a2`. `access/predicates.ts` and `build/copyStop.ts` are untouched since `1628ed4` / `b5c742b` — verified by `git log`, not assumed. |
> | **Deferred by contract, not by omission** | **R2-6** and **R2-11** are in `packages/core/src/access` and the provenance predicates. ROADMAP Phase 1's deliverables list `access/predicates.ts` as *"defined now, enforced in Phase 2 — §6.2"*, and no Phase 1 acceptance criterion asserts `canView` behaviour. R2-11's `displayStatus()==='own'` half **is** in a Phase 1 criterion (§D, *"nothing un-accepted and non-user ever returns `own`"*) and is genuinely unmet — see the round-4 classification below. |
> | **Not re-verified** | R2-4, R2-5, R2-7 through R2-10, R2-12 through R2-17, R2-19 through R2-21. Out of scope for rounds 3 and 4; treat them as the record of what was found. |
>
> **Round 4 numbers, run rather than taken on faith:** `npm test` **288 pass / 0 fail**,
> `npm run typecheck` clean on both projects, at `3a124a2` — the commit's reported numbers are
> accurate. `packages/core/src/build/pool.ts` is **not** in `3a124a2`'s diff (confirmed), so
> R3-6/R3-7/R3-8 cannot have moved. **BUILD-NOTES §6's Chromium gap is now closed by round 4,
> not by the builder:** the never-run "hide the tab, find the edit in IndexedDB" leg was run
> (`qa/r4-browser.mjs` §2, §3) and **passes** for both `visibilitychange`→`hidden` and
> `pagehide`.
>
> **The round-3 status note below is superseded by this one** and is kept only as the record of
> what was true at `a746d75`.

Tester, stage 3. Attacked `master` @ `fcceb56`, 2026-08-25. Node v22.22.2, Chromium via the
system Playwright driven over **real elapsed time** (no `--virtual-time-budget`).

This is a **fresh pass and it overwrites round 1's file.** Round 1's numbering (`F-n`) is kept
only for cross-reference; round 2's new findings are numbered `R2-n`. Every finding here was
run. Reproduction scripts are committed under `cairn/qa/r2-*.mjs` and named per finding.

**Result: 3 BLOCKER · 8 MAJOR · 11 MINOR.**

Round 1's two blockers: **F-1 is half closed** (the sequential two-tab case is genuinely
fixed; two tabs saving *at the same time* still lose an edit silently — R2-1). **F-2 is
closed.** The "a friend's trip displays as Jacob's own" defect (F-6) is **closed in core and
in the day view**, and re-opens in two places the contract also covers: the pool panel drops
the credit line (R2-8), and the copy carries the friend's credentials in free text (R2-3).

---

## How to reproduce anything here

```bash
cd cairn && npm install && npm run web:build     # dist is needed by two of the probes
node tools/serve.mjs &                            # http://localhost:4173
node qa/r2-copy.mjs qa/r2-copy2.mjs …             # headless probes, one per area
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-race.mjs      # browser probes
```

| script | area |
|---|---|
| `qa/r2-copy.mjs` | `copyStopInto` provenance: every escape path, credentials, chains |
| `qa/r2-copy2.mjs` | the copy through the client store: undo/redo, place copy, browse read-only |
| `qa/r2-browser.mjs` | Browse & copy driven in Chromium |
| `qa/r2-poolloss.mjs` | **R2-2** — a stop returned to the pool from a transit day disappears |
| `qa/r2-race.mjs` | **R2-1** — two tabs, same instant, one edit lost, both say "Saved" |
| `qa/r2-tabs.mjs` | the revision guard's sequential case + merge |
| `qa/r2-redact.mjs` | **R2-4** — the credential set derived from the trip, greped against `dist/` |
| `qa/r2-access.mjs` | **R2-6** — F-13 re-check and the share-date fail-open |
| `qa/r2-resolutions.mjs` | **R2-7** — `syncResolutions` has no caller |
| `qa/r2-data.mjs` | real-trip shapes; travelRole × geoCheck × copy interactions |
| `qa/r2-constraints.mjs` | `cairn-constraints`: determinism, DOM, zero-dep, coordinates in params |
| `qa/r2-import.mjs` | `importDoc` (F-2/F-6), storage failure, quota, corrupt documents |
| `qa/r8-geo.mjs` | **R8-2 / R8-3** — A-1's two promises about `geoCheck`, falsified |
| `qa/r8-persist.mjs` | **R8-1 / R8-4** — B-2 × undo; delete-as-chain-link × an in-flight merge; plus B-4 and B-6's R7-1/R7-2 halves as confirmations |
| `qa/r8-undo.mjs` | **R8-1** in Chromium — Ctrl+Z, and the blocker comes back *"Marked dismissed"* |
| `qa/r9-ledger.mjs` | **R9-1** — the A-5/A-5a ledger: undo/redo depth, the second and third dismissal, five reseed round trips, an A→B→A switch, the merge reseed |
| `qa/r9-geo.mjs` | **R9-2** — A-6's copy-borne `Place`: two source trips, one-of-two acceptance, the user-authored→copy-only handover, reject vs. remove, and the real fixture |
| `qa/r9-redo.mjs` | **R9-1** in Chromium — seven user actions, and the redone dismissal is stillborn |
| `qa/r10-redo.mjs` | **A-5b** past the builder's test — empty future, unrelated redo, undo of an `unresolveConflict`, two interleaved conflicts, the 50-entry limit, an A→B→A switch, a merge reseed, and the A-5b invariant after every step (**R10-1**) |
| `qa/r10-prune.mjs` | **A-6a** past `geoCheck.test.ts` — the four clauses one at a time, the anti-sweep guards, dangling references, undo/redo, the real fixture at scale, and the `updateStop` door (**R10-2**) |
| `qa/r10-editdoor.mjs` | **R10-2** in Chromium — six user actions, and the copy-borne `Place` is orphaned in IndexedDB |
| `qa/r10-mergeundo.mjs` | **R10-3** — one Ctrl+Z after a merge overwrites storage with a pre-merge snapshot |
| `qa/r11-recheck.mjs` | **R10-3 / R10-2 after the fix** — a non-empty `future` at merge time, ten undos, typing through the merge write (**R11-1**); and every other shape of a place-changing patch, `moveStop`/`reorderStop`, the pool, the over-prune guard |
| `qa/p2b-gate.mjs` | **Phase 2 2a, headless** — §1 the feasibility gate (classes, wholly-past, straddling, `subjectDate` × 7 ref shapes, ruling 1's asymmetry, no-clock, the `rule_error` claim, the retirement ledger, the Phase 1 ceiling); §2 `datePrecision` (own grep walk, 11 malformed values, migrate, round trip, undo/redo × 50, `mergeTrips`, `setTripMeta`, the summary row); §3 the form's document in Node; §4 `ownerId` absent / `null` / non-string × 8 / foreign / `''` / whitespace / the deleted-key bypass |
| `qa/p2b-past.mjs` | **Phase 2 2a, Chromium** — a straddling trip recorded through the real form with a real city; "a year" precision (365 days, 366 dispatches, one Ctrl+Z); a trip to Japan named in Japanese; the Library's range label vs the open trip's |

---

# Round 12 — Phase 2, **2a**: past trips and the trip lifecycle (`8df2ae6..5a3c723`)

Five commits, four increments plus one follow-up. **0 BLOCKER · 3 MAJOR · 5 MINOR.** The two
things this round was told to scrutinise hardest — the feasibility gate and the `ownerId`
change — are the two that came out cleanest; the damage is in the two places nobody was
looking: what a *slug* does to a city name that is not written in ASCII, and what the gate
does to a conflict a user had already dismissed.

**Baseline, all my own runs at `5a3c723`:** `npm run test:tap` **479 pass / 0 fail**;
`npm run typecheck` clean; `npm run web:build` clean; `qa/baseline.mjs` **0 FAIL**;
`qa/accept.mjs` **28 pass / 0 fail**; `qa/r2-import.mjs` **0 FAIL**; `qa/prov.mjs` **0 FAIL**;
`qa/p2-pasttrip.mjs` (the builder's own Chromium probe, re-run unmodified) **0 FAIL** across
30 assertions; `qa/r2-constraints.mjs` **1 FAIL**, which is R2-18 and known. Every number in
BUILD-NOTES' current status note reproduces.

| id | severity | file:line | defect | repro | routing |
|---|---|---|---|---|---|
| **P2-1** | MAJOR | `packages/client/src/store/store.ts:595` × `packages/core/src/conflict/resolve.ts:46` × `detect.ts`'s gate | The feasibility gate gives a conflict a **second** way to leave the detected set — the clock — and `syncResolutions` reads "not in the set" as "fixed", so **merely opening a trip after it ends permanently retires every dismissal of a feasibility finding**, mutates the document (revision +1) and leaves the store dirty with no user action. | `node --experimental-strip-types qa/p2b-gate.mjs` §1.10, §1.11 | **architect** → §2.7 **A-9** → ROADMAP **I-3a** — **CLOSED**, see the follow-up note below |
| **P2-2** | MAJOR | `apps/web/src/views/PastTripForm.tsx:97` (identical expression in `Library.tsx`'s new-trip form) | `name.toLowerCase().replace(/[^a-z0-9]+/g,'-')` maps **every** non-ASCII city name to the single key `"-"`. Recording *"日本 2019, 東京, 京都"* stores two cities that are the **same key**, puts `primaryCity:"-"` on all 30 days, and `validateTrip` reports **nothing** — there is no duplicate-city-key check. §8.1's own worked example is a trip to Japan, and I-6's `cityKeys` widening reads exactly this field. | `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/p2b-past.mjs` §3; `qa/p2b-gate.mjs` §3.3 | **architect** (what a `CityKey` is) → §2.2 **A-10** → ROADMAP **I-4a** — **CLOSED**, see the follow-up note below |
| **P2-3** | MAJOR | `packages/core/src/merge/mergeTrips.ts:189` | `TRIP_FIELDS` omits `datePrecision`, so a two-tab merge **discards the other tab's precision change and does not report it** — `report.fromRemote` and `report.overwritten` are both empty. The control (`title`, which is on the list) survives. §8.1 stores this field precisely because retrofitting it later is the expensive migration; losing it silently is the same loss on a smaller scale. (`homeBase` is missing from the same list — pre-existing, Phase 1, out of scope, noted so it is not re-derived.) | `qa/p2b-gate.mjs` §2.5 | **builder** — **CLOSED**, see the follow-up note below |
| **P2-4** | MINOR | `packages/core/src/conflict/detect.ts` (the `for (const c of produced)` gate line) | `detect.ts`'s own comment says *"a `rule_error` note … is never gated"*. It is: the synthesised note's only subject is `{kind:'trip'}`, ruling 2 resolves that to `trip.endDate`, and the note inherits the **crashing rule's** class — so a crashing **feasibility** rule is silent on every past trip. Control: a crashing **integrity** rule reports correctly. §0.5's *"a rule that cannot catch its own bug does not ship"*, applied to the catcher. | `qa/p2b-gate.mjs` §1.8 | **builder** — **CLOSED**, see the follow-up note below |
| **P2-5** | MINOR | `apps/web/src/views/PastTripForm.tsx:121-123` | The form's city assignment is one `setDayMeta` **per day**, so one button press is N+2 undo entries. One Ctrl+Z after recording a 365-day trip leaves **364 of 365** days attributed and one on `transit`, silently; and since the history limit is 50, a year-long trip can never be undone back to before it was recorded. | `qa/p2b-past.mjs` §2f (real Chromium, real IndexedDB); `qa/p2b-gate.mjs` §3.4 | **builder** |
| **P2-6** | MINOR | `packages/core/src/derive/summary.ts:60` + `apps/web/src/views/Library.tsx:126` | `TripSummaryRow` carries no `datePrecision`, so the **Library** — the screen a past trip mostly lives on — prints `2019-06-01 → 2019-06-30` for a trip the user recorded as *"June 2019"*. `dateRangeLabel` exists and is correct; it is wired only into `TripView.tsx:59`. This is I-2's own stated user-visible outcome, unmet on one of the two screens, and the convention it breaks is the absolute one. (The fix needs the row widened, which is I-6's job — so this may be a legitimate deferral, but nothing said so.) | `qa/p2b-past.mjs` §4; `qa/p2b-gate.mjs` §2.7 | **builder** — **CLOSED**, see the follow-up note below |
| **P2-7** | MINOR | `packages/core/src/build/createTrip.ts:109` (`setTripMeta`) | `setTripMeta(trip, {datePrecision:'fortnight'})` is accepted at runtime — `next = {...trip, ...patch}` with no enum guard, the same asymmetry KD-12 records for dates. The resulting document **serializes but cannot be parsed back** (`TripParseError @ $.datePrecision`), so a trip written that way is unopenable, and `validateTrip` reports nothing. Reachable only past the TypeScript types, which is why it is MINOR and not more. | `qa/p2b-gate.mjs` §2.6 | **builder** — **CLOSED**, see the follow-up note below |
| **P2-8** | MINOR | `packages/client/src/store/store.ts:1027-1028` | Deleting one key turns a refusal into an adoption: the same file that gets `ForeignDocumentError` with `"ownerId":"user:marta"` present is **adopted whole** with the key removed, carrying 91 stops whose `provenance.actorUserId` is still `user:marta`, and nothing marks it — `validateTrip` returns 0 ownership issues because `checkActor` short-circuits on `!attribution(p)`. §2.14 rule 1 does say absent is allowed and KD-40's reasoning is sound; the open question is whether "allowed" also means "adopt its foreign provenance unexamined". **The check that must not have weakened did not weaken** — see the confirmations below. | `qa/p2b-gate.mjs` §4.6 | **architect** |

> **Builder follow-up, 2026-08-27 (after `7fb753c`) — P2-3, P2-4, P2-6 and P2-7 are CLOSED.**
> Four routed fixes, verified by the tests below plus this round's own probes re-run unmodified.
> **P2-1, P2-2, P2-5 and P2-8 were not touched and remain open exactly as filed** (P2-1/P2-2 with
> the architect; P2-5 and P2-8 disclosed).
>
> | id | fix | evidence |
> |---|---|---|
> | **P2-3** | `TRIP_FIELDS` gains `datePrecision` — one array entry, no restructuring. Merged last-writer-wins per §2.2, and a change taken from the other tab is now **reported** in `report.fromRemote`. | 3 new tests in `packages/core/test/merge.test.ts` asserting the **merged document**: remote-only precision + local title both survive with `fromRemote` naming the field; the reverse direction; both-sides-changed resolves to local **and** appears in `report.overwritten`. `qa/p2b-gate.mjs` §2.5 ok. `homeBase` is still absent from the list, as this finding's own parenthesis says. |
> | **P2-4** | The comment was right, the code was wrong — fixed in code. The synthesised note inherited the crashing rule's `class`, so `detect.ts` now sets a `crashed` flag in the `catch` and the gate reads `!crashed && rule.class === 'feasibility' && …`. The exemption is the crash, not the id, so a live rule cannot claim it by minting `ruleId:'rule_error'`. | 2 new tests in `ruleClass.test.ts`; the second crashes **every** rule in turn and requires exactly one `rule_error` from each at `today:'2099-01-01'`. `qa/p2b-gate.mjs` §1.8 ok for both `missing_lodging` (feasibility) and the `geo_outlier` control. |
> | **P2-4 — a side effect worth your attention** | §1.7 of your own probe goes from ok to **FAIL at `3 vs 2`**: with an un-padded `today` (`'2019-3-5'`) `unbooked_ticketed` throws `invalid IsoDate`, and the gate was swallowing that crash report on a past trip. Pre-existing (your §1.7 divergence, and R2-14); the fix only stopped hiding it. **Not fixed** — validating `opts.today` is R2-14's scope. | reproduced directly: `detectConflicts(pastTrip, {today:'2019-3-5'})` returns exactly one finding, `rule_error: Rule unbooked_ticketed failed: invalid IsoDate: "2019-3-5"`. |
> | **P2-6** | `TripSummaryRow` carries `datePrecision`; `Library.tsx` renders `dateRangeLabel(row)` — the existing formatter, not a second one. One-field widening only; `cityKeys`/countries/`SUMMARY_VERSION` remain I-6's. | `qa/p2b-past.mjs` §4 in **real Chromium**, both halves ok: the rows read *"日本 2019 · June 2019 · 2 cities"* and *"Backpacking 2015 · 2015 · 1 city"*. `qa/p2b-gate.mjs` §2.7 ok. Plus a core test that the row carries the field and a `test/views.test.ts` ceiling that **no** view prints a raw `.startDate → .endDate` pair (one exemption: `PastTripForm`'s explicit *"Stored as …"* disclosure, whose justification is itself asserted). |
> | **P2-6 — one ceiling moved, deliberately** | Your §2.1 grep (*`datePrecision` nowhere under `conflict/`, `derive/`, `validate/`*) now reports **1 FAIL** for `packages/core/src/derive/summary.ts`. That is this fix: the Library lists rows read back from storage, not `Trip`s, so the row is where display gets the value. The core test now carries a **one-entry** exemption list plus a second test proving `summary.ts` cannot *branch* on the field (it names none of the three members, compares it nowhere, and mentions it exactly three times). Reasoning and the alternative in BUILD-NOTES **KD-41**. | — |
> | **P2-7** | `assertDatePrecision` in `createTrip.ts`, thrown from `setTripMeta` whenever the patch **has the key** (so `{datePrecision: undefined}`, which spreads the field away, is refused too) and from `createTrip` when the init names it. Follows `stops.ts`' `assertPatchable` shape: a clear throw, no coercion. | new tests: 11 invalid values through `setTripMeta` and 4 through `createTrip` all throw with `datePrecision` in the message; the three legal values still work through both doors and round-trip through `toJSON`/`fromJSON`. `qa/p2b-gate.mjs` §2.6 ok. |
>
> **Suite, my own runs after the fixes:** `npm run test:tap` **492 pass / 0 fail** (was 479);
> `npm run typecheck` clean; `npm run web:build` clean; `qa/p2b-gate.mjs` **19 FAIL → 13**;
> `qa/p2b-past.mjs` (Chromium) **6 FAIL → 4**; `qa/p2-pasttrip.mjs` 0 FAIL; `qa/baseline.mjs`
> 0 FAIL; `qa/accept.mjs` 28/0; `qa/r2-import.mjs` 0 FAIL; `qa/prov.mjs` 0 FAIL;
> `qa/r2-constraints.mjs` 1 FAIL (R2-18, known). The 13 remaining `p2b-gate` FAILs are P2-1 ×4,
> P2-2 ×4, P2-5, P2-8 ×2, the §1.7 crash above and the §2.1 ceiling above — no closed finding
> among them.

> **Builder follow-up, 2026-08-27 (ROADMAP revision 11, increments I-3a and I-4a) — P2-1 and
> P2-2 are CLOSED.** Both went to the architect as this table routed them; `ARCHITECTURE.md`
> §2.7 **A-9** and §2.2 **A-10** are the rulings and these two increments are the build.
> **P2-5 and P2-8 were not touched and remain open exactly as filed.**
>
> | id | fix | evidence |
> |---|---|---|
> | **P2-1** | §2.7 A-9, in full. `detect.ts`'s body is one private `runRules(trip, opts, gate)`; `detectConflicts = runRules(…, true)`, and a new `detectUngated = runRules(…, false)` that is **not** on `index.ts`. The gate line keeps every conjunct it had (including P2-4's `!crashed`) and gains `gate &&` at the front. `syncResolutions` becomes `(trip, at)` and detects the un-gated set **itself**, so no caller can hand it the gated one — the ambiguous argument is deleted rather than documented. Two early returns: no live resolution row, and no well-formed `at`. `store.ts`'s `retireResolutions` drops the set argument and runs **only when `derivedFor` returned a new cache**; the explicit `store.syncResolutions()` passes `true`. `unbooked_ticketed`'s open-coded `delta < 0` guard is deleted — §8.2's gate re-implemented inside a rule, which defeated A-9 by hiding a finding from `detectUngated`. | `qa/p2b-gate.mjs` **§1.10 and §1.11 now 0 FAIL** (were 4 FAIL); the assertions are verbatim, only the calls are two-argument, as A-9 says in writing any correct fix requires. 9 new core tests (`packages/core/test/retirementGate.test.ts`) covering A-9's assertions 1, 3, 4, 5, 6 plus the no-live-row early return, the greppable ceiling and `detectUngated`'s absence from the surface; 3 new store tests (`packages/client/test/retirement-clock.test.ts`) for assertion 2. **Measured, not assumed:** `detectConflicts` on the reference trip is byte-identical before and after at five clocks (`FIXTURE_TODAY`, 2026-08-10, 2026-08-27, 2027-01-01, 2019-01-01) and with no clock; `fixtures/golden/*` and `apps/web/src/sample/europe2026.json` are byte-identical; runtime export count 71 → 71. |
> | **P2-2** | §2.2 A-10, in full. `CityInit.key` is optional and `createTrip` mints `ctx.ids.newId('city')` when it is absent (`??`, so an explicit key — legacy import, every fixture — is honoured verbatim). The slug expression is **deleted** from `PastTripForm.tsx` and `Library.tsx`; `PastTripForm` reads the minted key back off the created document for its `setDayMeta` loop. `validateTrip` gains `duplicate_city_key`, `reserved_city_key` and `city_name_empty`, all `error`, all `ref:{kind:'trip'}`. `geoOutlier.ts`'s label helpers resolve a key to `City.name` (falling back to *"a city this trip does not have"* — KD-44 — rather than the raw key) while `params.cityKey` keeps the id. `fromJSON` is untouched: an already-collapsed document must **open**. | `qa/p2b-gate.mjs` **§3.3 now 0 FAIL** (was 4 FAIL) — rewritten to measure what `createTrip` stores rather than a local copy of the deleted expression, with the old slug's output kept beside it in the log for the record. 11 new core tests (`packages/core/test/cityKey.test.ts`): 東京/京都 yield two keys, two `daysForCity` results and zero issues; each of the three codes has an **injected-fault** test that also asserts the document still round-trips through `fromJSON`; `geo_outlier` reads *"the Vienna map"*; and two ship-gate greps — the slug expression appears nowhere under `apps/` or `packages/`, and no call site outside `packages/core` constructs a city key. Reference-trip validation issues 11 → 11, conflicts unchanged at every clock, goldens and sample byte-identical. |
>
> **Suite, my own runs after these two increments:** `npm run test:tap` **515 pass / 0 fail**
> (was 492); `npm run typecheck` clean; `npm run web:build` clean; `qa/p2b-gate.mjs`
> **13 FAIL → 5**; `qa/confid2.mjs` 0 FAIL. The 5 remaining are P2-5 (§3.4), P2-8 ×2 (§4.6),
> the §1.7 un-padded-`today` crash and the §2.1 `datePrecision`-in-`summary.ts` ceiling — all
> four pre-existing and disclosed above, none of them a finding this pass closed.

## P2-1 — the gate retires a dismissal by the clock (the one worth the prose)

The mechanism, isolated rather than inferred. `getDerived()` (`store.ts:595`) calls
`core.syncResolutions(doc, derived.conflicts, derived.today)` against a freshly-detected set.
`syncResolutions` (`resolve.ts:45-48`) stamps `retiredAt` on **every** live resolution whose
`conflictId` is not in that set, on the reading that a conflict which has gone away has been
fixed. Before I-3 that reading was sound: a conflict left the set because the document changed.
I-3 adds a second, document-independent reason — the clock passed the subject's date — and
`syncResolutions` cannot tell the two apart.

Measured (`qa/p2b-gate.mjs` §1.10, a five-day trip with a real city on every day):

- user dismisses `missing_lodging` before the trip → `retiredAt: null`, correct;
- day 1 of the trip, clock only → still `null`, correct;
- the day after the trip ends, clock only, **no user action of any kind** →
  `retiredAt: "2026-08-30"`, `revision 7 → 8`.

Through the real store (§1.11): a second store opens the same stored document a fortnight
later, calls `getDerived()` once — which is what rendering the conflicts panel does — and the
document comes back with the dismissal retired and `isDirty() === true`, i.e. **viewing a
finished trip schedules a write to it.**

Why it matters beyond the write. Retirement is deliberately **monotone**: `reassertRetirements`
never un-retires (§2.7 A-5, the R8-1 fix). So the retirement the clock caused is permanent, and
if the same `conflictId` ever comes back — the user corrects an end date, re-plans the trip,
edits the day the run was about — `detect.ts` renders it with *"You dismissed this on <date> and
it went away; it has come back."* That sentence is now capable of being false: it did not go
away because the user fixed it, and the user's dismissal no longer suppresses it. This is R8-1's
harm class reached through a door §2.7 was not written against.

Severity: **MAJOR, not BLOCKER.** The resolution row survives with its state and date; nothing
in the itinerary is lost; the write is one bounded revision bump per trip (the second open finds
nothing to change). It is filed **architect**, not builder, because the fix is a ruling —
`syncResolutions` needs to distinguish "no longer detected because the data changed" from "not
detected at this clock", and §8.2 does not say which one a gated finding is.

## What I attacked and could **not** break

- **The gate's classification.** All ten rules carry a class and all ten match §8.2's table
  exactly. On a purpose-built loud trip, 6 findings as a plan → 2 as history, and the integrity
  findings are **identical by id and by count**, not merely non-empty. No integrity rule goes
  quiet on a past trip.
- **`subjectDate`, every ref shape.** day → its own date; stop → its day's date; booking →
  `startsAt.date`; pool stop, `place`, `trip`, an unknown day id and an unknown booking id all →
  `trip.endDate`; an unrecognised `RefKind` does not throw. Ruling 2 is implemented, not claimed.
- **Ruling 1's asymmetry.** A past `booking_vs_plan` against a future stop survives the gate with
  one past and two non-past subjects — verified on the subjects themselves, not on the count.
- **Ruling 3.** `today` omitted, `today: undefined` and `today: ''` all produce byte-identical
  un-gated output; nothing throws and nothing invents a clock.
- **The Phase 1 ceiling.** 2 blockers / 4 warnings / 11 notes at `FIXTURE_TODAY`, unmoved.
- **The real defect, closed and quantified.** On Europe 2026 at the real clock the gate
  suppresses exactly **two** findings, both `missing_lodging` warnings (Budapest 3 nights, London
  1 night) — and **no blocker**. Measured by flipping every rule to `integrity` and diffing.
- **`datePrecision`'s greppable ceiling**, walked myself over every `.ts`/`.tsx` under
  `packages/core/src`: 0 occurrences under `conflict/`, `derive/`, `validate/`; 0 in
  `packages/client/src`; present in all five files §8.1 names.
- **`fromJSON` on `datePrecision`:** `'fortnight'`, `'EXACT'`, `'Exact'`, `''`, `'exact '`, `42`,
  `true`, `{}`, `[]`, `['exact']` and `null` all refused with `$.datePrecision`. Absent → `'exact'`
  through both `fromJSON` and `migrateDoc`; round-trip byte-identical with the field present and
  absent. 50 edits, 50 undos and 50 redos all carry it.
- **The `ownerId` refusal.** `user:marta` present → `ForeignDocumentError`, **nothing installed
  and nothing written to storage**; a `local:self` document offered to a store constructed with
  `ownerId: 'user:jacob'` → refused too (the Phase 3 shape). Eight non-string shapes (`42`, `0`,
  `true`, `false`, `{}`, `[]`, `['user:marta']`, `{id:…}`) all fail the parse at `$.ownerId` — no
  silent coercion. Absent and `null` behave identically. `''` is adopted, and `''` cannot be a
  legitimate `UserId` anywhere: `createTrip({ownerId:''})` yields a trip `validateTrip` calls
  `owner_missing` at level `error`. A single space `' '` is treated as a foreign owner and
  refused — asymmetric, but the safe direction.
- **KD-38's fix, in real Chromium.** 31 of 31 days on the month trip and **365 of 365** on a
  year trip carry the city, not the `transit` catch-all; criterion 3 still reads zero conflicts
  and zero validation issues **with** the city assigned, both in Node and on screen; the ceiling
  half (the same document is loud before its start date) holds. A straddling trip entered as a
  user with a real city on every day reads `active`, shows one `missing_lodging`, and nothing
  wholly past is rendered. The click reaches IndexedDB in **277 ms** for 365 days and 366
  dispatches — measured by polling, not by sleeping.
- **`cairn-constraints`:** zero runtime dependencies in `core`/`client`; no ambient clock or
  randomness in `packages/core/src` or the reducer; no DOM/`window`/React in `packages/client/src`.
- **The read-only boundary:** `europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo
  root are untouched.

## Confirmed by design, recorded so nobody re-derives them

- **A `missing_lodging` run on a straddling trip names already-past nights.** One finding covers
  the whole run and ruling 1 keeps it if *any* subject is non-past, so an active trip renders
  *"6 nights in Tokyo (2026-08-24 → 2026-08-30) with no lodging booking"* including three nights
  already slept. §8.2 ruling 1 says this explicitly and BUILD-NOTES KD-38 point 2 discloses it.
  **ROADMAP I-3's verification wording** — *"feasibility fires on the future half and not the
  past half"* — is the thing that is now inaccurate, not the code. Doc fix, architect.
- **`booking_vs_plan` on a completed trip is silent everywhere.** A past trip whose booking says
  4 March and whose plan says 2 March produces a blocker as a plan and **nothing at all** as
  history — no conflict, no validation issue. §8.2 names this as a deliberate loss to be answered
  in §8.5. Recorded with the number so the phase that owes the answer knows what it owes.

## What I could not test

- **Node 24.** This environment is Node 22.22.2; unchanged from Phase 1.
- **A real second user.** There are no accounts, so `ForeignDocumentError` was exercised against
  hand-built `user:marta` / `user:jacob` documents, exactly as Phase 1 was.
- **Map tiles / Safari / iOS**, unchanged from BUILD-NOTES §6.

---

# Round 11 — the final gate re-verification of the two R10 fixes (`83627f7..c6c6e2b`)

Two items, both closed. One new finding, adjacent to R10-3's code but not its mechanism.

**Baseline, all my own runs at `c6c6e2b`:** `node --test packages/client/test/store.test.ts
packages/core/test/geoCheck.test.ts` **77 pass / 0 fail** (the six new R10-3/R10-2 tests among
them); `npm run test:tap` **426 pass / 0 fail**; `npm run typecheck` clean; `npm run web:build`
clean. The round-10 probes re-run **unmodified**: `qa/r10-mergeundo.mjs` **0 FAIL** (was 2),
`qa/r10-prune.mjs` **ALL OK** (was 1 FAIL), `qa/r10-editdoor.mjs` in Chromium **0 FAIL**
(was 1). Red check: the six new tests against the pre-fix product code (worktree at `83627f7`)
**fail 4 / pass 73**.

| id | severity | file:line | defect | repro | routing |
|---|---|---|---|---|---|
| **R11-1** | **BLOCKER** (race; pre-existing, not a regression) | `packages/client/src/store/store.ts:419` (`stillOurs`) × `:422` (the merged document is installed **only** if `stillOurs`) × `:437` (`if (!stillOurs) scheduleSave()`, which then writes the un-merged local document under the post-merge `savedVersion` set at `:431`) | One dispatch landing **while the merge write is in flight** makes `stillOurs` false, so the merged document is discarded from memory while it is already committed to storage; the debounced autosave then writes the local, un-merged document over it, and the fence agrees because this tab owns the version it just minted. The other tab's edit is destroyed in storage, silently, with the chip reading *Saved*. | `node qa/r11-recheck.mjs` §1.3b (the **control** — zero undos, loss happens anyway) and §1.3c | **architect** — what a merge owes a document the user has typed into since (re-queue the merge, refuse the write, or surface it) is the same class of ruling §2.2a's merge case already got; it is not a patch |

**Why this is a BLOCKER and not a rough edge.** It is silent, permanent, cross-writer loss in
storage — the same class as R10-3, through a different door and with no undo involved. The
control run (`§1.3b`, no `undo()` call at all) loses tab B's title identically, which is what
proves it is *not* R10-3 reopened: R10-3 was "undo restores a pre-merge snapshot", this is "the
merge result is never installed and is then overwritten". `set`'s step-1 identity early-return
(`store.ts:210-214`) means the R10-3 history clear does not run on this path either, but that
is **correct and not the defect**: the merged document was never installed, so the surviving
`past` is still linear with the document the store actually holds.

**Why it does not change the gate verdict on R10-3.** It reproduces byte-identically in a
worktree at `83627f7` (pre-fix): `withUndo=false ... storage after next autosave title=""` on
both trees. The fix neither caused it nor was scoped to it.

**What I could not do:** land it end to end in Chromium. The window is exactly the duration of
the IndexedDB write, and nothing in `apps/web` disables input during a save (`grep disabled
apps/web/src` — only form validity and the undo/redo/export buttons), so a keystroke inside it
is reachable in principle; I reproduced the mechanism through the store's public API with a
storage port that holds the write open. Browser-level reachability: **UNVERIFIED**.

**Two things I tried against R10-3's fix that held.** A merge with **two redoable entries in
`history.future`** — both stacks are cleared, and three Ctrl+Shift+Z afterwards restore nothing
and leave storage correct. Six pre-merge snapshots and **ten** Ctrl+Z — `past` is 0, storage
keeps both writers' edits, status `idle`.

**Four things I tried against R10-2's fix that held.** `moveStop` and `reorderStop` cannot
change `place` (both re-spread the existing stop; §2.10 holds), so there is no third door of
that shape. `place → {kind:'none'}` and a re-point to a **different** `{kind:'place'}` both
prune the orphan they leave. A **pooled** copy prunes through `updateStop`'s pool branch. And
the over-prune guard still declines when a second linker sits in the **pool** rather than a day
— after which the place is correctly re-measured `'certain'`, because its only remaining linker
is user-authored.

**One observation, not filed.** `Day` has no `note` field (`types.ts:158`), so
`setDayMeta`'s `{note}` patch is dropped at `toJSON` — which is why `qa/r10-mergeundo.mjs`
prints `note=undefined` for a persisted day even on a clean run. The probe only asserts on
`title`, so it is sound; a future reader should not read that line as loss.

---

# Round 10 — the A-5b / A-6a gate re-verification (`773f8ea..9ced6e7`)

Two items. Both rulings are implemented as written and both pass. Three findings, none of
them a defect *in* those two implementations, and none of them a regression from them —
all three reproduce unchanged in a worktree at `9ba5aec`.

**Baseline first, as instructed:** `node --test packages/client/test/retirement-ledger.test.ts
packages/core/test/geoCheck.test.ts` **43 pass / 0 fail**; `npm run test:tap` **420/0**;
`npm run typecheck` clean; `npm run web:build` clean. Round-9 probes re-run **unmodified**:
`qa/r9-geo.mjs` **ALL OK** (was 3 FAIL — R9-2 closed), `qa/r9-redo.mjs` in Chromium **0 FAIL**
(was 2 — R9-1's user-visible repro closed), `qa/r9-ledger.mjs` **2 FAIL** (was 4 — see R10-1).

| id | severity | file:line | defect | repro | routing |
|---|---|---|---|---|---|
| **R10-3** | **BLOCKER** | `packages/client/src/store/store.ts:404–411` (`writeAndSettle` spreads `...state`, so `history` survives the merge reseed) × `store/reducer.ts:170` (undo is a snapshot restore) × `store.ts:682` (`undo()`'s `scheduleSave`, which then autosaves the restored snapshot) | `mergeWithStored` reseeds the document but **not** the undo history, so one `Ctrl+Z` after a merge installs a pre-merge snapshot and the debounced autosave writes it over storage with the post-merge expectation — which the port accepts. The other tab's saved edit is destroyed in storage, the chip reads *Saved*, and nothing is surfaced. | `node qa/r10-mergeundo.mjs` (assertions 3 and 4) | **architect** — §4.2 rule 5's history vs. §2.7 A-5's reseed paths: whether a reseed must clear `past`/`future` is a ruling, not a patch |
| **R10-2** | MAJOR | `apps/web/src/views/StopEditor.tsx:63–76` (`place` is in **every** update patch) × `packages/core/src/build/stops.ts:224` (`pruneOrphanedCopyPlace` runs only from `removeStop`) × `derive/geoCheck.ts:277–279` | Typing coordinates into a **copied** stop replaces its `{kind:'place'}` link with `{kind:'inline'}`. No `removeStop` runs, so A-6a's prune never fires, the copy-borne `Place` is orphaned, and A-6 clause 1 measures a zero-link place at `'certain'`: the reference trip carries a third `geo_outlier` **blocker** naming `place-copy-1` (*Blue Cave, Biševo*) — R9-2's symptom sentence, through a different door. | `node qa/r10-prune.mjs` §5.1 (real fixture, through the store); `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r10-editdoor.mjs` (six user actions, orphan read back out of IndexedDB) | **architect** — A-6a's prune is a closed list of one site (`removeStop`); adding `updateStop`, or exempting the orphan, is the same class of ruling R9-2 already got |
| **R10-1** | MINOR | `packages/client/src/store/store.ts:711–718` (clause 2) × `:232` (`set` step 5 replaces `next.doc` with the re-asserted document, which the **next** `undo` then pushes into `future`) | With **two** Ctrl+Z's instead of one (dismiss → retire → Ctrl+Z → Ctrl+Z → Ctrl+Shift+Z), the redone document holds the dismissal row already stamped `retiredAt`, so A-5b clause 2 declines and the redone dismissal is dead in the document. **Not user-visible**: that render is identical to the one the user was already looking at one keystroke earlier (R8-1's blessed re-assertion), and pressing *"Not a problem"* again works. | `node qa/r10-redo.mjs` §2.1 / §2.2 / §2.5; `node qa/r9-ledger.mjs` §1.2c / §1.2d | **architect** — either bless it (clause 2 is deliberate) or extend the rule; the implementation matches §2.7 revision 7 exactly as written |

## R10-3, in full — a merge, then one keystroke, and another writer's work is gone

This is outside the two items I was sent to verify. I found it while attacking `redo()`'s
interaction with the `mergeWithStored` reseed (`qa/r10-redo.mjs` §5.2, which is itself clean),
and it is reported rather than parked because it is silent, permanent, cross-writer data loss.

**The trace, all of it reachable in the shipped UI.** Two tabs hold the same trip. Tab B edits
a day's title and saves. Tab A edits the same day's *note* — a disjoint field — and its save is
correctly refused on the version fence (`status: 'conflict'`). Tab A presses **Merge and save**
(`App.tsx:96`). The merge is *correct*: `mergeTrips` is per-entity, and the resulting document
holds both edits (`r10-mergeundo.mjs` assertion 2 — `title="OTHER TAB" note="mine"`). Then the
user presses `Ctrl+Z` once (`App.tsx:29`).

`writeAndSettle` installed the merged document with `{ reseed: true }`, which is right for the
*ledger* — but it builds its next state as `{ ...state, doc: toWrite, ... }`, so `history.past`
is untouched and still holds tab A's own pre-merge snapshots. §4.2 rule 5's undo is a snapshot
restore, so it restores a document that predates the merge and knows nothing about tab B's
title. `scheduleSave` then fires, and the write carries the **post-merge** `savedVersion` as its
expectation, so the fence has nothing to object to: it lands. Storage now reads
`title="" note=undefined` — tab B's edit and tab A's own edit both gone — and
`persistence.status` is `idle`, i.e. the UI says **Saved**.

Three things make this a BLOCKER rather than a rough edge. It destroys data the user never
touched and cannot see (tab B's edit is not on screen in tab A after the undo). It is
persisted, not in-memory: reopening the trip does not recover it, and there is no second copy.
And it is **silent** — the one mechanism that exists to stop exactly this (the version fence)
is satisfied by construction, because the tab writing the loss is the tab that owns the
current version.

Not a regression: identical output at `9ba5aec`. It is not R8-4 (`doMerge`'s off-chain `load()`
resurrecting a deleted trip) — different mechanism, different symptom, same function.

## What I tried on A-5b and A-6a and could NOT break

**A-5b.** `redo()` with an empty `future` (three times in a row: no throw, no release, ledger
byte-identical). A redo of an unrelated action with a mark held — R8-1 at redo depth, still
stamped. `undo()` of an `unresolveConflict`, the one shape a `rowsFor`-based rule *would* fire
on if anybody added one to `undo`: silent, stamped, correct. Two conflicts on two days with
their dismissals interleaved: the release is attributed to the right `conflictId` and the other
mark survives. Whether one redo step can raise two ids' row counts at once: **it cannot** —
`reduce` pushes one snapshot per action and `resolveConflict` appends one row, measured over
every history entry (§3.3). The 50-entry history limit: 50 undos to the floor and 50 redos back
leave the dismissal live and rendered *dismissed*, and `past` never exceeds the limit. An
A→B→A trip switch: `openTrip` reseeds from `initialState()`, so the future stack is gone, the
redo is a harmless no-op, the ledger is trip A's and the document is trip A's. A `mergeWithStored`
reseed with a live future: no throw, no un-retirement, invariant holds (the *content* problem
on that path is R10-3, not a ledger problem). The §2.7 A-5b invariant was asserted after every
step of every sequence and never broke — including in the R10-1 case, which is why the
invariant alone is not a sufficient test.

**A-6a.** Removing a copied stop from the **pool** (clause 3's pool half is symmetric), and a
copy moved day→pool first. An **accepted** copy (`accept()` changes `state`, not `source`, so
`attribution()` survives and the prune still fires — "Copy → Accept → ×" does not reopen R9-2)
and a **rejected** one. A copy of a copy. A stop id present in both a day and the pool: the
prune correctly declines. Purity, exactly one revision bump, and a JSON round trip afterwards.
The anti-sweep guards: a user-authored stop's place survives its own removal and is still
measured `'certain'`; `samePlace` reuse with the user's own stop still linking declines; the
one documented cost (user place, copy as its last linker) deletes exactly that one row and
nothing else, and undo restores it. `addStop` against a pruned `placeId` does not throw,
`validateTrip` reports `place_ref_dangling`, and no derive path throws on it. Through the store:
`×` prunes, `Ctrl+Z` restores stop **and** place with the place back at `'unanchored'`, and
`Ctrl+Shift+Z` prunes again. On the real fixture: 2 blockers before and after, `places` 92→92,
**61 orphaned places untouched**, `place-68` (*Fisherman's Bastion*) still present and still
minting exactly one `geo_outlier` blocker under a +1° injection — the sweep the ruling refused
did not happen. A pool copy on the real fixture prunes too.

**One observation, not filed as a finding.** On a document that already has two `places` rows
with the same id, the prune's `filter` removes **both**, against the ruling's "at most one row
leaves per call". `validateTrip` reports `duplicate_id` on such a document and `fromJSON`
cannot produce one, so the input is already invalid; noted so a future reader does not
rediscover it as new.

**Not re-run this round, still open, unchanged:** R8-3, R8-4 (both MAJOR, round 8), and the
round 2–7 open list in the round-7 status note above (all MINOR). None were investigated.

---

# Round 9 — the A-5 / A-5a / A-6 gate verification (`0a58c81..773f8ea`)

Four items, nothing else. Two are clean; two have one adjacent door each still open.

| id | severity | file:line | defect | repro | routing |
|---|---|---|---|---|---|
| **R9-1** | MAJOR | `packages/client/src/store/store.ts:672` (`redo`) vs `:659` (`dispatch`'s release) × `:212–218` (`set` step 4/5) | `redo()` calls `set()` without `releaseRetirement`, so the mark the preceding `undo()` legitimately re-acquired is re-asserted onto the redone `resolveConflict` row: the redone dismissal is **stillborn** and the blocker renders unresolved, permanently. | `node qa/r9-ledger.mjs` §1.2c / §2.4c / §4.1; `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r9-redo.mjs` | **architect** — A-5's *"Nothing else releases"* is a closed list of two `dispatch` action types; adding `redo` to it is a ruling, not a patch |
| **R9-2** | MAJOR | `packages/core/src/derive/geoCheck.ts:277–279` (`linking.length > 0`) ← `build/copyStop.ts:124` (rule 4's `const copy: Place`) × `apps/web/src/views/DayTimeline.tsx:192` (`removeStop`) | Deleting a copied stop leaves the `Place` the copy dragged in with **no** linking stop, and A-6 clause 1 measures a zero-link place at `'certain'` — so Browse → Copy → `×` mints a third `geo_outlier` **blocker** on the reference trip, naming a record the user never typed a coordinate into. | `node qa/r9-geo.mjs` §4.2 / §4.3 (synthetic), §5.2 (the real fixture, through the store) | **architect** — A-6 clause 1's *"an orphan is measured at `'certain'` exactly as today"* was written without the copy path in view |

## R9-1, in full — the ledger's one remaining door

**The trace, all seven steps user actions in the shipped UI.** Dismiss a blocker (*"Not a
problem"*, `Panels.tsx:72`) → put the data back so the conflict goes away → the next render's
`syncResolutions` retires the row and `set` **correctly acquires** the mark → `Ctrl+Z` brings
the conflict back and A-5 **correctly** re-stamps the restored row, so it does *not* read
*"Marked dismissed"* (this is R8-1, and it holds) → the user dismisses it a **second** time and
A-5a's veto **correctly** lets that stick (this is KD-36, and it holds) → the user presses
`Ctrl+Z` to take that second dismissal back → the user changes their mind and presses
`Ctrl+Shift+Z`.

The last step is where it goes wrong, and the reason is precise. At the sixth step the document
that `undo` installs holds **only** the retired row for that `conflictId` — no live row — so
A-5a's veto does not apply and step 4 legitimately (re)acquires the mark. At the seventh step
`redo` restores the `[retired, live]` document, and `redo` is not `dispatch`: it does not call
`releaseRetirement`. The already-held mark is not removed by the veto (*"acquisition is vetoed;
retention is not"*), so step 5's `reassertRetirements` stamps the redone live row `retiredAt`
inside the same `set()`. The conflict renders unresolved and the row is retired in the document
from then on; no later edit or reload brings it back.

**Isolated, not inferred.** `qa/r9-ledger.mjs` §4 puts two stores in the identical state and
puts the identical live row back two ways — `redo()` and a `dispatch` of the same
`resolveConflict`. `via redo: retiredAt=2026-08-01`, `via dispatch: retiredAt=null`. The only
difference between the two paths is `dispatch`'s release, which is the root cause.

**Why this is the architect's and not the builder's.** A-5 states the release list as closed
and reasons about it: *"both are deliberate user acts on that exact conflict"*. A redo of a
`resolveConflict` is exactly such an act, and A-5 does not say so because it only reasoned about
undo (*"Undoing past a release restores a live row, and that is the user's own answer being
undone"*). Extending the release to `redo` requires deciding what a redo of an
`unresolveConflict` should do too, and whether the release keys off the redone action or off
the document delta — a builder guessing at that is how KD-36 happened the first time.

**Severity, argued.** MAJOR, not BLOCKER: nothing is lost, the safe direction is taken (a
conflict is shown, not hidden), and the user can recover by pressing *"Not a problem"* once more,
because that path does release. But it is the same failure KD-36 was raised over — a deliberate
user act on a conflict silently discarded by bookkeeping — and A-5a's own sentence applies
verbatim: *"a ledger that re-stamps a fresh answer has implemented 'never un-retires' as 'never
resolve again'."*

## R9-2, in full — the copy path still mints a blocker, one click later

A-6 closed R8-2: the copy itself is clean, re-confirmed on the real fixture at
`qa/r9-geo.mjs` §5.1 (2 blockers before, 2 after). The rule's four clauses are all right as
written and all four were attacked — `every`-not-`some` holds when a user-authored stop shares
the place (§3.3), the exemption starts when the user deletes their own stop (§3.4) and ends when
they author one (§3.5), acceptance of one or both copies changes nothing (§2.1–§2.5), two
different source trips reusing one `Place` via `samePlace` is still exempt (§1.2), and
`rejectCandidate` leaves the stop in the document badged, so `linkedBy` still names it and the
exemption correctly survives (§4.1).

What is **not** covered is clause 1. `copyStopInto` rule 4 adds a `Place` row to the target
trip; `removeStop` removes the stop and **not** the place. One `×` later the place has zero
linking stops, `copyBorne` is `false` by clause 1 rather than by clause 2, and it is measured at
`'certain'`. On the reference trip that is a third `geo_outlier` blocker naming `place-copy-1`
(*Blue Cave, Biševo*, 62 km from the Split anchors) — ROADMAP C's two-blocker ceiling broken by
a record the user never authored and has just thrown away.

For contrast, and because it narrows the defect: `Ctrl+Z` after the copy is clean (§5.3) —
undo is a snapshot restore, so the place goes back with the stop. The defect is specific to
`removeStop`, which is the only one of the two the UI offers as a per-stop control.

**Why this is the architect's and not the builder's.** Clause 1 is a deliberate, reasoned
clause (*"a place with no stop pointing at it is a place the user keeps for its own sake, or an
orphan"*) and it is right for a place the user typed. The question A-6 did not ask is what a
place the **copy path** created and the user then orphaned should be — and the two candidate
answers (have `removeStop` drop a place nothing links to, or extend the exemption to a place
whose *last* linking stop was a copy) are both modelling decisions with their own costs, exactly
like the `Place.provenance` question A-6 already ruled on.

---

# Round 8 — the SEND-BACK pass (`5bdd0dc..0a58c81`)

Narrow verification of the thirteen items the gate review and the architect routed. Ten were
attacked adversarially; four MAJORs and no BLOCKER came out. Every row below has a command.

| id | sev | file:line | defect | repro | routing |
|---|---|---|---|---|---|
| **R8-1** | MAJOR | `packages/client/src/store/store.ts:432` (`retireResolutions`'s `set`) × `:544` (`undo`) | `syncResolutions` writes `retiredAt` into the **document**, and snapshot undo restores a pre-retirement `Trip` — so Ctrl+Z un-retires the row and a dismissed **blocker** returns *"Marked dismissed"*. §2.7: *"never un-retires"*. | `node qa/r8-persist.mjs` §3; `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r8-undo.mjs` | **architect** (see below) |
| **R8-2** | MAJOR | `packages/core/src/derive/geoCheck.ts:230–242` (the places loop has no copied-record exemption) ← `build/copyStop.ts:124` (rule 4's `const copy: Place`) | One Browse-and-copy click adds a third `geo_outlier` **blocker** to the reference trip, naming the `Place` the copy dragged in. §2.13 exempts the copied **stop**; rule 4 copies the place with its `cityKey` verbatim and the place is measured as the user's own. | `node qa/r8-geo.mjs` §1 | **architect** — §2.13's *"Places need no row of their own"* paragraph is the wrong ruling |
| **R8-3** | MAJOR | `packages/core/src/derive/geoCheck.ts:177`, `:178` | The adjacent-day anchor is **one representative chosen by position** from `anchorable`, so accepting a copied stop can *replace* it rather than add to it — minting a `geo_outlier` blocker on a stop the user wrote themselves. §2.13: *"acceptance can only ever add anchors … never create [a blocker]"*. Not UI-reachable (`acceptCandidate` has no control). | `node qa/r8-geo.mjs` §2 | **architect** — the anchor definition and the monotonicity claim contradict each other |
| **R8-4** | MAJOR | `packages/client/src/store/store.ts:444` (`doMerge`'s off-chain `load`) → `:452–454` (the expect-absent write) vs `:753` (the delete link) | A merge already in flight when the active trip is deleted resurrects it: the delete link drains and deletes, the merge's `load()` — which is **not** on the chain — then returns `null`, and the *"write it back with `expectedVersion: null`"* branch is satisfied by the record's absence. `in storage=true in library=true`, and `persistence.savedDoc` points at a trip with no `doc`. Not UI-reachable. | `node qa/r8-persist.mjs` §1 | **builder** (put the load on the chain, or don't take the null branch when this store issued the delete), with an architect note on §4.2 6c |

### R8-1, in full — because the reasoning is the evidence

B-2 was routed to stop exactly one thing: *"a conflict the user dismissed once is LIVE again
after the data returns to that value."* The fix works for the route the review named — edit
away, edit back — and `qa/r8-persist.mjs` §3 route A confirms it. It does not work for the
other route back to the same value, which is the app's own global Ctrl+Z (`App.tsx:27–38`).

The mechanism is one sentence. `retireResolutions` sets `state.doc` to a document with
`retiredAt` filled in, *outside* the reducer, so — correctly, per §2.7 — nothing goes on the
undo stack. But `history.past` already holds the pre-retirement document, and §4.2 rule 5's
undo is *"snapshot-based over the immutable `Trip`"*: restoring that snapshot restores
`retiredAt: null`. The retirement is document state, the undo stack owns document state, and
the two rules have not been reconciled.

Measured, in Chromium, four user actions from a clean load of the sample:

```
move "City Airport Train" 16:20 -> 21:45   booking_vs_plan: 1 blocker
"Not a problem"                            Marked dismissed on 2026-08-27
move it back to 16:20                      0 rows   (the render retires the resolution)
Ctrl+Z                                     1 row — "…blocker… Marked dismissed on 2026-08-27"
```

That last line is R2-7's symptom sentence, restored, on a **blocker**, after a keystroke that
is not an acknowledgement of anything. §2.7 exists because `HISTORY.md` Pass 5 lost a week to
a stale acknowledgement; the reason it is *"retired, not resurrected"* is that a dismissed
blocker re-arming with no user action is worse than one that never existed, and a dimmed row
is how Jacob stops looking at it.

Routed to the **architect** rather than the builder because no local change satisfies both
rules. Retiring inside the reducer puts bookkeeping on the undo stack, which §2.7 forbids in
as many words. Re-retiring after `undo()` cannot work either: at that moment the conflict is
back, so there is nothing the rule can see to retire — the mechanism cannot distinguish
*"never retired"* from *"un-retired by a snapshot"*. Either retirement state moves outside the
snapshotted `Trip`, or `undo`/`redo` must carry `resolutions[].retiredAt` forward across a
restore. That is a design call about where retirement lives, and it is one line in §2.7.

### What I attacked and could not break

`travelLine`: midnight wrap, exactly 24 h, `"7:5"`, `"25:00"`, absent `arrival.mins`, a pooled
`journey` with no time, an unrecognised and an absent `travelRole`, and — the leak the review
worried about — a `'transfer'` and an `'unknown'` stop that *do* carry `arrival.mins`, both of
which correctly publish `arrives: null` and no arithmetic. `attribution()`: every provenance
shape that can produce a non-null credit, against all five surfaces that render a stop; only a
map-marker tooltip omits it. The flush bound: forced to exhaustion with a port that re-dirties
the document inside every write, then checked against all three of rule 6a″'s obligations and
against the two exits that must *not* re-arm. `safeWritePath`: a symlinked file, a symlinked
directory, `--force` on both, `..` traversal, an absolute path outside, the `cairn-backup`
sibling-prefix trick, and a symlink pointing *inside* `cairn/` (which must and does pass) — six
refusals, exit 2, `git status` clean afterwards. The export surface: 69 runtime symbols, and
every static and dynamic importer of `packages/core` in `apps/web`, `cli.ts`, `tools/` and
`fixtures/` resolves through `index.ts` with nothing missing at runtime. The delete link: a
dispatch racing it, a dispatch behind it, and an autosave already in flight — all three end
with the trip deleted and the library row gone.

---

## Does it even run?

Yes. From a **clean `git clone` into a scratch directory**, in BUILD-NOTES' documented order:
`npm install` → `npm test` **231 pass / 0 fail** → `npm run typecheck` **clean, both projects**
(F-3 confirmed fixed: `pretypecheck` generates the sample) → `npm run web:build` clean →
`npm run cli -- trip` prints 16 days · 112 stops · 2 blockers. A full run modifies **0 tracked
files**; `europe-2026-itinerary.html` is byte-identical afterwards (`md5 7c69df32…`).

---

# BLOCKER

## R2-1 — Two tabs editing at the same moment still lose an edit, and both say "Saved"

**Routing: builder, with an architect decision on `StoragePort`.** Round 1's F-1, half closed.
Repro: `qa/r2-race.mjs` (3 rounds; **2 of 3 lost an edit**), `qa/r2-tabs.mjs` for the case that
does work.

The sequential case is genuinely fixed and I verified it end to end: tab B's write is refused,
tab B's indicator reads **"Not saved — edited elsewhere"**, the banner explains it, *Merge and
save* preserves both tabs' work. That is the contract, met.

The race is not. `store.save()` is `load → compare → save` with nothing transactional around
it, so two tabs that edit at about the same time both read revision *R*, both pass the compare,
and the second `put` destroys the first.

```
{"round":1,"A in tab A screen":true,"B in tab B screen":true,
 "A in storage":true,"B in storage":false,"tab A says":"Saved","tab B says":"Saved"}
{"round":2, … same …}
{"round":3, … "tab B says":"Not saved"}
2 of 3 rounds lost an edit silently
```

**Observed:** an edit visible on tab B's screen is absent from IndexedDB and tab B displays
"Saved". **Expected:** §2.2's revision guard, and ROADMAP F's criterion — *the losing tab MUST
NOT display "Saved"*.

BUILD-NOTES §6 discloses the mechanism ("two tabs writing inside one event-loop turn can still
interleave… the window is far smaller and the guard catches the case Jacob will hit"). The
disclosure is honest about the mechanism and wrong about the frequency: this is not an
interleave measured in microseconds, it is two people (or one person and a second window)
typing at the same time, and it fails two times in three. It is the same user-visible symptom
as the round-1 blocker.

The fix is not in the client: `StoragePort` has no transaction and no write token, so
compare-and-set cannot be implemented above it. Either the port gains a
`saveIfRevision(id, expected, text)` that IndexedDB executes in one transaction, or documents
carry an opaque write token instead of a per-document counter. Note that `revision` cannot
serve as the token by itself — two divergent tabs both produce `R+1`.

## R2-2 — A stop returned to the pool from a `transit` day disappears from the app entirely

**Routing: builder (the view), architect (the `transit` pseudo-city).** Repro:
`qa/r2-poolloss.mjs`, in Chromium, on the reference trip, in three clicks from a cold start.

```
stops on 08-07:            ["Arrive LAX — Tom Bradley International","Condor [redacted] → Frankfurt"]
stops on 08-07 after ⇩:    ["Condor [redacted] → Frankfurt"]
city groups:               ["✈️","🇦🇹","🇭🇷","🇭🇷","🇨🇿","🇭🇺","🇬🇧"]
→ the stop is in NO Optional panel, under any group
Optional tab reads:        "Optional 32"      (it was 31)
IndexedDB pool entries filed under "transit":  [["Arrive LAX — Tom Bradley International"]]
Validation panel:          1 error, 10 warnings — nothing about it
```

Root cause, traced: `blankDay`/`ensureDays` give a day with no city `primaryCity: 'transit'`;
`returnToPool(trip, stopId)` with no `cityKey` files the stop under `day.primaryCity`, i.e.
`'transit'`; `PoolPanel` renders `poolFor(trip, ui.activeCityKey ?? trip.cities[0].key)` and
`'transit'` is never in `trip.cities`, so it can never be the active city key. The document is
intact — `scheduleFromPool` restores the stop to 2026-08-07 from its stored hint — but no UI
path reaches it, and `validateTrip` has no code for a pool stop filed under a city the trip
does not have (`unknown_city_key` covers days and places only).

**Observed:** the user's stop vanishes; a counter says it exists; nothing explains it and
nothing brings it back. **Expected:** a stop is never unreachable from the surface that put it
there. This is the same class as F-1/F-2 — the planner quietly discarding the plan — and it
also hits **every brand-new trip**, whose days are all `transit` until the user assigns cities
(reproduced separately in `qa/r2-browser.mjs`: a stop copied from another trip and then pooled
is unreachable).

BUILD-NOTES §8 already asks the architect to decide whether `cities:['transit']` should be a
real city. This is what the open question costs.

## R2-3 — `copyStopInto` carries the source's credentials across the trip boundary in free text

**Routing: architect.** Repro: `qa/r2-copy.mjs`, section H.

§2.14 rule 3 drops `bookingId` and refuses to let a `Ticket` travel, with the reason stated:
*"A friend's booking reference is not yours, and their ticket URL is an access credential
(§6.6)."* Rule 5 then copies `note` **verbatim** — and on the only real trip we have, the
credentials live in the notes:

```
FAIL "Check in — Habyt Vienna"      note: "…booked, conf 5814731574, PIN 0754, 2 nights…"
FAIL "Check in — Hostel Petra Marina" note: "…booked, conf 5175904714, PIN 4809…"
FAIL "Speedboat pickup — Split harbour" note: "…Booking ref GYGG45MLA9Q9, PIN BGXw#EW8…"
FAIL "Dubrovnik City Walls"         note: "…order DUB26M6CVTSWMF, €40…"
FAIL "City Airport Train → Wien Mitte" note: "…order 843249…"
5 of the 7 ticketed stops copy a credential; 8 stops in total carry a PIN or a 6+ digit run.
```

Two `Stop.links` hrefs also travel (`Place.note` and `Place.links` copy with the place).

**Observed:** copying one stop moves a hotel door PIN and a booking confirmation number into
another document, another tenancy and every later export of it. **Expected:** §6.6 defines this
exact class — *"a keyword followed by an alphanumeric token (`PIN`, `code`, `conf`, `ref`,
`order`, `booking`, `seat`), any run of 6+ digits…"* — as *"an access credential"*, and applies
it only to the build artifact. The copy path is the *only* place in the design where data
crosses a person boundary and it applies nothing.

**No exposure exists today**: Phase 1 copies between two of the same user's trips. That is
exactly the position §6.6 was in when Jacob was asked and answered it, and the decision is due
on the same basis — the primitive ships now, and §5.2's revocation model
("a revoked share renders an error, never stale content") is silently defeated for anything
the copier already pulled into their own document.

The architect owns this because §2.14 rule 5 *says* to copy the note verbatim. The options are
(a) run copied free text through the §6.6 redactor, (b) copy the note but strip credential
tokens and say so on the stop, or (c) accept it and write down why. Related, and cheap to fix
in the same decision: §2.14 rule 4 says a copied `Place` gets "the same provenance stamp", and
`Place` has no `provenance` field at all — a friend's place lands in your trip indistinguishable
from your own (`qa/r2-copy2.mjs`).

---

# MAJOR

## R2-4 — The redaction guarantee is a scrub of six strings, not a rule; I put a door PIN in the bundle and every test passed

**Routing: builder (implement), architect (restate the criterion).** Repro: `qa/r2-redact.mjs`,
plus the mutation below.

§6.6 says the enforcement is: *"When `apps/web/dist/` exists, every emitted asset is grepped
**for the same patterns** and for a literal list of the five known strings."* The shipped test
(`test/redact.test.ts`, "the built bundle carries none of the five known strings") greps the
assets for `KNOWN_LEAKS` — six literals — and **never applies `redactionHits`**:

```
does the shipped bundle check apply the PATTERNS to the bundle?
  redactionHits used on bundle text?  false
  KNOWN_LEAKS used on bundle text?    true
```

Mutation check (the file was restored immediately; `git status` clean afterwards). I put this
in `packages/core/src/derive/display.ts` line 1 — an ordinary bundled source file — and rebuilt:

```js
// Marta's apartment door code is PIN 8842 and her booking ref is QX7T4M9 — kept here
// to explain the fixture case below.
```

```
leaked into apps/web/dist/assets/index-*.js.map: 1
npm test: 231 pass, 0 fail
```

A door PIN and a booking reference ship in the build artifact and the suite is green.
KD-18 claims *"the test greps maps as well as scripts so a fourth cannot creep back"* — it
greps maps for six strings, so a fourth can and **already has**: `packages/core/src/model/types.ts:111`
carries `Condor DE4345 → Vienna` in a doc comment, `DE4345` is exactly the token class
`alnum_reference` exists to catch (the redactor strips it from the sample data), and it is in
`dist/assets/index-*.js.map` on this delivery.

**Observed:** the guarantee holds for the five strings someone found by hand. **Expected:**
§6.6's own words — *"a rule with a test, not a scrub of the five strings we happened to find"*.

Note for the architect: applying `REDACTION_PATTERNS` literally to a minified JS bundle is not
implementable — `url` and `alnum_reference` match hundreds of ordinary tokens (`OPTIONAL`,
`DECENTRAL`, every CDN URL). The mechanical version that *is* implementable, and which found
`DE4345` in twenty lines, is in `qa/r2-redact.mjs`: derive the credential set from the
unredacted trip by running the redactor over it, then assert none of those tokens appears in
any emitted asset. That is a rule (it grows with the data) rather than a list.

## R2-5 — The `cli export` guard is lexical: a symlink inside `cairn/` writes anywhere, and any existing file inside `cairn/` is overwritten without asking

**Routing: builder.** Repro, both run:

```bash
ln -sf /tmp/scratch/victim.txt cairn/qa/escape-link.json
node cli.ts export qa/escape-link.json
→ wrote /home/user/europe-2026-planner/cairn/qa/escape-link.json (233801 bytes)
→ /tmp/scratch/victim.txt is now the trip JSON.        # the guard said yes

ln -sfn /tmp/scratch/outdir cairn/qa/outdir
node cli.ts export qa/outdir/leak.json                  # same, via a symlinked directory

node cli.ts export qa/README.md                         # tracked file, silently clobbered
```

`safeWritePath` is `resolve(cwd, target).startsWith(CAIRN_ROOT + sep)` and the doc comment
admits the limit ("any **symlink-free** traversal"). Every lexical attack is correctly refused —
`../europe-2026-itinerary.html`, `../docs/BOOKINGS.md`, `../tickets/x.pdf`, `/etc/passwd`, the
same paths from a different cwd — but a symlink anywhere under `cairn/` (a directory symlink is
the realistic one) turns the guard off. F-16 asked for structurally impossible; this is
lexically impossible. One `realpathSync(dirname(abs))` before the prefix test closes it.

Second half: there is no "this file exists" check at all, so `export` overwrites tracked
sources inside `cairn/` with no prompt and exit code 0. The read-only boundary at the repo root
is protected; nothing protects the repo.

## R2-6 — The expired-share fail-open moved one field over: a malformed `expiresAt` still grants access

**Routing: builder (guard), architect (what an invalid expiry means).** Repro: `qa/r2-access.mjs`.

F-13 is fixed for `now`: all eleven bad clocks throw, including `''`, `undefined`,
`'2026-13-45'` and `'2026-02-30'`. The share's own dates got no such treatment:

```
expiresAt="2026-08-01"  -> canView=false     (correct)
expiresAt="2026-13-45"  -> canView=true
expiresAt="tomorrow"    -> canView=true
expiresAt="never"       -> canView=true
expiresAt=""            -> canView=true
expiresAt="9999-99-99"  -> canView=true
revokedAt=""            -> canView=true
```

`effectiveRole` does `if (s.expiresAt && s.expiresAt < now) continue` — a lexical compare
against an unvalidated string. Anything that is not a well-formed date compares as
"not yet expired". §6.2.4 makes these predicates *the definition the Phase 2 RLS policies are
generated from and tested against*; a definition that treats junk as "live" generates a policy
that does. Same reasoning F-13 was fixed under, same function, one field over.

The rest of the matrix is correct and I re-ran all of it: owner and member get everything;
friend-with-no-share, stranger, anonymous, unknown token, expired link and revoked link get
nothing on all five operations; a crafted `__proto__` principal gets nothing. One design note
for the architect: a share whose principal is `{kind:'anonymous'}` matches **every** anonymous
caller (`canEdit(anonymous) === true`), which is fine only as long as nothing ever writes such
a row.

## R2-7 — `syncResolutions` has no caller, so F-10 is still live in the product

**Routing: builder.** Repro: `qa/r2-resolutions.mjs`.

```
2. the user dismisses an overlap warning            resolution attached: dismissed
3. the user retimes the stop                        overlap conflicts now: 0
                                                    stored resolutions: [["dismissed",null]]   ← not retired
4. the user puts the time back
   conflict id identical to the dismissed one:      true
   resolution attached:                             dismissed        ← with no user action
5. calling store.syncResolutions() by hand first:   retiredAt ["2026-08-25"], then "none (correct)"
6. call sites in apps/web + packages/client:        only its own definition, store.ts:317
```

The core function is correct and the store method is correct. Nothing calls it — not the
reducer, not `App.tsx`, not the conflicts panel. §2.7 is explicit that this is *"a build
function the client calls whenever it recomputes the derived conflict set"*, and the client
never does. A dismissed **blocker** re-arming with no user action is the thing §2.7 exists to
prevent, and BUILD-NOTES §5 lists F-10 as fixed with core-level proof only. Same shape as the
builder's own F-15 note: the fix was applied to the place they were looking at.

## R2-8 — §2.14 rule 7's credit contract is not honoured outside the day view

**Routing: builder.** Repro: `qa/r2-browser.mjs` (Chromium) and code.

Rule 7: *"any view that renders a record with a non-null `attribution` renders the credit."*
`DayTimeline.tsx` does (verified in the browser: badge `from a friend`, credit
`From "Europe 2026"`, both surviving a reload out of IndexedDB). `Panels.tsx` `PoolPanel`
renders `STATUS_BADGE[displayStatus(s.provenance)]` and never calls `attribution`; `StopEditor`
renders neither. Copy a stop, press ⇩, and the record renders with a badge and no credit — and
if it is ever accepted (`acceptCandidate` makes `displayStatus` `'own'`, by design) the pool row
becomes indistinguishable from the user's own idea, which is the exact convention F-6 was sent
back for. There is no accept control in `apps/web` today, which is the only reason this is MAJOR
and not a BLOCKER.

(In the reference trip the pooled copy is also unreachable — see R2-2 — so the two must be fixed
together or the second will hide the first.)

## R2-9 — Copying a stop manufactures a `geo_outlier` **blocker**

**Routing: architect.** Repro: `qa/r2-data.mjs`.

```
copy "Arrive LAX" from Marta's trip into a Lisbon trip (homeBase Lisbon):
  geoCheck:   dstop-1 9140km certain
  conflicts:  blocker:geo_outlier
```

§2.13's principle is *"a coordinate far from everything the trip knows about is a coordinate to
look at"*, and a just-copied stop is far from everything **by construction**. But the model is
not in the dark here: `provenance.origin.sourceTripId` says exactly where the coordinate came
from and that a human chose it two seconds ago. §0.5 is the governing rule — *a rule that cannot
distinguish "the data says something impossible" from "the data is shaped oddly" degrades to a
warning rather than asserting a defect* — and this is the "shaped oddly" case, asserted as a
blocker.

It also punctures the count promise: §2.7 says the reference trip carries exactly two blockers
and *"a third can only appear if somebody can write down why he must act on it"*. The social
primitive produces a third on first use with nobody writing anything. The fix is a line in
§2.13's anchor table (a `source:'friend'` stop anchors on nothing, or copies are `unanchored`
until scheduled next to something), not code the builder should guess at.

## R2-10 — `travelRole` is not rendered anywhere in `apps/web`, and it is not in the KD list

**Routing: builder; disclosure gap.** Verified by grep and in the browser.

§2.12's consumer table has a row for the view: *"the day view — Renders it. A `'journey'` stop
shows 'departs 14:30 · 1 h 20 · arrives 15:50'; a `'transfer'` stop shows today's '20 min by
metro'. `'unknown'` renders with a one-tap control to set it, which is the only new editing
affordance this field needs."*

`grep -rn travelRole apps/web/src packages/tokens/src` matches only the generated sample JSON.
The Aug 8 Condor stop still renders as `14:30 · ✈️ Flight · 1 h 20` — a time with a leg drawn
*into* it, which is precisely the reading §2.12 was written to correct. The 10 `'unknown'`
stops have no affordance to resolve them, so the field can never improve from the app.

The model half is real and I re-derived every number in KD-1 independently: **21 journey / 81
transfer / 10 unknown**, `impossible_transfer` **0 blockers 0 warnings**, tightest genuine
transfer margin **7 min** (Aug 14, Skradin bus stop → ticket office), and the role is
load-bearing — relabelling all 21 journeys as `transfer` produces 4 blockers, as `unknown`
produces 4 warnings. The defect is that the user cannot see any of it.

Not disclosed: KD-13 lists `apps/web`'s stubs (duplicate, rename, city map, drag-reorder,
new-trip wizard) and this is not among them, so the manager has no way to know a §2 row shipped
unbuilt.

## R2-11 — The §2.14 invariant the tester was told to attack is falsifiable in one call

**Routing: architect, then builder.** Repro: `qa/r2-copy.mjs`, section B.

The invariant: *for every record `r` with `attribution(r) !== null`, `displayStatus(r) !== 'own'`
unless state is accepted **and** `acceptedAt !== null` **and**
`r.provenance.actorUserId === trip.ownerId`.*

```
acceptCandidate(trip, ref, "user:someone-else", "2026-08-26") -> displayStatus own, actorUserId user:someone-else, trip.ownerId local:self
acceptCandidate(trip, ref, null,                "2026-08-26") -> displayStatus own, actorUserId null
validateTrip on both: no issue.
```

Nothing in core enforces the third clause and no `Issue` code covers it. In Phase 1 the client
always passes the owner, so this is not reachable from the UI — but these are the semantics
Phase 2's server will implement against, and the invariant is either wrong (a co-owner or
editor accepting is legitimate, in which case §2.14's last paragraph should say
`actorUserId ∈ members`) or unenforced. Decide which, then enforce it in `validateTrip`.

---

# MINOR

## R2-12 — KD-19's per-symbol justification is wrong for 42 of 62 symbols
**Routing: builder.** KD-19 says the export gap is enumerated and that *"the other 56 are things
the client, the CLI or the views demonstrably call"*. Mechanically: of the 62 `BEYOND_2_10`
entries, **20** are referenced outside `packages/core/src`; **42** are referenced only by core's
own tests. Named reasons that do not hold include
`statusLabel: 'packages/tokens and apps/web render the provenance badge text'` (both use
`STATUS_BADGE`; tokens may not import core at all under §3),
`pickDay: 'apps/web PoolPanel defaults the day when scheduling from the pool'` (PoolPanel
dispatches `scheduleFromPool`), `isIsoDate: 'apps/web NewTrip validates a typed date'`, and
`userProvenance: 'apps/web stamps a hand-added stop'`. The *test* is sound and non-vacuous
(§2.10 ⊆ exports asserted, dead entries fail, gap capped at 65); the prose the manager is meant
to decide from is not. The real shape of ROADMAP E's gap is: 50 contracted, 20 more genuinely
used, 42 exported for testability.

## R2-13 — Redaction eats the sample's flight numbers, and KD-17's "0 strings" is measured on prose only
**Routing: architect/builder.** The shipped sample renders `Condor [redacted] → Frankfurt`,
`Condor [redacted] → Vienna`, `[redacted]-01` (for `Ref 17097157-01`), and 20 of 112 notes carry
a `[redacted]`. `alnum_reference` (`\b[A-Z0-9]{6,}\b`) cannot tell `DE2081` from `YZGDTS`.
KD-17 measures the collateral as "0 strings" against six prose fixtures; against the data it is
not zero, and the demo trip reads worse for it. Either accept it in writing or exclude a
flight-designator shape.

## R2-14 — `detectConflicts` accepts a missing or garbage `today` and silently drops ten rules
**Routing: builder/architect.** `today: '2026-08-01'` → 17 conflicts including 10
`unbooked_ticketed`; `today: 'garbage'` → 8; `today` absent → 7, no throw. The horizon rules
just stop firing. Core now throws on exactly this input class in `access/predicates.ts`
(F-13's fix, correctly) and shrugs at it here. Pick one discipline.

## R2-15 — `fromJSON` rejects a document with no `ownerId`, which §2.14 rule 1 says is allowed
**Routing: architect/builder.** §2.14: *"If `doc.ownerId` is present and is neither the local
user … nor absent, `importDoc` rejects."* In practice `fromJSON` fails first with
`TripParseError: expected a string (at $.ownerId)`, so an export predating `ownerId` cannot be
restored at all. No such export exists yet; the spec and the parser should agree before one does.

## R2-16 — `"99:99"` is a valid time
**Routing: builder.** `clockOrNull` checks `^\d{1,2}:\d{2}$` only, `validateTrip` has no clock
check, and a stop at `99:99` sorts and renders. Same class as F-11's `2026-02-30`, one field over.

## R2-17 — `Issue.params` carries raw coordinates on the fault path
**Routing: builder.** F-18 is fixed for conflicts: no coordinate-shaped float appears in any
`Conflict.params` or in any committed golden (`qa/r2-constraints.mjs` asserts it). But
`validateTrip`'s `lat_lng_out_of_range` puts `lat` and `lng` into `Issue.params`, and §6.1's
cross-cutting rule — *"no coordinates in any log line, ever; log `stopId`, never `lat/lng`"* —
does not distinguish the two structures. It fires only on bad data, which is the data most
likely to be logged. Adjacent: the reference trip's one validation error is *Place "Windsor
Great Park / Long Walk" has no coordinates at all* reported under a code that says
out-of-range, and `Place.at` is nullable in the code while §2.2 types it `LatLng`.

## R2-18 — The determinism grep does not cover the reducer, which the constraint names
**Routing: builder.** `cairn-constraints` §4: *"No `Date.now()`, `Math.random()` or
`crypto.randomUUID()` inside `packages/core` **or the reducer**"*. `test/boundaries.test.ts`
walks `packages/core/src` only. `packages/client` is clean today (I grepped it), so this is a
missing guard rather than a live defect. Behavioural determinism holds: two processes produce
identical conflicts/issues/geo output, two CLI runs are byte-identical, `gen-sample` is
byte-stable.

## R2-19 — Redacted links render as live-looking dead links
**Routing: builder (cosmetic).** §6.6 keeps the label and drops the href, so the sample shows
`Palace tickets ↗` and `Tickets ↗` as `<a href="">`. Clicking does nothing (verified — no
navigation, no state loss). A disabled-looking affordance would read better in the demo.

## R2-20 — The CLI dies with an EPIPE stack trace when its stdout closes
**Routing: builder.** `node cli.ts export ../docs/BOOKINGS.md | head -1` prints the refusal and
then throws an unhandled `EPIPE` with a 20-line trace. Cosmetic, but it makes every piped CLI
check noisy.

## R2-21 — `computeLegs(day, trip)` vs §2.5's `computeLegs(day, ctx: TripCtx)`
**Routing: architect (doc).** The implementation takes the trip; the spec says a context object.
Harmless, but §2.5 is the section a native port will be written from.

---

## Round 1 findings: what is closed

| # | Round 1 | Round 2 verdict |
|---|---|---|
| F-1 | two tabs destroy each other's edits, loser says "Saved" | **half closed** — sequential case fixed and verified in Chromium; simultaneous case still loses an edit 2 runs in 3 → **R2-1** |
| F-2 | `importDoc` overwrote a stored trip | **closed** — collision check reads storage, a fresh id is minted, the stored edit survives (`qa/r2-import.mjs`) |
| F-3 | `typecheck` failed on a clean clone | **closed** — verified from a scratch clone |
| F-4 / F-4a | `impossible_transfer` artifacts | **closed in the model** — 0 blockers, 0 warnings, 21/81/10 split and the 7-minute margin all re-derived independently. The view half is **not built** → R2-10 |
| F-5 | `geo_outlier` could not see the Fisherman's Bastion typo | **closed** — injecting `place-68 lat +1°` produces exactly one new blocker naming `place-68`, 109 km, `anchorKind: city_stop`; 17 conflicts → 18. Sub-threshold sweep behaves as §2.13 documents (invisible at ≤33 km, caught from 37 km) |
| F-6 | a friend's trip renders as Jacob's own | **closed on the copy path** — `imported` from the instant the stop exists, and it survives 16 mutation paths, undo/redo, a 70-deep history unwind, a save+reopen, and a JSON round trip. Re-opens in the pool view (R2-8) and in free text (R2-3) |
| F-7 | `updateStop` rewrote provenance | **closed** — `id`, `placement`, `provenance` all throw; the other 13 patch keys keep the badge and the credit |
| F-8 | the `closed` rule could not fire | **closed** — rule deleted |
| F-9 | the vacuous conflict-id assertion | **closed** — restated; the mechanism is sound |
| F-10 | a dismissed conflict comes back still dismissed | **not closed in the product** — the fix exists and has no caller → **R2-7** |
| F-11 | `createTrip` accepted `2026-13-45` | **closed** — throws; `fromJSON`'s date domain is still open and is disclosed in KD-12 |
| F-12 | `fromJSON` accepts unknown enums / bad coordinates | **withdrawn — my error.** `qa/attack7.mjs` searched for `"category":"sight"` in output that `toJSON` pretty-prints as `"category": "sight"`, so five "ACCEPTED" lines were unmodified documents. With the right needles all five are rejected with a JSON path. The builder was right and said so more cautiously than the evidence required |
| F-13 | `canView` failed open with no clock | **closed for `now`**, open for the share's own dates → **R2-6** |
| F-14 | 64 symbols beyond §2.10 | **enumerated, not closed** — 112 vs 50, honestly reported as partial; the enumeration's reasons are wrong for 42 of 62 → R2-12 |
| F-15 | "No conversion rate for EUR" | **closed** — CLI verified by hand, call sites grepped by a test |
| F-16 | `cli export` could overwrite the live planner | **closed for lexical paths**, open for symlinks → **R2-5** |
| F-17 | `accepted_without_timestamp` skipped bookings | **closed** |
| F-18 | coordinates in `Conflict.params` and a golden | **closed** for conflicts and goldens; `Issue.params` still carries them → R2-17 |
| F-19 | the bundle embedded a PIN, refs and ticket URLs | **closed for those six strings, open as a rule** → **R2-4** |
| F-20 / M-1 / M-2 | source comments citing a section that did not exist | **closed and mutation-checked** — I added an undisclosed trigger comment (fails), a `KD-99` citation (fails), and a divergence written without a trigger word (passes, the known limit) |

---

## What I attacked and could not break

- **`copyStopInto`'s provenance stamp.** 16 individual `updateStop` patches; copy→accept→export→
  import; undo, redo, a 60-edit history unwound 70 times; save and reopen out of storage;
  copying the same stop twice (distinct ids, place reused, validation clean); copying a copy
  (credit flattens to the intermediary, as §2.14 specifies, and Marta is not recoverable from
  Sam's document — documented, not a defect); copying into the pool and scheduling back out.
  Provenance is rebuilt from scratch every time and `attribution` never depends on
  `displayStatus`. This is solid work.
- **The browsed document is genuinely read-only.** Dispatching against a browsed stop id throws
  `no such stop`; the stored source is byte-identical afterwards; `browsing` is cleared on trip
  switch; the browse pane never dispatches.
- **Storage failure and quota.** `failAll` during a save → `status: 'error'`, the edit stays in
  memory, nothing claims to be saved, and a later flush recovers cleanly.
- **Corrupt documents.** A truncated stored document is refused by `openTrip` *and* `browseTrip`
  with a `TripParseError` carrying a JSON path; the library still lists it, clicking it shows
  the error rather than a blank app.
- **Hostile `fromJSON` input.** Unknown enums, non-numeric and infinite coordinates, `null`
  days, `{}` stops, `schemaVersion` 0/99/"1"/absent, 2000-deep nesting, `__proto__` payloads —
  all rejected with a path, no prototype pollution. Unicode, emoji, a 5000-char name, a nul
  byte, an RTL override and `</script>` all round-trip byte-identically.
- **Privacy paths.** There is no ingest and no location code in Phase 1, and nothing to leak
  from: zero `console.*`, zero `fetch`/`XMLHttpRequest`/`sendBeacon` in `packages/*` and
  `apps/web/src`. No third-party analytics. No coordinates in any conflict output or committed
  golden.
- **Constraint compliance.** No DOM globals anywhere in `packages/client` (checked as globals,
  not just imports); zero third-party runtime dependencies in core, client and tokens;
  determinism holds across processes.
- **Maps.** Aug 8 opens on Vienna with all focus pins inside the viewport, and re-fits to
  identical pin positions after a hidden/shown tab round trip.
- **Duplicate bookings.** The two FlixBus legs sharing reference `3384415948` do **not** produce
  a false duplicate; the YZGDTS pair produces exactly one `superseded_booking` note.
- **The read-only boundary.** A full test run, three web builds, two CLI export attacks and six
  browser sessions later, `git status` shows only my own `qa/r2-*.mjs` files and
  `europe-2026-itinerary.html` is byte-identical.

## What I could not test

- **A real second user.** There is no server, so every "friend" here is a hand-built `ownerId`.
  R2-3's severity rests on the Phase 2 path being the same code, which the design says it is.
- **Safari, iOS, and a real IndexedDB quota wall.** Chromium only, in-memory quota simulation.
- **Map tiles.** No route to `tile.openstreetmap.org` from this sandbox; pins, polylines and
  bounds render, nobody has seen a tile.
- **Node 24.** This environment is 22.22.2, as the builder also reported.

---

# Round 3 — re-verification of `a746d75` (the R2-1 / R2-2 fix)

Tester, 2026-08-26. Attacked `master` @ `a746d75`, Node v22.22.2, Chromium over real elapsed
time. Scope: the changed files plus a confirmation pass on R2-6 / R2-11 / R2-18. Round 2's
untouched findings were not re-litigated.

**Result: 2 BLOCKER · 2 MAJOR · 5 MINOR.**

```bash
cd cairn && npm run typecheck && npm test        # 241 pass / 0 fail, typecheck clean
node qa/r3-cas.mjs        # the atomic CAS: 3-way race, self-race, storage failure, ABA, corrupt records
node qa/r3-cas2.mjs       # ABA in a user-shaped sequence, corrupt records ×6, catch-all double render
node qa/r3-undo.mjs       # R3-1 — undo lowers the stored revision and reopens R2-1
node qa/r3-loss.mjs       # R3-2 — the debounce window vs closeTrip / openTrip
node qa/r3-merge.mjs      # R3-3 — mergeWithStored does not chain onto `saving`
node qa/r3-pool.mjs       # the pool/validation path: poolCityFor, the new error code, the round trip
node qa/r2-access.mjs     # R2-6, unchanged
node qa/r2-copy.mjs       # R2-11, unchanged
node qa/r2-constraints.mjs # R2-18, unchanged

npm run web:build && node tools/serve.mjs &
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r3-browser.mjs   # R3-1 and R3-2 in real IndexedDB
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-poolloss.mjs  # R2-2, now passing
```

---

## BLOCKER

### R3-1 — Ctrl-Z lowers the stored `revision`, which lets a conflicting tab back in; both tabs then say "Saved"

**Routing: builder** for `packages/client/src/store/reducer.ts:115` (`undo`) and `:123` (`redo`);
**architect** for whether `Trip.revision` is the right compare-and-set token at all (see R3-4).
**Repro: `node qa/r3-undo.mjs`, and in a real browser `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
node qa/r3-browser.mjs` §1.**

The fix is right about the mechanism it replaced. `saveIfRevision` really is atomic, the
three-way race resolves to exactly one winner and two told losers (`qa/r3-cas.mjs` H), and a
store no longer races itself on the `save()` path. None of that is in question.

What is in question is the **token**. §2.2 declares `revision: number; monotonic; bumped by
every build function`, and the whole guard rests on that word. `reducer.undo()` does not go
through a build function — it restores a previously captured immutable `Trip`, `revision` and
all — and `store.undo()` then calls `scheduleSave()`, which writes that snapshot. So the stored
revision moves **backwards**, and a revision the guard has already handed out is issued a second
time to a different document.

`qa/r3-undo.mjs` §1, plain Node:

```
  stored revision: 2 -> 3 -> 2 after undo (title now "ONE")
  FAIL §2.2: `revision` is monotonic — it went 3 -> 2
```

That alone is a broken invariant. §2 is the exploit, and it is the R2-1 symptom sentence
verbatim. In real Chromium against real IndexedDB (`qa/r3-browser.mjs` §1):

```
  both tabs opened at stored revision 0
  after B is refused: tab B says "Not saved — edited elsewhere … (stored revision 1, this tab expected 0)"
  after tab A pressed Ctrl-Z: stored revision 0 (tab B still expects 0)
  FAIL the stored revision never goes backwards — 0 -> 0
  storage now contains: A EDIT=false B EDIT AGAIN=true
  tab A says "Saved"; tab B says "Saved"
  FAIL two tabs do not both display "Saved" over different documents
```

Read that sequence as a user: tab A renames a day and it saves. Tab B, open since before, is
correctly refused and correctly told. Tab A presses Ctrl-Z — an undo of its *own* edit, an
action with no cross-tab meaning whatever. Tab B's next keystroke now passes the compare,
because the revision it has been holding since it opened has been re-issued. Tab B's document
lands. Tab A is still showing `08-16 A EDIT`, `isDirty()` is `false` because
`doc.revision === savedRevision`, and its indicator says **"Saved"** over a document that is not
in storage. Tab B says "Saved" too. Nothing anywhere says an edit was lost.

Ctrl-Z is bound in `apps/web/src/App.tsx:28-33` and there are Undo buttons in
`views/TripView.tsx:51` and `views/Panels.tsx:64`, so this needs one keystroke, not a
contrived sequence.

The narrow fix is in the client: `undo`/`redo` must produce a *forward* revision rather than
replaying an old one (the snapshot's content with `revision: state.doc.revision + 1`), which
also restores §2.2's stated invariant. The wider question belongs to the architect and is
R3-4: a per-document counter that any client can rewind is not a version token, and the same
weakness is what makes delete-and-recreate invisible to the guard.

### R3-2 — An edit made inside the 400 ms autosave debounce is discarded, silently, when the trip is closed or switched

**Routing: builder** for `packages/client/src/store/store.ts:80` (`scheduleSave` — nothing
cancels or flushes `cancelPending`) and `:132` (`attemptSave` reads `state.doc` at *execution*
time, not the document the save was scheduled for); **architect** for the NO SILENT LOSS
criterion, whose enumerated list does not include this case. **Repro: `node qa/r3-loss.mjs`,
and `qa/r3-browser.mjs` §2 in a real browser.**

`dispatch()` schedules a debounced save 400 ms out. **No** path that changes the active
document — `closeTrip`, `openTrip`, `createTrip`, `adoptTrip`, `importDoc`, `deleteTrip` —
cancels that timer, flushes it, or warns. When it fires, `attemptSave()` reads whatever
`state.doc` *now* is, so the pending write for trip A is silently executed against trip B (a
no-op) or against nothing at all. There is also **no `beforeunload`, `pagehide` or
`visibilitychange` handler anywhere in `apps/web/src`** (`qa/r3-cas2.mjs` §4), so closing the
tab inside the same window has the same result.

`qa/r3-loss.mjs`, with the **real** default scheduler and real timers (§3), not the manual one:

```
  1. edit, then click "Cairn" (App.tsx:46 → closeTrip) inside the debounce window
     indicator right after the edit: Unsaved changes
     indicator after closing: Saved | stored day title: ""
     FAIL the edit is gone from storage and the indicator reads "Saved"

  2. edit trip A, then open trip B (Library.tsx:88) inside the debounce window
     FAIL A's edit is gone; the pending save wrote trip B (revision 1 -> 1) instead

  3. same, with real timers rather than the manual scheduler
     FAIL the edit survived — discarded, silently
```

And in Chromium, typing a day title and clicking the "Cairn" brand button (`App.tsx:46`)
immediately after (`qa/r3-browser.mjs` §2):

```
  after closing: the library is shown = true
  the edit is in storage = false
  anything on screen about an unsaved edit = NOTHING
```

This is not a race and needs no second tab. It is one click, inside a window the app itself
chose to be 400 ms long, and it is a direct violation of the sentence `a746d75` added to
ROADMAP Phase 1 F: *"no edit is ever discarded or made unreachable without the app saying so,
on screen, at the moment it happens."* The criterion's **testable** form enumerates five cases
— refused concurrent save, refused sequential save, failing `StoragePort`, restore over an
existing id, pool stop from a city-less day — and every one of them is a case where the edit
stays in memory. It does not enumerate the case where the edit's *container* goes away, which
is why a criterion written in the same commit as the fix still passes over it. That half is the
architect's: the enumeration needs a sixth row, "the active document is replaced or closed
while a write is pending".

---

## MAJOR

| id | severity | file:line | defect | repro | routing |
|---|---|---|---|---|---|
| **R3-3** | MAJOR | `packages/client/src/store/store.ts:266`, `:288` | `mergeWithStored()` does `saving = (async …)()` — an assignment, not `saving = saving.then(…)` like `save()` at `:127` — so a pending autosave and the merge are both in flight from **one** store, breaking the "one store never races ITSELF" invariant the same commit added. The merge lands correctly, then the orphaned autosave is refused against its now-stale expectation and sets `status='conflict'`. The user is left reading **"Not saved — edited elsewhere"** with `isDirty() === false` over a document that is fully and correctly saved, and it does not clear until the next edit. No data is lost; the indicator lies in the safe direction, which is still the indicator lying. | `node qa/r3-merge.mjs` (`writes in flight at the latch: 2  <-- two, from ONE store`; `after: status=conflict indicator="Not saved — edited elsewhere"` with both tabs' edits in storage) | **builder** |
| **R3-4** | MAJOR | `packages/client/src/ports/types.ts:41` (`SaveOutcome` / `saveIfRevision` contract) | The guard's token is a bare per-document counter, so it cannot see a document being **deleted and recreated** under the same id at the same revision (ABA): a writer holding revision 4 of the old document writes straight over a different document that also happens to be at revision 4, `ok:true`, indicator "Saved". `importDoc` keeps the original id when the id is free, which is exactly the export → delete → restore sequence. I could **not** build a user-shaped sequence where the two documents differ in content — within one lineage `(id, revision)` does identify a state — so this is filed on the port contract, not as a demonstrated loss, and it is the same root weakness as R3-1, where the revision *is* recycled with different content. | `node qa/r3-cas2.mjs` §2 (`outcome: {"ok":true}`, stored `STALE WRITER`); `node qa/r3-cas.mjs` E; the negative result is `qa/r3-cas2.mjs` §1, which correctly reports `conflict` | **architect** — the token, not the transaction, is what needs deciding; `apps/mobile`'s SQLite port and Phase 2's `SyncPort` inherit whatever it is |

---

## MINOR

| id | severity | file:line | defect | repro | routing |
|---|---|---|---|---|---|
| **R3-5** | MINOR | `packages/client/src/ports/memory.ts:52`, `apps/web/src/ports/storage.ts:83` (identical comparison) | `expectedRevision: null` compares **equal** to a stored record with no readable revision, so an expect-absent write silently overwrites it — for `{"id":"x","revision":` (truncated), `not json`, `{"id":"x"}` (no revision field), `{"revision":"7"}` (string), `{"revision":null}` and `{"revision":1e999}`. `ports/types.ts:24` states the opposite in terms — *"`null` means 'no readable revision' — a corrupt or truncated record, **which never compares equal to anything**"* — and `:47` says `null` means *"nothing may be stored under this id yet"*. Not reachable in `apps/web` today (ids are `crypto.randomUUID`, so `createTrip` cannot collide, and `adoptTrip`/`importDoc` check `load() !== null` first), which is the only reason this is not MAJOR. Undisclosed: no `KD-` entry. | `node qa/r3-cas2.mjs` §3 (6 shapes, all `ok:true`) | **builder** |
| **R3-6** | MINOR | `packages/core/src/build/pool.ts:70` | `returnToPool(trip, stopId, cityKey)` with an explicit `cityKey` bypasses `poolCityFor` entirely and mints a key the trip does not have, contradicting ARCHITECTURE §2.9's *"`returnToPool` will not mint an unreachable key"*. Reachable from the client as `dispatch({type:'returnToPool', stopId, cityKey})`. The stop is **not** lost — the new catch-all renders it and `pool_stop_unknown_city` fires — so this is a doc-vs-code divergence, not a repeat of R2-2. | `node qa/r3-pool.mjs` §2 (`pooled under: atlantis`) | **builder** (validate the argument) or **architect** (soften the sentence) |
| **R3-7** | MINOR | `packages/core/src/build/pool.ts:92` | `scheduleFromPool` throws `no such day` instead of falling back to `pickDay` when the stop's remembered `hint.dayId` names a day that no longer exists. Reachable without any hand-editing: pool the last stop off a day (the day is now empty) then shorten the trip with `setTripMeta` — `ensureDays` keeps days that still have stops but drops empty ones, so the hint is left dangling. Masked in `apps/web` because `PoolPanel`'s button always passes `hint:{dayId: activeDayId}`; not masked for the CLI, a test, or any future caller. | `node qa/r3-cas2.mjs` §5 (`FAIL … scheduleFromPool: no such day 2026-08-10`); `node qa/r3-pool.mjs` §5 | **builder** |
| **R3-8** | MINOR | `apps/web/src/views/Panels.tsx:106` + `packages/client/src/selectors/index.ts:48` | On a trip with **no cities**, `PoolPanel` computes `cityKey = activeCityKey ?? cities[0]?.key ?? ''` and renders `poolSection(trip, '')` *and* `unfiledPool(trip)`. A stop pooled under the empty-string key satisfies both, so it renders twice with the same React `key`. The panel also prints *"Nothing optional listed for this city"* immediately above a catch-all group that has contents. Not reachable from the web UI today (nothing in `apps/web` dispatches `addStop` with a `kind:'pool'` placement), only via the client API/CLI. | `node qa/r3-cas2.mjs` §6 (`pool=2 \| poolSection('')=1 \| unfiled=2 \| rendered=3`) | **builder** |
| **R3-9** | MINOR | `packages/client/test/store.test.ts:469` | The concurrent criterion requires the assertion be made *"against the indicator string the view renders, not `persistence.status` — a criterion that reads the enum keeps passing when the view stops reading it"*. The test's `saveIndicator()` is a **hand transcription** of `apps/web/src/App.tsx:102`'s `SaveState()`, and `packages/client` cannot import `apps/web` (the dependency-direction test forbids it), so the criterion is not satisfiable where it is asserted. Changing `App.tsx` alone cannot fail the test — the same failure mode the criterion was written against, one level up. The fix is a shared `saveIndicator(state)` in `packages/client` that `SaveState()` renders. | `node qa/r3-cas2.mjs` §7 | **architect** (restate against a shared function) then **builder** |

---

## What held up under attack

Everything below was attacked and did **not** break. Listed so the next reader knows what was
tried rather than assumed.

- **`saveIfRevision` atomicity.** Three tabs at one revision → exactly one winner, two told
  (`r3-cas.mjs` H). Five concurrent writers at one revision → one `ok:true`, four refusals each
  naming the revision actually found. Twenty rapid-fire dispatches during a held-open write →
  the last edit is stored, `status: 'idle'`, not dirty (`r3-cas.mjs` F). A save issued in the
  same turn as `openTrip` on a different trip → the other trip is not overwritten
  (`r3-cas.mjs` I). A `flush()` held open while the user switches trips → persistence still
  describes the trip that is open, no bogus conflict (`r3-cas.mjs` B). A storage failure
  mid-chain → `'error'`, and the next save recovers and stores the edit (`r3-cas.mjs` G).
- **Flakiness of the new concurrent test.** `--test-name-pattern="SAME MOMENT"` run 25 times:
  25 × `ok=1 notok=0`. It is deterministic, not scheduling-lucky — the memory port's
  `saveIfRevision` contains no `await`, so microtask order is fixed. The criterion's *prose* is
  met on every point except the indicator one (R3-9): both writes are issued before either is
  awaited, the assertions are on named stores, and `mergeWithStored()` carries the loser's edit
  through.
- **R2-2, genuinely closed.** Reference trip: `pool=31`, reachable through the city sections
  plus the catch-all `=31`, and **zero** false `pool_stop_unknown_city`. A brand-new trip with
  no cities carries no false error (the stated ceiling holds). `poolCityFor` picks correctly
  when the day's `primaryCity` has been deleted from `trip.cities` (falls back to the other
  real city on the day, not to the transit key) and when `day.cities` lists a second real city
  that is not primary (primary wins — the Aug 12 Dubrovnik→Split shape). A trip whose city is
  literally keyed `transit` renders each pooled stop exactly once. The injected fault
  (`cityKey: 'praha-typo'` through `fromJSON`) produces exactly one `error`, with no coordinate
  in `params`. The catch-all round-trips: `returnToPool` → catch-all → *Add to the plan* →
  back on the day. `qa/r2-poolloss.mjs` in Chromium: *"the stop is reachable again."*
- **Privacy.** The eight changed source files contain zero `console.*`, `fetch`,
  `XMLHttpRequest`, `navigator.*` or `localStorage` uses. The new `pool_stop_unknown_city`
  `params` carry `stopId`, `name`, `cityKey` and no coordinate; the new conflict `lastError`
  string carries two integers. No new sink for mailbox content or coordinates exists in this
  diff.
- **The read-only boundary.** After a full test run, a web build, six browser sessions and
  eleven probe runs, `git status` shows only `cairn/qa/r3-*.mjs` and this file;
  `europe-2026-itinerary.html` and the root `docs/` are untouched.

## What I could not test

- **A real IndexedDB quota wall or a transaction that aborts mid-write.** `apps/web`'s
  `saveIfRevision` rejects on `tx.onabort`, which the store turns into `'error'`; I provoked
  that through the in-memory port's `failAll`, not against a real browser quota.
- **Whether R3-4's ABA is exploitable with *differing* content.** I built the export → delete →
  restore sequence and it came out correct (the tab was told). The port-level statement stands;
  a user-shaped loss does not.
- **Safari, iOS, Node 24.** Chromium and Node 22.22.2 only, as in previous rounds.

---

# Round 4 — phase-gate re-verification of `3a124a2` (the §2.2a fence + flush-before-switch)

Tester, 2026-08-26. Attacked `master` @ `3a124a2`, Node v22.22.2, Chromium over real elapsed
time. Scope: re-verify R3-3 / R2-6 / R2-11, confirm R3-5…R3-9 unmoved, and hunt for regressions
the builder's own tests could not have caught — the builder wrote both the implementation and
its 22 `switch.test.ts` cases, which is a structural conflict of interest, not a slur.

**Result: 2 BLOCKER (both NEW) · 0 new MAJOR · 0 new MINOR.** Everything routed for
re-verification behaves exactly as reported, with one correction in the builder's favour
(R3-5 is fixed, not untouched) and one against (the `switch.test.ts` suite never crosses
undo with a transition, which is precisely where R4-1 lives).

```bash
cd cairn && npm run typecheck && npm test        # 288 pass / 0 fail, typecheck clean
node qa/r4-switch.mjs      # R4-1 §1-3; multi-tab, delete-under-a-tab, merge-vs-switch; §10 the invariant
node qa/r3-merge.mjs       # R3-3 — still FAILs, unchanged
node qa/r2-access.mjs      # R2-6 — still FAILs, unchanged
node qa/r2-copy.mjs        # R2-11 — still FAILs, unchanged
node qa/r3-cas.mjs qa/r3-cas2.mjs qa/r3-undo.mjs qa/r3-loss.mjs qa/r3-pool.mjs

npm run web:build && node tools/serve.mjs &
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-browser.mjs   # R4-1 in real IndexedDB; the page-exit leg
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-epoch.mjs     # R4-2 in real IndexedDB
```

---

## BLOCKER

### R4-1 — undo, then one more edit, re-issues a spent `revision`; the trip switch then walks over the edit saying "Saved"

**Severity: BLOCKER** (silent data loss; ROADMAP Phase 1 F "NO SILENT LOSS", sixth case,
clause (b) — *"a run in which the switch proceeds over an unsaved edit fails, regardless of
what is on screen"*).
**`packages/client/src/store/store.ts:258` (`dirty()`) and `:248-252` (`flushForTransition`),
with `packages/client/src/store/reducer.ts:127-132` (`undo`) supplying the mechanism.**
**Routing: architect first, then builder.** The architect owns §2.2a rule 1, whose stated
invariant is false; the builder owns the two lines that rely on it.
**Repro: `node qa/r4-switch.mjs` §1, §2, §3, §10; in a real browser
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-browser.mjs` §1.**

§2.2a is right about the fence and the fix is right about the fence. `StorageVersion` is
opaque, storage-issued, outside the document, and the reducer genuinely cannot name it — I
re-ran `qa/r3-undo.mjs`, `qa/r3-cas.mjs` and `qa/r3-cas2.mjs` probes 1–4 and every one is
clean. R3-1 really is structurally unreachable. **The write fence is not the only bare counter
in this file.**

`flushForTransition()` — the whole of rule 6a — decides whether to write at all like this:

```ts
const idle = state.persistence.status === 'idle';
if (state.doc && !(idle && !dirty())) { await save(); await saving; }
```

and `dirty()` is:

```ts
function dirty(): boolean {
  return !!state.doc && state.doc.revision !== state.persistence.savedRevision;
}
```

That is a *content* counter being asked "is there an edit that would be lost". §2.2a rule 1
licenses it, in terms:

> **Non-decreasing along a chain of build-function applications, and within one document in
> one store, equal `revision` implies identical content.**

**The second half of that sentence is false, and `qa/r4-switch.mjs` §10 falsifies it in six
lines.** `undo()` restores a snapshot verbatim, `revision` included; the next `dispatch()`
bumps from *that* number. So a document at revision N can be undone to N−1 and pushed forward
to a *different* revision N. One document, one store, equal revision, different content —
R3-1's exact mechanism, aimed at the dirty test instead of at the fence.

The consequence, run in Chromium against real IndexedDB (`qa/r4-browser.mjs` §1):

```
  after EDIT A saved: stored revision 1 | indicator "Saved" | stored has EDIT A = true
  [Ctrl-Z, then one click on DayTimeline.tsx:161's ↓ reorder, then the "Cairn" brand button]
  library shown = true
  stop order before = stop-57,stop-58,stop-59,stop-60,stop-61,...
  stop order after  = stop-57,stop-58,stop-59,stop-60,stop-61,...
  stored revision now 1
  anything on screen about an unsaved edit = NOTHING
  FAIL the reorder survived the click, or the user was told it did not
```

Both the undo *and* the reorder are gone. Storage still holds the pre-undo document. Nothing
is on screen. This is R3-2's symptom sentence — *one click, no second tab, nothing on screen* —
and it is reachable through `closeTrip` (§1), through `openTrip` (§2), and it defeats the
`beforeunload` "Leave site?" prompt too (§3), because that handler is also gated on
`isDirty()`.

The exploit window is the 400 ms debounce that follows the undo: the second edit has to be a
single dispatch inside it, which is why the browser repro uses the ↑/↓ reorder buttons rather
than the rename dialog. "Undo, then immediately nudge a stop, then go back to the library" is
an ordinary thirty seconds of editing.

**Why the builder's own suite is green.** `packages/client/test/switch.test.ts` — the 22 tests
written for this fix — contains **zero** occurrences of `undo` or `redo` (grep it). Every
undo/redo case lives in `storage-version.test.ts`, which tests the *fence* and never performs
a transition. The two halves of `3a124a2` were tested separately and never crossed. Worse,
`switch.test.ts` uses `isDirty() === false` as its *proof of success* at ten call sites
(`:145`, `:169`, `:181`, `:197`, `:213`, `:230`, `:406`, `:428`, …) — exactly as ROADMAP F
clause (a) words it — so the broken oracle is what the suite asserts against. This is not a
missing test; it is a test suite built on the predicate that fails.

**What the architect has to decide, not the builder.** §2.2a rule 1's invariant needs
restating — snapshot undo/redo makes `revision` non-injective over content, so *nothing* may
infer "unchanged" from equal revision, which is a slightly stronger sentence than the one that
struck "monotonic". The obvious client-side answer is to compare the document *identity*
(`state.doc !== lastWrittenDoc`, cheap and exact, because build functions are immutable and
`writeAndSettle` already keeps `baseDoc`), not its revision. That is a design call because
`Trip.revision` also keys the derived cache (§4.2 rule 3), which has the same non-injectivity
and a much smaller blast radius.

---

### R4-2 — a `StorageVersion` minted by a database that no longer exists is accepted by its replacement

**Severity: BLOCKER** (silent overwrite of another writer's document with "Saved" on screen —
the R2-1/R3-1 symptom sentence; ARCHITECTURE §2.2a rule 2 and ROADMAP Phase 1 F "Freshness"
clause 1 both violated in terms).
**`apps/web/src/ports/storage.ts:86-135` (`ensureReady` memoises `ready` and assigns the
closure variable `epoch` exactly once) and `:205` (`saveIfVersion` mints from that cached
value against a counter it re-reads from a database that has rewound to 0).**
**Routing: builder.** The design is right; the implementation caches the one thing the design
says must be re-read. §2.2a needs no change.
**Repro: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-epoch.mjs`.**

§2.2a rule 2 is unambiguous:

> **It never repeats within one storage, ever** — not after a `delete()`, not after the record
> is recreated under the same id, **not after the whole database is recreated.**

and names the mechanism for the third clause:

> the epoch is there because **clearing site data resets the counter while a tab holding an old
> token survives**, and that is the same ABA one level up.

The epoch does not cover that case, because the surviving tab is exactly the one that never
re-reads it. `ensureReady()` resolves once per port instance and caches `epoch` in the
closure. A tab that was alive before the wipe keeps minting `${deadEpoch}.${n}` — and `n` now
comes from a `meta` store that was destroyed with the database, so it restarts at 1.

Run, in Chromium against real IndexedDB:

```
  epoch="50748ca0-…-d75ea7d87587"  fence="50748ca0-…-d75ea7d87587.1"
  tab B is open on the trip, holding "50748ca0-…-d75ea7d87587.1"
  database deleted. docs record = null
  after the restore: epoch=null fence="50748ca0-…-d75ea7d87587.1" (pre-wipe fence was the same)
  FAIL the recreated database issues a token it has never issued before
  FAIL the recreated database records an epoch at all
  tab B says "Saved"
  storage holds tab B's edit = true
  FAIL tab B was refused
```

The user-shaped sequence is: two tabs open; storage is evicted or cleared; one tab restores
the backup through *Restore from a backup* (`importDoc` keeps the original id, correctly,
because the id is free); the other tab — which has been sitting there the whole time — types
one character. Its pre-wipe token matches the post-wipe fence, the write is accepted, the
restored document is destroyed, and the indicator reads **"Saved"**. This is the case R3-4 was
filed on, one level up, in the mechanism written to close it.

Two things make this worse than "the user pressed Clear site data": ARCHITECTURE §1.1 records
that a **non-installed tab's storage may be evicted by the browser after 7 days**, which is the
same event with nobody pressing anything; and the recreated database ends up with
`meta.epoch === null`, because only `ensureReady` ever writes `EPOCH_KEY` and it has already
run — so versions are being minted against an epoch that nothing has persisted.

The precondition is rarer than R4-1's, and I have said so rather than levelling them. It is
still an explicit contract clause failing, producing a silent overwrite, on the third
consecutive round of the same root pattern. Cheap fixes exist (re-read the epoch when a write
finds a counter lower than one this port has already issued; or mint a per-port-session nonce
and use `${epoch}.${session}.${n}`); which one is the builder's call.

---

## Re-verified and unchanged — the three findings this round was routed to confirm

| # | Verdict | Evidence |
|---|---|---|
| **R3-3** | **Still open, exactly as filed. Neither fixed, worsened nor masked.** `store.ts` now has **three** bare `saving = …` assignments where R3-3 named two — `:156` is `save()`'s own chain-and-assign, which is correct; `:330` (the deleted-trip branch) and `:352` (the merge branch) are the two the finding is about, and both are unchanged in substance. The behavioural half still reproduces: two writes in flight from one store, ending `status='conflict'` with `lastMerge` shown over a document that is fully and correctly saved. | `node qa/r3-merge.mjs` — static FAIL *"every write path chains onto `saving`"* (3 assignments listed) and behavioural FAIL *"the store settled and the merge notice is shown — status=conflict"*; `node qa/r3-cas.mjs` A agrees |
| **R2-6** | **Still open, unchanged, and genuinely untouched.** `git log -- packages/core/src/access/predicates.ts` shows its last commit is `1628ed4`, three commits before round 2 even ran. Six malformed `expiresAt` values still return `canView=true`. | `node qa/r2-access.mjs` — `expiresAt="2026-13-45"/"tomorrow"/"never"/""/"9999-99-99"` all `-> canView=true` |
| **R2-11** | **Still open, unchanged, and genuinely untouched.** `build/copyStop.ts` last changed at `b5c742b` (R2-3's fix); `model/provenance.ts` has not changed since the first delivery. `acceptCandidate` with `actorUserId:"user:someone-else"` and with `actorUserId:null` both produce `displayStatus() === 'own'` on a trip owned by `local:self`. | `node qa/r2-copy.mjs` §B — two FAIL lines, `status=own, actor=user:someone-else, trip.ownerId=local:self` |

## R3-5 … R3-9 — the quick pass, with one correction

`3a124a2` touches `store.ts`, `reducer.ts`, `pool.ts`? — **no.** `git show --stat 3a124a2`
lists 19 files and `packages/core/src/build/pool.ts` is not among them. `store.ts` and
`reducer.ts` are. So:

- **R3-5 (MINOR) — now CLOSED, and the builder's report says otherwise.** BUILD-NOTES §5 says
  *"`qa/r3-cas2.mjs` probes 5, 6 and 7 likewise still FAIL, unchanged"*, which is true, and
  §5's "not fixed" list implies R3-5 with them. Probe **3** — R3-5's probe — now reports
  **6 of 6 `ok:false`**: the fence never parses the stored record, so `expectedVersion: null`
  can no longer compare equal to a corrupt one. Fixed by construction, as a side effect of
  §2.2a. Worth recording because an under-claimed fix is still an inaccurate report.
- **R3-6, R3-7 (MINOR)** — `packages/core/src/build/pool.ts:70`, `:92`. File untouched;
  `qa/r3-pool.mjs` §2/§5 and `qa/r3-cas2.mjs` §5 FAIL identically. Unchanged.
- **R3-8 (MINOR)** — `apps/web/src/views/Panels.tsx:106`. File untouched; `qa/r3-cas2.mjs` §6
  FAILs identically (`pool=2 | poolSection('')=1 | unfiled=2 | rendered=3`). Unchanged.
- **R3-9 (MINOR)** — `packages/client/test/store.test.ts:469`. That file **is** in the diff
  (+48), but the transcription is still a transcription: `qa/r3-cas2.mjs` §7 FAILs identically
  (*"the literal lives in BOTH store.test.ts and App.tsx: true; the test imports the view:
  false"*). And `switch.test.ts:54` and `page-exit.test.ts` now carry a **third and fourth**
  copy of the same transcribed `SaveState()` — the finding's blast radius grew even though its
  status did not.
- **R2-18 (MINOR)** — `qa/r2-constraints.mjs` still FAILs the determinism grep on
  `packages/client`. Unchanged.

## What held up under attack

Attacked and did **not** break. Listed so the next reader knows what was tried.

- **Three and four concurrent tabs**, not just two (`qa/r4-switch.mjs` §4). Four stores at one
  `savedVersion`, all four writes issued before any is awaited: exactly one `'idle'`, three
  `'conflict'`, and no losing tab renders "Saved" over a document storage does not hold.
- **A trip deleted in one tab while another tab holds a pending edit on *that* trip** — the
  case R3-2 did not cover, because R3-2's sixth case is about the *active* document in the
  *same* store (§5). The surviving tab's write is refused (`expectedVersion` matches nothing
  under a deleted id), it reads *"Not saved — edited elsewhere"*, and it does **not** resurrect
  the trip the user deleted.
- **`importDoc` onto an id another tab currently has open** (§8). A fresh id is minted, the
  live trip's bytes are untouched, and the tab holding it can still write afterwards — its
  fence was not disturbed by the neighbouring mint.
- **`mergeWithStored` racing a fresh autosave from the same store immediately after a switch**
  (§6) and **`flushForTransition` called while `saving` is still resolving a previous merge**
  (§7). Neither loses a document, neither leaves the store on trip B holding trip A's
  persistence, and `savedVersion` still describes the trip that is open. R3-3's indicator lie
  is the only symptom, and it is already filed.
- **Three tabs cycling save / undo / switch in six different orders** (§9). No tab ends up
  rendering "Saved" over a document storage does not hold.
- **The page-exit leg BUILD-NOTES §6 says was never run.** `qa/r4-browser.mjs` §2 and §3, in
  Chromium: type a day title, fire `visibilitychange`→`hidden` (and separately `pagehide`)
  inside the 400 ms debounce, then read IndexedDB directly. **The edit is there, both times.**
  ROADMAP F's "plus one Chromium run" clause is now genuinely met. §4 additionally confirms
  that `flush()` is unconditional — it does *not* consult `dirty()` — so R4-1 is scoped to
  `flushForTransition`, not to every write path.
- **Determinism, zero-dep, no DOM in `packages/client`.** `packages/client/src` and
  `apps/web/src` contain zero `console.*`, `fetch`, `sendBeacon` or `Sentry`; no `Date.now()`,
  `Math.random()` or `randomUUID` outside `apps/web`'s port (where §2.2a explicitly permits
  it) and doc comments. The new `pageExit.ts` takes structural `{addEventListener,
  removeEventListener}` targets and names no DOM type — KD-22's claim checks out.
- **The sensitive paths (§5, §6).** Phase 1 ships no ingest and no location code, so there is
  nothing there to leak; the persistence diff introduces no logging sink, no network call and
  no coordinate-bearing string. `npm test`'s redaction and bundle checks pass at 288/0.
- **The read-only boundary.** After a full test run, a web build, five browser sessions and
  fourteen probe runs, `git status` shows only `cairn/qa/r4-*.mjs` and this file.

## What I could not test

- **Two devices, or a real server.** Phase 2's `SyncPort` does not exist.
- **Safari, iOS, Node 24, a real quota wall.** Chromium and Node 22.22.2 only, as in every
  previous round.
- **Whether R4-2 is reachable through browser-initiated eviction** rather than through an
  explicit `indexedDB.deleteDatabase`. The mechanism is identical — the database goes away
  under a live tab — but I could not make Chromium evict on demand, so the *trigger* is
  simulated and the *defect* is not.

---

# Round 5 — verification of `c3c79b3` (ARCHITECTURE §2.2b, the freshness rule)

Tester, 2026-08-26. Attacked `master` @ `c3c79b3`, Node v22.22.2, Chromium over real elapsed
time. Scope: confirm §2.2b F1/F2/F3 are *implemented* and not merely compiled, hunt regressions
the builder's own tests cannot catch, re-run every previously-open finding, and classify one
finding the coordinating session raised that the builder's report did not surface.

**Result: 1 BLOCKER (new) · 1 MAJOR (new) · 3 MINOR (new).** Everything `c3c79b3` claims to
fix is genuinely fixed and verified independently, including the two Chromium legs. The new
BLOCKER is the same root cause one step further along the same function.

```bash
cd cairn && npm run typecheck && npm test        # 318 pass / 0 fail, typecheck clean
node qa/r5-freshness.mjs   # §1 the dirty oracle across the transitions the builder's walk skips
                           # §2 every way to fool the three-conjunct skip   §3 the token mint
                           # §4 the derived cache   §5 the R2-11 ruling   §6 R5-1 (BLOCKER)
node qa/r4-switch.mjs qa/r3-loss.mjs qa/r3-undo.mjs qa/r3-pool.mjs qa/r3-cas.mjs qa/r3-cas2.mjs
node qa/r3-merge.mjs qa/r2-copy.mjs qa/r2-access.mjs qa/r2-constraints.mjs qa/r2-resolutions.mjs

npm run web:build && node tools/serve.mjs &
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r5-browser.mjs   # R5-1 in real IndexedDB
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-browser.mjs   # R4-1, 4/4 ok
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-epoch.mjs     # R4-2, 6/6 ok
```

## BLOCKER

### R5-1 — an edit typed while a trip switch is flushing is discarded, silently, by five of the six transitions

**Severity: BLOCKER** (silent data loss; ROADMAP Phase 1 F "NO SILENT LOSS", sixth case clause
(a) — *"after the call returns, the stored bytes for the outgoing trip contain the edit and
`isDirty()` is false"* — and §2.2b F1's check, *"enumerate every branch that can cause
`saveIfVersion` not to be called for a document that differs from what storage holds"*).
**`packages/client/src/store/store.ts:263`** (`flushForTransition`'s return), with
**`:223`** (`if (!stillOurs) scheduleSave()`) and **`:159`/`:161`** (`attemptSave`'s two early
returns) supplying the mechanism.
**Routing: builder.** The design already says what must be true here; the code samples the
wrong fact to decide it. No new architectural judgement is required, though the architect may
want to look at the second-order question in "What the fix is not", below.

**The sequence, which is two clicks.** With trip A open and one unwritten edit pending:

1. The user clicks "Cairn" (`closeTrip`). `flushForTransition()` cancels the debounce timer,
   sees `dirty()`, and awaits `save()`. `attemptSave` captures `doc = state.doc` (call it
   *D2*), sets `status:'saving'` and hands *D2* to `saveIfVersion`.
2. **While that write is awaiting IndexedDB, the user nudges a stop with ↓.** One dispatch.
   `state.doc` becomes *D3*. BUILD-NOTES §6 names this window itself — *"there is no spinner
   or disabled state while it does — the button just takes as long as the write takes"* — so
   every control in the app is live for the whole of the write.
3. The write of *D2* succeeds. `writeAndSettle` correctly notices `stillOurs === false`, sets
   `savedDoc = D2` (which is true: that is what storage holds), leaves `state.doc` at *D3*,
   and re-arms the 400 ms debounce for *D3*.
4. Control returns to `flushForTransition`, which reads **`persistence.status`** — `'idle'` —
   and returns `true`. It never re-asks `dirty()`, which at that instant is `true`.
5. `closeTrip` proceeds: `set({...initialState(), library})`. `state.doc` becomes `null` and
   the re-armed timer is orphaned. When it fires, `attemptSave` hits `if (!doc) return`
   (`:159`) and drops the write. For `openTrip` it hits `if (forTripId !== null && doc.id !==
   forTripId) return` (`:161`) instead. Same outcome.
6. `isDirty()` is now `false` — not because the edit was written but because
   `!!state.doc` is `false`. Every downstream consumer (the save indicator, the `beforeunload`
   gate) reads clean. Nothing appears on screen.

**Root cause, stated once.** `flushForTransition` exists to guarantee "a pending write is
never outlived by its document" (§4.2 rule 6a) and it verifies that guarantee by checking a
*status enum sampled after the fact* rather than by checking the *thing the guarantee is
about*. That is R4-1's error — a fact about a resource read somewhere other than where the
resource stated it (§2.2b's principle) — surviving inside the very function §2.2b F1 was
written to fix. F1's check names the branch: `attemptSave`'s two early returns cause
`saveIfVersion` not to be called for a document that differs from what storage holds, and
neither is justified by F2 nor is the one stated exception (rule 6c).

**It is not the debounce timer.** With `autosave:false` — no timer exists to orphan — the edit
is lost identically. The timer is a symptom; the decision at `:263` is the defect. Verified:
`qa/r5-freshness.mjs` §6 runs both.

**Scope, measured not reasoned.** Five of the six transitions lose it: `closeTrip`,
`openTrip`, `createTrip`, `adoptTrip`, `importDoc`. `deleteTrip(otherId)` is **safe** — it
does not replace `state.doc`, so the re-armed timer still finds its document.
`deleteTrip(activeId)` losing it is §4.2 rule 6c's stated exception and is asserted as one.

**Reproduction.**

```bash
node qa/r5-freshness.mjs                                           # §6 — five FAILs, one per transition
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r5-browser.mjs   # real Chromium, real IndexedDB
```

`qa/r5-freshness.mjs` §6 is deterministic: real timers, the real debounce, and a storage port
that parks the write inside `saveIfVersion` — which is what a real IndexedDB write does, only
for longer. `qa/r5-browser.mjs` is the same sequence through the shipped UI and reproduces at
**5 delays out of 5** (0, 1, 2, 4 and 8 ms between the brand click and the ↓ click):

```
delay=0ms · edit THREE reached the UI = true · storage ends up holding what the user last saw = false
      position 4 — last seen "Astronomical Clock", storage holds "Lunch, Old Town"
   anything on screen about an unsaved edit = NOTHING
```

**What the fix is not.** "Cancel the timer harder" does not touch it — the timer is not the
carrier. Re-asserting `!dirty()` before returning `true`, and flushing again while dirty (with
a bound, because a user typing fast can keep it dirty forever), is the shape that follows from
F1. If the builder would rather close the window than drain it — disable the app while a
transition's flush is in flight, which BUILD-NOTES §6 already suggests for unrelated reasons —
that is a UI decision worth one line from the architect, not a redesign. Either way the
criterion the fix must satisfy already exists: ROADMAP F's sixth case, clause (a), asserted on
**bytes**.

## MAJOR

### R5-2 — `accepted_by_non_member` exempts a missing actor, so an "accepted by nobody" credited record validates clean

**Severity: MAJOR** (a validation rule that does not fire on a shape its own specification
covers; no Phase 1 data loss and no cross-user leak, because Phase 1 has one user and
`attribution()` still names the source).
**`packages/core/src/validate/validateTrip.ts:57`** — `if (!actor || memberIds.has(actor)) return;`
**Routing: builder.** Classification **(b)** — see below; the design already answers this and
the fix is one operator.

The rule's subject and predicate are stated in ARCHITECTURE §2.9: *"a record with a non-null
`attribution()` whose `provenance.state === 'accepted'` and whose `provenance.actorUserId` is
**not a member of the trip**"*. A `source:'friend'` stop with a valid `origin`,
`state:'accepted'`, `acceptedAt` set and `actorUserId` of `null`, `undefined` **or `''`**
satisfies all three conjuncts — `members(trip)` is `{trip.ownerId}` in Phase 1 and contains
none of those three — and produces **zero** issues. `displayStatus()` returns `'own'` and
`needsBadge()` is `false`, so the record renders as the user's own plan with nobody nameable
as having accepted it.

**Reproduction:** `node qa/r5-freshness.mjs` §5.3–§5.7 (eight FAILs).

```
FAIL actorUserId=null:      issues added: [none] · displayStatus=own · attribution=true
FAIL actorUserId=undefined: issues added: [none] · displayStatus=own · attribution=true
FAIL actorUserId="":        issues added: [none] · displayStatus=own · attribution=true
FAIL fromJSON REJECTS an accepted, credited record with no actor — it parsed clean
FAIL store.importDoc refuses a backup carrying the shape — it restored clean into the library
FAIL core.accept(p, at, null) — it produced state=accepted actorUserId=null, displayStatus=own
FAIL the shape cannot be minted through the public build API without a hand edit or an import
FAIL ...nor through the client store's own addStop action
```

## The classification the coordinating session asked for: **(b)**, not (a) and not (c)

*(a) a Phase 1 criterion violation · (b) an implementation defect inside the approved design ·
(c) a genuinely ambiguous edge case needing a design decision.* **It is (b)**, and here is why,
tied to the text rather than to a preference.

**1. §2.9's predicate already answers it, conjunct for conjunct.** The rule is defined as
*"a record with a non-null `attribution()` whose `provenance.state === 'accepted'` and whose
`provenance.actorUserId` is not a member of the trip"*, followed immediately by *"In Phase 1
`members(trip) === {trip.ownerId}`"*. `trip.ownerId` is a non-null string (`LOCAL_OWNER` in
Phase 1), so `null ∉ members(trip)` for every trip that exists. Applying the sentence
mechanically produces the issue. The implementation adds a **fourth, unstated conjunct** — the
actor must be truthy — and that conjunct appears in no sentence of §2.9, §2.14 or ROADMAP.

**2. The one null-actor exemption the design states is scoped by `attribution`, not by
nullness.** §2.14, *"Explicitly out of scope in Phase 1, named rather than left silent"*:
`source:'user'` records *"carry `actorUserId: null` today … They assert no acceptance of anyone
else's content, so nothing is being presented as the user's own that was not; `attribution()`
on them is `null`, **which puts them outside the invariant's subject**."* The design named the
exact null-actor case that stays legal and gave the reason — it is unattributed. The reason
does not extend to an attributed record; it is the sentence that distinguishes the two.

**3. The `''` case removes the last ambiguity.** `!actor` also exempts `actorUserId: ''`, and
`''` is a *present* value of type `UserId`. §2.14's own `requireActor` classifies `''` as a
missing actor and throws on it at construction, so the design already holds a position on it.
There is no reading of *"wrong (non-member)"* under which `'' ∈ members(trip)`. Whatever one
thinks about whether "no actor at all" is a *kind* of wrong actor, `''` is unarguably a
non-member, and the implementation lets it through. Verified above.

**4. §2.14's prose and §2.9's formula point the same way, which is what forecloses (c).**
§2.14 clause 2 reads *"**A wrong (non-member) actor** is `validateTrip`'s
`accepted_by_non_member`, §2.9"*. The parenthetical *defines* "wrong" as "non-member" and the
clause *delegates to §2.9* for the predicate. Two texts agreeing is not two texts in conflict.
(c) requires the design to be silent or self-contradictory on this question; it is neither.

**5. §2.9's stated reason for making it an `Issue` rather than a throw transfers verbatim.**
*"It is an `Issue` and not a throw because a wrong actor arrives inside a document (a restored
backup, a hand-edited record, a Phase 2 sync), where throwing means an unopenable trip."* A
null actor arrives by exactly those three routes: `fromJSON.ts:106` parses `actorUserId` as
`strOrNull`, and `store.importDoc` restores such a document into the library as a live trip —
both verified. §2.14's framing — *"The invariant is a claim about which documents may exist,
so it is enforced at the two places documents come from"* — makes catching documents that
could not be freshly created but can arrive from outside explicitly `validateTrip`'s job.

**6. And it is not import-only, which removes the strongest argument for leniency.** The
premise that the throw at construction is the only gate is **false in the shipped code**:
`build/stops.ts:71` and `:91` copy `StopInit.provenance` verbatim, and `accept` is on the
public export surface (`index.ts:21`) with `actorUserId: UserId | null`, unchecked. Two public
calls mint the shape with no hand edit and no import, and the same two are reachable from the
client as `store.dispatch({type:'addStop', stop:{provenance}})`:

```js
core.addStop(trip, placement, { name, category,
  provenance: core.accept(core.friendImport(today, {friendUserId, sourceTripId, sourceStopId}), today, null) }, ctx)
// → displayStatus=own · needsBadge=false · attribution=non-null · accepted_by_non_member=0
```

**7. ROADMAP has already ruled on the substance, so (c) would be relitigating it.** ROADMAP
§D: *"That does not make the behaviour acceptable, and calling it a Phase 2 deferral would be
wrong … a genuine unmet Phase 1 obligation, mine … **Whether a second user exists is beside the
point for the null-actor half** — an acceptance with no accepter is a row whose ownership can
never be established afterwards."* The architect has already decided the null-actor half is in
scope for Phase 1 and said why. The remedy chosen was criterion 1 (the throw); this finding is
that criterion 1 is not the only construction path, and criterion 2's predicate as stated in
§2.9 already covers the remainder.

**Why not (a).** Both `[stated]` criteria in ROADMAP §D pass as literally written, and I ran
both: the throw fires over the full ref matrix with the input trip byte-identical and
`revision` unmoved, and the injected fault with `actorUserId:'user:someone-else'` produces
**exactly one** additional issue with both the actor and the owner in `params`, and zero
additional issues on the unmodified reference trip. No acceptance-criterion sentence is
falsified. What is falsified is ARCHITECTURE §2.9's definition of the rule's own predicate —
and §2 opens with *"This section is the builder's contract. Where it says MUST, the tester will
check it."* Code that does not implement the spec it was handed is an implementation defect.
Calling it a criterion violation would be inflating it; calling it ambiguous would be worse.

**The fix, and why it needs no new design decision.** `validate/validateTrip.ts:57`:

```ts
- if (!actor || memberIds.has(actor)) return;
+ if (actor && memberIds.has(actor)) return;
```

plus `params: { actorUserId: actor ?? '', … }` and a message that reads sensibly when there is
no actor. Everything else is already specified: the subject (non-null `attribution()`), the
level (`error`), the `ref`, the `params` contents, and `members(trip)`. **The ROADMAP ceiling
survives untouched** — *"zero additional issues on the unmodified reference trip"* — because
the Europe 2026 reference trip contains **zero attributed records at all**, so no
`source:'user'` record can be caught by the widened rule. That is measured, not assumed
(`qa/r5-freshness.mjs` §5.6). The only genuinely open point is the wording of the message when
there is no actor, which §2.1's *"structured `params` beside the string"* rule already shapes.

**R5-5 is the same ruling's other loose end** and is filed separately below, because it is a
different file and a different fix.

## MINOR

| id | severity | file:line | defect | repro | routing |
|---|---|---|---|---|---|
| **R5-3** | MINOR | `packages/client/src/store/store.ts:257`, `:263` | A store in `'conflict'` that holds **no** unwritten edit can never leave the trip: the three-conjunct skip is disabled by `status !== 'idle'`, so every transition re-flushes, is refused again on the same stale expectation, and aborts. Reachable with **zero edits** — the `visibilitychange`/`pagehide` handlers call `store.flush()` unconditionally, so another tab writing while this one is backgrounded is enough. "Back to all trips" then does nothing at all; only *Merge and save* or deleting the trip gets out. The conflict banner is on screen throughout, and §4.2 rule 6b is written unconditionally, so the **implementation matches the text** — the text has no not-dirty exception. | `node qa/r5-freshness.mjs` §2.4 (`closeTrip is refused even though there is nothing to lose`; `...and openTrip is refused too`) | **architect** (rule 6b's scope), then builder |
| **R5-4** | MINOR | `apps/web/src/store.ts:40`, `packages/client/src/store/derived.ts:89` | The derived cache's new `today` key is correct — a changed date invalidates it, verified — but nothing in `apps/web` re-renders when the date changes (zero `setInterval`/`setTimeout` outside `ports/file.ts`), so an idle tab open across midnight never consults it. §2.2b's claim that adding `today` *"closes a smaller pre-existing hole"* is true of the cache and not yet true of the screen. | `node qa/r5-freshness.mjs` §4 (`the clock moving invalidates it` — ok) plus `grep -rnE "setInterval\|setTimeout" apps/web/src` (zero hits; the only timer at all is a `requestAnimationFrame` revoking a blob URL in `ports/file.ts:23`) | **builder** (a visibility/interval nudge) or **architect** (scope the claim) |
| **R5-5** | MINOR | `packages/core/src/model/provenance.ts:75`, `:80`, exported at `packages/core/src/index.ts:21` | `accept(p, at, actorUserId: UserId \| null)` and `reject(...)` are on the public export surface with the nullable parameter and **no** `requireActor` check, so §2.14's *"`actorUserId` stops being `UserId \| null`"* holds for the three named build functions and not for the primitive underneath them. `surface.test.ts:90` justifies the export as *"used by the client for optimistic UI"*; nothing in `packages/client`, `apps/web` or `cli.ts` calls it. Combined with `StopInit.provenance` this is R5-2's construction path. | `node qa/r5-freshness.mjs` §5.5, §5.7 | **builder** (route through `requireActor`, or drop the export) |

## What I attacked and could not break

Every item below is an attack that was **run**, not an area that was skimmed.

- **`dirty()`/`savedDoc` against §2.2b F1/F2.** `savedRevision` is gone from `AppState`
  entirely; `savedDoc` is assigned in exactly three places and all three are port results or
  `initialState()` (`writeAndSettle:215`, `openTrip:489`, `reducer.ts:111`); the reducer never
  names it. The F2 grep is clean: **zero** occurrences of `revision` in a comparison, a
  dependency array or a memoisation key anywhere in `packages/client/src` or `apps/web/src`
  (the only two hits are a sample-JSON field and a comment). `core` has no `===` on `revision`
  at all.
- **The dirty oracle across the transitions the builder's own 200-step walk never visits.**
  `dirty.test.ts` walks `dispatch`/`undo`/`redo`/`flush`/`closeTrip`+`openTrip`.
  `qa/r5-freshness.mjs` §1 adds `mergeWithStored`, `createTrip`, `deleteTrip`, `importDoc` and
  `syncResolutions` and checks `isDirty()` against the byte oracle at every step: **11/11
  single-writer checkpoints agree.** The twelfth is the disclosed passively-stale-tab case
  (BUILD-NOTES §6) and is a different question, not a disagreement.
- **Fooling the three-conjunct skip.** Undo back to the *identical object* storage holds
  (clean, correctly, and the oracle agrees); autosave disabled so the skip rests on
  `doc === savedDoc` alone; a store in `'error'` (self-heals — the retry writes); `openTrip`
  onto the already-active trip while dirty; `adoptTrip` onto a stored id, which flushes twice
  and writes once. All correct. §6 is where it finally broke, and it broke **after** the skip,
  not through it.
- **The token mint.** 1 200 tokens across 200 memory-port instances with interleaved deletes,
  zero repeats. 300 000 mints of the shipped `apps/web` construction under a real CSPRNG in one
  tight loop, **zero collisions**, every token 22 chars of base64url — there is no time
  component and no counter, so "two mints in the same millisecond" is not a category that
  exists here. Static: nothing on the path from entering `saveIfVersion` to producing
  `version` is a closure identifier, no `Date.now`/`Math.random`/`randomUUID`, and the port
  throws rather than degrading. Opacity: no ordering, arithmetic, `split`, `slice` or
  `JSON.parse` of a `StorageVersion` above the port; `revisionOf()` is gone; **no test, golden
  or fixture pins a token literal.**
- **The derived cache moving the bug elsewhere.** It does not. Identity subsumes `tripId`
  correctly (two different trips at the same revision recompute); a *different document at the
  same revision* recomputes, which is the R4-1 shape; the clock invalidates it; both call sites
  read `ports.clock.today()` inline, so `today` cannot itself go stale in the cache (R5-4 is
  about the screen, not the cache); and over a walk of dispatch/undo/redo/flush/syncResolutions
  `getDerived()` **never** returns a cache whose `.doc` disagrees with `state.doc`.
- **`DayMap.tsx:56`.** The dependency array carries the cache **object** plus `day.id`, `scope`
  and four bound scalars. Every one of those changes at least as often as `derived.revision`
  did, and `derived` is a fresh object whenever the document or the date moves, so the new key
  is strictly more work than the old one and never less — which is what F2's check demands of a
  replacement.
- **The R2-11 ruling's throw half.** `null`, `undefined` and `''` throw `TypeError` across
  `acceptCandidate` × `rejectCandidate` × {day, stop} and across `copyStopInto`, with the input
  trip **byte-identical** and `revision` unmoved after every throw.
- **The `accepted_by_non_member` injected fault, exactly as ROADMAP §D words it.** Exactly one
  additional issue, `level:'error'`, the right `ref`, both the actor and the owner in `params`,
  `displayStatus()` still `'own'` on the faulted record, and **zero** movement in the reference
  trip's issue count.
- **The three Chromium legs the builder reported, re-run by me rather than believed.**
  `qa/r4-browser.mjs` 4/4 (R4-1's reorder now survives the brand click; `visibilitychange` and
  `pagehide` both land the edit in IndexedDB). `qa/r4-epoch.mjs` 6/6 (the fence is a
  22-character token, `meta` is gone, the recreated database issues a token it has never issued,
  the pre-wipe token is refused, and the screen reads *"Not saved — edited elsewhere"*).
  `qa/r2-copy.mjs` 36 ok / 0 FAIL.
- **The sensitive paths (§5, §6).** Phase 1 still ships no ingest and no location code. The
  `c3c79b3` diff introduces no logging sink, no network call, no `localStorage` and no
  coordinate-bearing string outside test fixtures; the redaction and bundle-scan tests pass
  inside the 318.
- **`cairn-constraints`.** Determinism, zero-dep and no-DOM-in-`packages/client` are unchanged;
  `qa/r2-constraints.mjs` FAILs exactly the two it FAILed in rounds 2–4 (R2-18's grep scope, and
  the `@cairn/core` workspace reference that round 4 already ruled is not a runtime dependency).
- **The read-only boundary.** After a full test run, a web build, seven Chromium sessions and
  eighteen probe runs, `git status` shows only `cairn/qa/r5-*.mjs`, `cairn/qa/README.md` and
  this file. Nothing at the repo root moved.

## What I could not test

- **Two devices, a real server, Safari, iOS, Node 24, a real quota wall.** Unchanged from every
  previous round.
- **Browser-initiated eviction** as R4-2's trigger, rather than `deleteDatabase`. Unchanged.
- **`crypto.getRandomValues` over plain HTTP from a LAN address** — BUILD-NOTES flags this as
  reasoned rather than measured and it still is; `localhost:4173` is a secure context. If the
  claim were wrong the fence fails closed on every write, which is loud rather than silent.
- **R5-1 with a *slow* real IndexedDB** (a large trip, a loaded disk). The window I measured in
  Chromium is a few milliseconds wide; on a phone it is wider, not narrower.

---

# Round 6 — independent verification of `5f92145`

Tester, stage 3. Attacked `master` @ `5f92145`, 2026-08-26. Node v22.22.2, Chromium via the
system Playwright over **real elapsed time**. Scope: verify R5-1, R5-2 and R5-5 on my own
evidence, hunt adjacent regressions, and re-confirm the open findings are where round 5 left
them. Two new probes, both committed: `qa/r6-flush.mjs` and `qa/r6-actor.mjs`.

**Result: 0 BLOCKER · 0 MAJOR · 2 MINOR (both new, both in one code path).**

## The verdicts

### R5-1 — **CONFIRMED FIXED**, with two MINOR loose ends on the abort path (R6-1, R6-2)

I read `flushForTransition` (`packages/client/src/store/store.ts:257`–`:305`) rather than
taking §5's account: the loop recomputes `timerPending`, `cancelTimer()`, `idle`, `skip` and
`dirty()` **at the top of every pass**, and there is no `await` between `await saving` and the
next pass's `dirty()`, so no dispatch can interleave between the check and the decision. The
exit is `dirty()`; `persistence.status` now only ever causes an *early abort*
(`'conflict'`/`'error'`), never a "done". That is the right direction under §2.2b F1 — the
status can only make the loop write more, never less.

Then I attacked it, and every one of these was **run** (`qa/r6-flush.mjs`):

| Attack | Result |
|---|---|
| An edit landing mid-flush, `closeTrip` | both edits in **stored bytes**, store clean, transition completed (§1) |
| An edit landing mid-flush addressing a **different trip** | not constructible: `dispatch` always addresses `state.doc`, and `state.doc` is provably still the *outgoing* trip for the whole flush — asserted, not reasoned (§2). Trip A's record is byte-untouched by trip B's flush. |
| `FLUSH_MAX_ATTEMPTS` exhausted while the user is still typing, **with a real scheduler** (the builder's own bound test uses a dead one) | the transition aborts, the trip stays open, `isDirty()` is `true`, exactly 5 writes — and the two new findings below (§3) |
| Recovery after the bound is spent | one more `closeTrip()` once typing stops completes it and the **last** keystroke reaches storage (§3) |
| A genuine two-tab refusal arriving **during** the retry loop, not before it | aborts on that pass, `status:'conflict'`, edit in memory, `CONFLICT_MESSAGE` on state so `App.tsx` renders the banner (§4) |
| A storage **error** (`failAll`) during the loop | aborts on the first failure — no five-fold retry of a dead disk — `status:'error'`, `lastError` set, and the retry banner recovers it |
| All six transitions propagating `false` | `closeTrip`, `openTrip`, `createTrip`, `adoptTrip`, `importDoc`, `deleteTrip(other)` — all six abort with the edit held and `status:'conflict'`; `deleteTrip(other)` also leaves the other trip undeleted (§5) |
| `deleteTrip(activeId)` firing while another transition's flush is parked | the deleted record is **not** resurrected by the in-flight write (the port refuses a non-null expectation against an absent record), library clean, no dangling active id (§7) |
| Double-click on "Back to all trips" during a parked write, with an edit in the gap | both edits stored, one clean transition, `status:'idle'` |
| `closeTrip` and `openTrip(other)` racing with an edit in the gap | no edit lost; the outgoing trip's bytes carry both edits |

Real Chromium, my own run, after `npm run web:build && node tools/serve.mjs`:

```
delay=0/1/2/4/8ms · edit THREE reached the UI = true · storage ends up holding what the user last saw = true
  ok  the edit dispatched during the transition's flush survives it (5/5 runs exercised the window)
      — 0 of 5 runs lost the reorder with nothing on screen saying so
```

### R5-2 — **CONFIRMED FIXED**, no caveat

I built my own cases (`qa/r6-actor.mjs`), not the builder's. `checkActor`
(`packages/core/src/validate/validateTrip.ts:63`–`:80`) normalises the actor to
`typeof === 'string' && !== ''` and then short-circuits **only** on membership, which is §2.9's
predicate with no fourth conjunct.

- **Ten actor shapes** on a credited, `state:'accepted'` stop: `null`, `undefined`, `''`, `0`,
  `12345`, `true`, `{}`, `['user:marta']`, `' '`, `'user:marta'`. **All ten produce exactly one
  `accepted_by_non_member` error**, `level:'error'`, `ref.kind:'stop'`, `params` entirely
  `string|number` per §2.1, and the message never prints `null`, `undefined` or `[object`.
- **All four ref kinds** the finding named: `Day.provenance` (`:162`), a scheduled stop
  (`:285`), a **pool** stop (same loop — `allStops` is days-then-pool, `:183`–`:185`), and a
  `Booking` (`:394`). One issue each, with the right `ref.kind`.
- **The exemptions §2.14 actually states survive**: `source:'user'`/`actorUserId:null` → 0
  issues; the owner accepting → 0; an unaccepted candidate with no actor → 0.
- **The reference-trip ceiling, re-derived**: `validateTrip(Europe 2026)` = **1 error, 10 warn**
  (matching BUILD-NOTES §4) with **zero** `accepted_by_non_member`, over **180 provenance
  records, 156 accepted, 0 attributed** — I counted the attributed records rather than
  believing the claim. The ceiling is not vacuous: one injected fault on that same document
  produces exactly one extra issue.
- **Non-string actors cannot reach here from a document**: `fromJSON` rejects
  `actorUserId: 12345` with `TripParseError` *"expected a string (at
  $.days[0].provenance.actorUserId)"*, so the non-string cases are hand-built-`Trip`-only.
  Noted, not filed: for those, `params.actorUserId` is `''` and the message reads *"records
  nobody as having accepted it"*, so a **present but non-string** wrong actor loses its value
  in the report. The issue is still raised at the right level and ref, the shape is
  unreachable from any document source, and §2.1 constrains `params` to `string|number`, so
  this is diagnostic fidelity in an unreachable case — an observation, not a defect.

### R5-5 — **CONFIRMED FIXED**

`typeof core.accept === 'undefined'` and `typeof core.reject === 'undefined'` at runtime;
`acceptCandidate`/`rejectCandidate` are still functions and still throw on `null`, `undefined`,
`''` **and** on `0`, `{}`, `true`; no other export matches `/^(accept|reject)$/`. Runtime export
count is **110** (was 112), consistent with §2.10's gap dropping 62 → 60. Nothing outside core
references the primitives — a `grep -rnE "\.(accept|reject)\("` over `packages/client/src`,
`apps/web/src`, `cli.ts`, `test/`, `packages/*/test` and `qa/` returns only
`qa/r5-freshness.mjs:588`/`:602` (the already-documented rotten probe, left alone) and
`apps/web/src/ports/storage.ts`'s `Promise` `reject` callbacks, which are unrelated.
The suite and the typecheck are clean, so nothing was broken that nobody accounted for.

`addStop(StopInit.provenance)` still mints the R5-2 shape in one public call and
`displayStatus` still returns `'own'` for it — **both by design** (§2.14: `displayStatus` is a
pure function of one `Provenance` and "must not learn to" see the trip; the document-level
claim is `validateTrip`'s job). The difference from round 5 is that `validateTrip` now catches
it, which is what R5-2 asked for. Not re-filed.

## MINOR

| id | severity | file:line | defect | repro | routing |
|---|---|---|---|---|---|
| **R6-1** | MINOR | `packages/client/src/store/store.ts:299`, `apps/web/src/App.tsx:85`, `:93` | Exhausting `FLUSH_MAX_ATTEMPTS` returns `false` with `persistence.status === 'idle'`, and `App.tsx` renders a banner only for `'conflict'` and `'error'`. The user clicks "Back to all trips", the transition aborts, and **nothing on screen explains it** — the click simply does nothing. The store's own comment at `:250`–`:255` states the contract this breaks: *"The refusal reaches the screen through the conflict/error banner that is already there"*. It is MINOR and not worse because no data is lost (the edit is held, `isDirty()` is `true`) and `SaveState` does read *"Unsaved changes"*, so the user is not told a falsehood about the save — only about the click. Reachable only by five consecutive keystrokes each landing inside a write; no dispatch-on-render path exists in `apps/web` (every `store.dispatch` is in an `onClick`), so it cannot be reached without real sustained typing. | `node qa/r6-flush.mjs` §3 — *"an aborted transition is visible: status is conflict or error"* FAILs with `status='idle' lastError=null` | **builder** |
| **R6-2** | MINOR | `packages/client/src/store/store.ts:290`, `:299` | The same path calls `cancelTimer()` at the top of the pass that gives up and returns without re-arming, so the store is left **dirty, idle, and with no scheduled autosave**. A user whose last keystroke landed inside the final write holds an edit that no timer will ever write; only another dispatch or another explicit action re-arms one. Verified rather than reasoned: after the abort, **no further write in 200 ms** (ten debounce periods) with the user idle, storage holding `["typing 4","typing 1","typing 2","typing 3"]` while memory held `typing 5`. `beforeunload` still guards a desktop tab close and `pagehide` still calls `flush()`, which is why this is MINOR and not MAJOR. New at `5f92145`: before it, an abort implied `'conflict'`/`'error'`, where a re-armed timer would have been refused anyway. | `node qa/r6-flush.mjs` §3 — *"autosave is still armed after the bound is spent"* FAILs | **builder** |

Both are one code path and plausibly one fix (surface the exhausted bound the way a refusal is
surfaced, and leave the debounce armed when the loop gives up while dirty). Neither is a design
defect: §4.2 rule 6b already says an unsuccessful flush aborts the transition, and the loop does
exactly that — what is missing is the *telling*, which rule 6b also already requires.

## Adjacent regressions — what I looked for and what I found

- **Red-green, done myself.** I copied the tree to a scratch directory (never editing
  `cairn/`), reverted `flushForTransition` to `d97feed`'s single-pass form, restored
  `if (!actor || memberIds.has(actor)) return`, and re-exported `accept`/`reject`. **12 tests
  fail**: 7 in `flush-race.test.ts` (all five transitions, the `autosave:false` control, the
  bound), 2 in `copyStop.test.ts` (the three missing-actor shapes; the ceiling), 3 in
  `surface.test.ts`. My own probes go 3 → 12 FAIL and 5 → 17 FAIL against the same mutation, so
  they are oracles and not confirmations.
- **R3-3 (`mergeWithStored` assigns `saving`) × the drain loop: unaffected, not worsened.**
  Three bare `saving =` assignments remain (`:391`, `:414`, plus the merge branch's inner
  one) — the static probe still FAILs, as round 5 reported. Behaviourally, `flushForTransition`
  is insulated: it `await save()`s the promise it created, so a merge reassigning `saving`
  underneath it cannot make the loop return early. I ran the collision — press "Merge and save"
  while a transition's flush is parked — and the edit survives, storage ends up holding it, and
  the store does not end `'idle'` while dirty (`qa/r6-flush.mjs` §6). The loop does widen the
  *window* in which a merge can be pressed (up to five write latencies instead of one), so
  R3-3 gets more reachable, not more severe.
- **R4-1/R4-2 not passing for the wrong reason.** `qa/r4-switch.mjs` and `qa/r3-undo.mjs` are
  0 FAIL; `dirty.test.ts`'s 200-step byte-oracle walk passes under five seeds (1, 7, 99,
  20260827, 424242), so the loop has not made the walk seed-lucky. `qa/r3-loss.mjs` (real
  timers) is 0 FAIL.
- **The sensitive paths (§5, §6).** The `5f92145` diff introduces no logging sink, no network
  call, no `localStorage`, no coordinate-bearing string. The one new user-facing structure is
  `accepted_by_non_member`'s `params` — `{actorUserId, ownerId, tripId}`, identifiers only, no
  coordinates and no credentials, asserted over all ten actor shapes.
  `qa/r2-constraints.mjs`'s logging-discipline section still reports zero coordinate-shaped
  floats in `Conflict.params`, `Issue.params` and all three goldens.
- **`cairn-constraints`.** Determinism (two processes byte-identical; two CLI runs; `gen-sample`
  stable), zero-dep core, no DOM in `packages/client` — unchanged. `qa/r2-constraints.mjs` FAILs
  exactly the two it has FAILed since round 2 (R2-18's grep scope; the `@cairn/core` workspace
  reference already ruled not a runtime dependency).
- **The read-only boundary.** After the full suite, a web build, a Chromium session, a mutation
  run in scratch and ~20 probe runs, `git status` shows only `cairn/docs/QA-FINDINGS.md`,
  `cairn/qa/README.md` and the two new `cairn/qa/r6-*.mjs`. Nothing at the repo root moved, and
  no product file changed.

## Re-confirmed unchanged (existing probes, not fresh investigations)

| Finding | Probe | This round |
|---|---|---|
| R3-3 | `qa/r3-merge.mjs`, `qa/r3-cas.mjs` | 2 FAIL / 1 FAIL — open, unchanged |
| R3-6, R3-7, R3-8 | `qa/r3-pool.mjs` | 3 FAIL — open, unchanged |
| R3-9 and §5–§7 | `qa/r3-cas2.mjs` | 3 FAIL — open, unchanged |
| R2-6 | `qa/r2-access.mjs` | 1 FAIL (malformed `expiresAt` fails open) — open |
| R2-7 | `qa/r2-resolutions.mjs` | 1 FAIL — open |
| R2-9 | `qa/r2-data.mjs` | 1 FAIL — open |
| R2-18 | `qa/r2-constraints.mjs` | 1 FAIL (+ the zero-dep workspace line) — open |
| R2-4 | `qa/r2-redact.mjs` | 7 hits, same shapes as round 2 — open |
| R5-3 | `qa/r5-freshness.mjs` §2.4 | 2 FAIL — open, and the drain loop does not change it |
| R5-4 | `grep` for timers in `apps/web/src` | still zero — open |
| R3-1, R3-2, R3-4 | `qa/r3-undo.mjs`, `qa/r3-loss.mjs` | 0 FAIL — closed |
| R4-1 | `qa/r4-switch.mjs` | 0 FAIL — closed |
| R2-11 | `qa/r2-copy.mjs` | 0 FAIL — closed |

## What I attacked and could not break

Every line here was run, not skimmed.

- The loop's bound cannot be reached by anything but sustained human typing: there is no
  `store.dispatch` outside an `onClick` in `apps/web/src`, and no subscriber dispatches on
  `emit()`, so a render loop cannot hold a transition open.
- The loop cannot write to the wrong record: `save()` inside it passes `forTripId: null` and
  `attemptSave` reads `state.doc`, which §2's probe shows is still the outgoing trip for the
  whole flush.
- A parked write cannot resurrect a trip deleted under it (port refuses a non-null expectation
  against an absent record — checked in `memory.ts` and behaviourally in §7).
- Concurrency shapes that did **not** lose an edit: double-click on the brand button;
  `closeTrip` racing `openTrip(other)`; `deleteTrip(active)` racing a parked `closeTrip` flush;
  `mergeWithStored` racing a transition flush.
- `acceptCandidate`'s `requireActor` refuses `0`, `{}` and `true` as well as the three named
  shapes, so a non-string actor cannot be minted through the checked wrapper either.

## What I could not test

- **A slow real IndexedDB on a phone.** Unchanged from round 5: the mid-flush window I measure
  in desktop Chromium is a few milliseconds; on a device it is wider, which makes R6-1/R6-2
  slightly more reachable there, not less.
- **The bound exhausted in a real browser.** `qa/r6-flush.mjs` §3 drives it deterministically
  in Node by dispatching from inside the port. Landing five keystrokes inside five consecutive
  real IndexedDB writes through the UI is not something I could stage reliably.
- **Two devices, a real server, Safari, iOS, a real quota wall.** Unchanged from every previous
  round.

---

# Round 7 — `master` @ `32a3839`, 2026-08-26

Tester, independent verification of the **R3-3** fix (`chainOntoSaving`). Node v22.22.2, and
real Chromium over CDP with real elapsed time. Scope as routed: confirm or overturn R3-3 on my
own evidence, hunt regressions the builder's two new tests would not catch, re-check every
previously-open finding, and answer the Phase 1 gate question for the write/persistence path.

**Result: 0 new BLOCKER · 0 new MAJOR · 3 new MINOR, all three pre-existing at `584c218` and
none reachable through the shipped UI.**

## R3-3 — CLOSED, on my own evidence

The builder's claim is that `chainOntoSaving(work)` is now the only place `saving` is assigned
and all three write paths route through it. **Verified, independently:**

- `store.ts:185` is the only `saving = ` in statement position in the file (round 6 counted
  three). `chainOntoSaving` has exactly three call sites — `save()` at `:160`, the deleted-trip
  branch at `:409`, the merge branch at `:436`. `qa/r7-chain.mjs` static §.
- **Structurally, no write path can opt out.** `ports.storage.saveIfVersion` has exactly **one**
  call site in the whole store (`:225`, inside `writeAndSettle`), and `writeAndSettle` has
  exactly **three**, all inside a `chainOntoSaving` work function. So the invariant is not
  "three places remembered to chain", it is "there is one door". `qa/r7-chain.mjs` §11.

I wrote my own probe rather than re-run the builder's. `qa/r7-chain.mjs` is an **oracle, not a
confirmation**: against `584c218` (the parent commit, in a scratch worktree, never in `cairn/`)
it reports **10 FAIL**; at `32a3839` it reports **3**, and all three of those also FAIL at
`584c218` — i.e. every one of the seven that flipped is attributable to this commit, and
nothing regressed.

What I attacked, and what it showed:

| | |
|---|---|
| **§1 three-way pile-up** — a debounced autosave, an explicit `flush()` and `mergeWithStored()` all issued from **one** store inside one latch, with a fourth edit dispatched mid-pile-up. Concurrency measured at the port (max simultaneous callers), not from the status enum. | **max in flight 1** (was **2**). All four edits end in storage — `d1=MINE-B d2=OTHER-D2 d3=MINE-C` — `status=idle`, chip `"Saved"`, `isDirty()=false`. Nothing dropped, nothing reordered into a lost write. |
| **§2 a genuine third writer** lands in the window while the merge sits in the now-serialized queue. This is the case serializing could plausibly have swallowed. | **Still surfaced.** The third tab's work is not clobbered (`d2=OTHER-2`), the merge's write is refused against `stored.version`, `status='conflict'`, the in-memory edit is still held, and the chip reads `"Not saved — edited elsewhere"` — correctly this time, because the document really is unwritten. |
| **§3 the `.catch(() => {})` claim** — "swallows the PREVIOUS link's rejection only". Constructed a genuinely rejecting link by throwing from a subscriber on `attemptSave`'s pre-`try` `set({status:'saving'})`, which is the one statement on the write path outside a `try`. | **Behaves exactly as documented.** Of three queued `flush()`es, `p2` rejects **with its own error** (`rejected: BOOM from a subscriber`), `p1` and `p3` fulfil, the fourth link still ran at the port, the edit reached storage, and a later save still works. The queue is not poisoned and the failure is not swallowed twice. |
| **§4 a rejection from the merge branch's own work.** | The caller is told (`mergeWithStored()` rejects), nothing claims "Saved" over an unmerged document, and the chain still accepts writes afterwards. |
| **§5 R5-1's drain loop × the chain** (`flushForTransition`'s `await save(); await saving;`) with an edit landing mid-flush. | **R5-1 stays closed.** `EDIT-2` reaches storage before the trip is abandoned, and max in flight is **1** for the whole transition. |
| **§7 / §8 the two paths the builder's tests do cover, attacked differently** — the merge button pressed twice, and the deleted-trip branch queued behind a parked write. | max in flight **1** on both (was **2**). §8 additionally flipped from `status=conflict, dirty=false` (the deleted-trip branch's own R3-3 indicator lie) to `status=idle`, `restored d1=MINE-2` — a closure the builder's report did not claim. |
| **Real Chromium, end to end** (`qa/r7-browser.mjs` §1) — two tabs on the real Europe fixture, tab B refused, one more keystroke to arm its 400 ms autosave, then "Merge and save" pressed 120 ms in. | Both edits in IndexedDB (`A EDIT=true`, `B EDIT AGAIN=true`) and the chip reads **`"Saved"`**. R3-3's filed symptom — `"Not saved — edited elsewhere"` with `isDirty()===false` over a fully saved document — does not occur through the shipped UI. |

**Verdict: R3-3 is closed.** Both halves — the concurrency invariant and the indicator lie —
are fixed, on evidence I generated, in Node and in a real browser.

## Regressions hunted, and what serializing actually changed

- **Latency (`qa/r7-chain.mjs` §6).** With a port where every write takes 40 ms,
  `mergeWithStored()` takes **40 ms alone and 79 ms queued behind one write** — serialization is
  real and roughly doubles the worst case. There is **no spinner gap**: the statuses emitted
  across the whole wait are `saving → conflict → idle`, so `SaveState` shows `"Saving…"` for the
  duration. Nothing times out anywhere in the write path, so nothing can time out *because of*
  this.
- **A new coupling, recorded not filed (§9).** Before `32a3839`, a stalled write could not hold
  up the merge button; it queues now, so it can. With the port parked indefinitely, the merge
  does not resolve, the chip reads `"Saving…"`, and the in-memory edit is still held — it
  degrades honestly and loses nothing. Worth knowing that `FLUSH_MAX_ATTEMPTS` bounds
  `flushForTransition` but **nothing bounds the chain**. Not a defect: the alternative is
  writing past a pending write, which is the bug that was just fixed.
- **`flushForTransition`'s `await save(); await saving;` is still correct** under the chain —
  `saving` may have grown a later link by then, so the flush waits for *more*, never less (§5).

## New findings — all MINOR, all pre-existing at `584c218`, none a regression

| id | sev | file:line | defect | repro | routing |
|---|---|---|---|---|---|
| **R7-1** | MINOR | `apps/web/src/App.tsx:96`, `packages/client/src/store/store.ts:398` | `mergeWithStored()` re-entered before the first call settles loads `stored` twice at the same version, so the second write is refused against a now-stale expectation and leaves `status='conflict'` — chip `"Not saved — edited elsewhere"` with `isDirty()===false` over a document that merged correctly. R3-3's symptom class reached by a second trigger the fix does not cover, and *deterministic* now rather than racy. **Not reachable through the shipped UI:** `qa/r7-browser.mjs` §2 sweeps the gap between two real clicks at 0/30/80/150 ms and the second press never lands at any of them — the banner unmounts as soon as `set({status:'saving'})` emits. Store-API-level only. | `node qa/r7-chain.mjs` §7; `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r7-browser.mjs` §2 (the reachability bound) | **builder** — one in-flight guard on the button, or an early return in `mergeWithStored` while a merge is already queued. Implementation defect. |
| **R7-2** | MINOR | `packages/client/src/store/store.ts:101` (`emit`), `:124` (`void save(forTripId)`) | `emit()` calls listeners with no error isolation, and `attemptSave`'s opening `set({status:'saving'})` is the one statement on the write path outside a `try`. A subscriber that throws therefore rejects the chained link, and on the **debounce** path that link is launched as `void save(...)` — an **unhandled promise rejection** (observed: `unhandledRejection: BOOM in a subscriber`). A throwing subscriber also stops every later subscriber being notified. Low reachability: `apps/web` has exactly one subscriber (`apps/web/src/store.ts:26`, `useSyncExternalStore`'s callback). | `node qa/r7-chain.mjs` §3b | **builder** — `try/catch` per listener in `emit`, or `.catch` on the `void save()`. Implementation defect. |
| **R7-3** | MINOR | `packages/client/src/store/store.ts:618` | `deleteTrip` calls `ports.storage.delete(id)` directly — the one storage mutation not on the chain — and for the *active* trip §4.2 rule 6c deliberately does not flush, only `cancelTimer()`, which cannot recall a write already issued. A queued **expect-absent** write (the merge's deleted-trip branch, expectation `null`) therefore lands *after* the delete and `writeAndSettle`'s `upsertSummary` puts the row back in the library: the trip is resurrected in storage and in the library, and the delete is silently undone. **Not reachable through the shipped UI:** the only Delete button is `apps/web/src/views/Library.tsx:101`, which renders only when `state.doc === null`, and a conflicted trip cannot be closed to get there (R5-3). Store-API-level only. | `node qa/r7-chain.mjs` §10 | **builder** — `await saving` before `ports.storage.delete`. Implementation defect; rule 6c's exception is about not *writing*, not about not *waiting*. |

None of the three is a regression: all three FAIL identically at `584c218`.

## R6-1 / R6-2 — re-verified properly, and still MINOR

Round 6 filed both from `qa/r6-flush.mjs` §3 and no instance of me had re-derived them since.
`qa/r7-r6recheck.mjs` drives the bound-exhausted abort independently (a port that dispatches a
keystroke on every completed write, a real scheduler, `debounceMs: 20`) and then asks the one
question that decides severity: **is any edit lost, on any exit the app actually has?**

Both reproduce, exactly as filed: the drain stops at `FLUSH_MAX_ATTEMPTS` (5 writes), the
transition aborts with `status='idle'` so `App.tsx` renders no banner (**R6-1**), and no
autosave fires in the following 200 ms — ten debounce periods with the user idle (**R6-2**),
leaving memory at `"typing 5"` and storage at `"typing 4"`.

**Three independent backstops, each run, each clean — `qa/r7-r6recheck.mjs`, 0 FAIL:**

1. **The next keystroke re-arms.** One more dispatch and the edit lands: `stored="AFTER THE
   ABORT"`, `isDirty()=false`.
2. **`registerPageExit` flushes it.** Both legs — `visibilitychange`→`hidden` and `pagehide` —
   drive the disarmed edit to storage: `mem="typing 5"` → `stored="typing 5"`, `dirty=false`.
3. **`beforeunload` still prompts.** `preventDefault()` is called while the aborted-transition
   edit is unwritten, so the browser's own "Leave site?" dialog stands between the user and the
   loss.

And the indicator does not lie while any of that is pending: the `SaveState` chip reads
**`"Unsaved changes"`**, not `"Saved"`, and `isDirty()` is `true`. **R6-1 and R6-2 are confirmed
MINOR on my own evidence — cosmetic and recovery-affordance defects, no data-loss path.** Both
remain open and correctly routed to the **builder**.

## Every other previously-open finding, re-run this round

`32a3839`'s diff is three files — `store.ts`, `merge-race.test.ts`, `BUILD-NOTES.md` — so
nothing in `packages/core` can have moved; that is checked with `git show --stat`, not assumed.
Every number below is from my own run at `32a3839`.

| finding | probe | result |
|---|---|---|
| **R3-3** | `qa/r3-merge.mjs`, `qa/r3-cas.mjs` A, `qa/r7-chain.mjs`, `qa/r7-browser.mjs` | **0 FAIL / 0 FAIL / oracle 10→3 / 0 FAIL — CLOSED** |
| R6-1, R6-2 | `qa/r6-flush.mjs` §3, `qa/r7-r6recheck.mjs` | 2 FAIL / 0 FAIL — open, **confirmed MINOR** |
| R3-6, R3-7, R3-8 | `qa/r3-pool.mjs` | 3 FAIL — open, unchanged |
| R3-9 and §5–§7 | `qa/r3-cas2.mjs` | 3 FAIL — open, unchanged |
| R2-6 | `qa/r2-access.mjs` | 1 FAIL — open, unchanged |
| R2-7 | `qa/r2-resolutions.mjs` | 1 FAIL — open, unchanged |
| R2-9 | `qa/r2-data.mjs` | 1 FAIL — open, unchanged |
| R2-18 | `qa/r2-constraints.mjs` | 2 FAIL (R2-18 + the zero-dep line, see probe rot) — open, unchanged |
| R2-4 | `qa/r2-redact.mjs` | 7 hits — the same `DE4345` / `Booking 338 441 5948` / `OPTIONAL` / `BOOKINGS` doc-comment leak into `.js.map` — open, unchanged |
| R5-2 residual, R5-3 | `qa/r5-freshness.mjs` §1–§5 | 4 FAIL — identical count at `584c218`, unchanged |
| R5-4 | `grep` for timers in `apps/web/src` | still zero — open |
| R5-5, R5-2 | `qa/r6-actor.mjs` | 5 FAIL — identical count at `584c218`, unchanged |
| R3-1, R3-2, R3-4 | `qa/r3-undo.mjs`, `qa/r3-loss.mjs` | 0 FAIL — closed |
| R4-1 | `qa/r4-switch.mjs` | 0 FAIL — closed |
| R2-11 | `qa/r2-copy.mjs` | 0 FAIL — closed |

**Round-7 numbers, my own runs, not taken from the commit message:** `npm test` **333 pass /
0 fail** (counted with `--test-reporter=tap`, not the dot reporter), `npm run typecheck` clean
on **both** projects from the documented order, `npm run web:build` clean. The commit's and
BUILD-NOTES' reported numbers are **accurate**.

**The Phase-2 deferral claim, checked against ROADMAP rather than accepted.** ROADMAP's Phase 1
deliverables list reads `access/  predicates.ts  (defined now, enforced in Phase 2 — §6.2)`,
and its narrative repeats that the `core/access` predicates "ship in this phase even though
nothing enforces them". **R2-6 is genuinely Phase-2-scoped by ROADMAP's own text**, not by
convenience. R2-11's `displayStatus` half — the one that *is* in a Phase 1 criterion — is
closed (`qa/r2-copy.mjs`, 0 FAIL).

## Probe rot found this round — documented, not patched

Same ruling as rounds 5 and 6: repairing a probe inside a QA commit hides what changed.

- **`qa/r6-flush.mjs` §6 now false-positives.** Its static check is
  `/^\s*saving = (?!saving)/gm`, which matches `chainOntoSaving`'s own `saving = run;` and
  reports "1 bare assignments — R3-3 is still open". It is not. `qa/r3-merge.mjs`'s check
  (`/^\s*saving = \(async/`) is the correct one and passes. One of `r6-flush.mjs`'s three FAILs
  is therefore stale; the real count for R6-1/R6-2 is **2**.
- **`qa/r2-constraints.mjs`'s zero-dep check counts `@cairn/core`.** `packages/client`'s only
  dependency is the workspace-internal `{"@cairn/core": "*"}`, which is what the layering
  requires; the root workspace declares **no** runtime dependencies at all, only `@types/node`
  and `typescript` as dev. `cairn-constraints` §2 is met. One of that probe's two FAILs is
  therefore not a defect; R2-18 is the real one.
- `qa/r5-freshness.mjs:602`, `qa/r2-copy2.mjs:86`, `qa/r2-import.mjs:51` — rotten since rounds
  5 and 2 respectively, unchanged, still not patched.

## What I attacked and could not break

Every line was run.

- **No write path can reach storage off the chain.** Enumerated structurally (§11) and attacked
  behaviourally (§1, §5, §7, §8): one `saveIfVersion` call site, three `writeAndSettle` call
  sites, all three inside `chainOntoSaving`. Max in flight is 1 in every shape I could build.
- **Serializing did not swallow a refusal** (§2) and did not swallow a rejection (§3, §4).
- **A failed link cannot poison the queue** — proved with a link that genuinely rejects, not by
  reading the comment.
- **A stalled chain loses nothing** (§9) — the edit is held, the chip says `"Saving…"`.
- **R5-1 still closed under the chain** (§5), and R3-1/R3-2/R3-4/R4-1/R2-11 all re-run at 0 FAIL.
- Shapes that did not produce a lost or wrong write: three-way pile-up from one store; an edit
  dispatched *during* the pile-up; a third tab writing mid-queue; the deleted-trip branch behind
  a parked write; a merge behind a stalled write; two "Merge and save" presses.

## What I could not test

- **Two devices, a real server, Safari, iOS, a real quota wall.** Unchanged from every round.
- **The bound exhausted through a real browser UI.** Unchanged from round 6 — five keystrokes
  landing inside five consecutive real IndexedDB writes is not stageable reliably.
- **R7-2 through a real React error.** I forced a throwing subscriber directly; whether React's
  `useSyncExternalStore` callback can be made to throw in production is not something I could
  establish, which is why R7-2 is MINOR and its reachability is stated as unestablished rather
  than assumed.

## Phase 1 gate — the write/persistence path

**There is no open BLOCKER and no open MAJOR anywhere in the write/persistence path.** R3-3 was
the last one and it is closed on independent evidence, in Node and in Chromium. Everything still
open against `store.ts` / persistence is MINOR (R6-1, R6-2, R5-3, R5-4, R7-1, R7-2, R7-3), and
of those, R7-1 and R7-3 are not reachable through the shipped UI at all, while R6-1/R6-2 have
three verified backstops between them and any data loss. Everything open in `packages/core`'s
access layer (R2-6) is Phase-2-scoped by ROADMAP's own deliverables list, verified against that
text this round.

That is a sixth consecutive adversarial pass on the persistence spine with the previous round's
finding closed and no new BLOCKER or MAJOR raised. **My recommendation is that this goes to the
manager for the Phase 1 gate review.** The decision is the manager's and the routing is
Jacob's; this is a tester's recommendation and nothing more.
