# Cairn — build notes, Phase 1 (and Phase 2 in progress)

> **Addendum, on `09717ab` — ARCHITECTURE revision 16's **A-21a**: the one block Part 4 printed as
> *"verbatim"* is not exempt from Part 4's rule.**
> This is the fix for the objection at the foot of the A-21 addendum below, upheld by the architect
> and printed by him. Scope was A-21a and nothing else: **one source file, one test file**. No new
> export (71), no `schemaVersion` bump, no new `REDACTION_PATTERN`, nothing under `qa/`, nothing in
> `packages/client` or `apps/web`, nothing at the repo root, and no edit to `ARCHITECTURE.md`,
> `ROADMAP.md` or the visual roadmap.
>
> | | |
> |---|---|
> | **The change — three lines, inside `copyStopInto`'s `if (original)` block** | `original.cityKey` and `original.at` are hoisted into `originalCityKey` and `at`, read **once**, ahead of `refileCityKey`; A-14's step-3 branch then reads the local instead of re-reading the field for the `=== null` test, `.lat` and `.lng` (3 reads → **1**). `original.name` is hoisted **only inside the reuse/new-row branch**, per the ruling: step 3 never uses it, and a hoist above `refileCityKey` would let a *throwing* getter on `name` propagate on a path that never reads it today. Body copied verbatim from A-21a, comments included — they are the ruling's reasoning for the next reader. `refileCityKey`, `samePlace` and `placeForCopy` are untouched in signature, body and docstring; A-14's step-3 comment and A-15's probe comment are preserved. |
> | **Red first, on the two fixtures the ruling prints** | One new test in `copyStop.test.ts` (`A-21a: on A-14 step 3, 'original.at' is read ONCE`), using A-21's existing `flipping`/`withAccessor` helpers and A-14 assertion 3's own step-3 fixture (source city Split, target city Prague, so the target cannot re-file). Against the shipped body it failed with `Actual message: "Cannot read properties of null (reading 'lat')" / operator: 'doesNotThrow'` — the ruling's own measurement, re-derived here rather than taken. After the fix: no throw, `reads() === 1`, and the copied link is `{kind:'inline', at:{lat:1,lng:2}}` on **both** fixtures — including `[{lat:1,lng:2},{lat:3,lng:4}]`, where the pre-fix body crossed `{lat:3,lng:4}`, a coordinate no `null` test ever saw. |
> | **The existing `at.reads() === 2` assertion is unmoved** | Not one assertion in the file was edited. Only the two **comments** around it are re-expressed, per A-21a assertion 2: they used to say *"A-21 leaves that block verbatim"*, which is no longer why the count is 2. They now point at A-21a's read-count table — one read is A-14's `refiled` probe, one is `placeForCopy`'s, never two inside one function, and **2 is the ceiling A-21a refuses to drive to 1**, because closing it would classify half of `Place`'s fields at the call site and break A-15's single classification point. |
> | **The seventh mutation, verified** | Restoring `original.at` in the step-3 branch (`original.at === null ? … : {lat: original.at.lat, …}`), applied in a throwaway copy of the tree at this commit: **80 pass / 0 fail** unmutated, **79 pass / 1 fail** mutated, and the one red test is the new one. No mutation survives. (The throwaway tree must include the repo-root planner HTML: without it, `fixtures/loadEurope2026.mjs` cannot load and two unrelated reference-trip ceiling tests fail for the wrong reason.) |
> | **What is deliberately NOT fixed** | `placeForCopy(original, …)` still re-reads `name` and `at` on the reuse-**miss** path, so that path is `at` ×2, `name` ×2. A-21a rules this an exception with a bound rather than a defect, and names the trigger to revisit it (the day something other than a person's own hand builds a `Trip` in memory). It is a hole — a duplicate `Place` row when the dedupe was computed on a coordinate the row does not carry — never a leak, never a throw. Left exactly as it is. |
> | **Numbers, my own runs on this pass** | `npm run typecheck` clean (both projects). `npm run test:tap` **608 pass / 0 fail** — 607 before, **+1**, the new test. `copyStop.test.ts` **80/80** (79 before) and `openingHours.test.ts` **11/11**, no existing assertion edited. `Object.keys(core).length` **71**. Reference trip **2 blockers / 4 warnings / 11 notes** at `FIXTURE_TODAY` (`2026-08-01`) and `validateTrip` **11** issues. `npm run golden` and `npm run sample` regenerate **byte-identically** (sample sha unmoved at `40955ca0b182`); `git status` clean apart from my two source/test files and this document. Comments stripped, `copyStop.ts` still contains **no `as string`** and **exactly one `{ ...x }` record spread** (`{ ...target }`). |
> | **One divergence from the ruling's stated numbers, reported not reconciled** | A-21a says `copyStop.test.ts` is *"79/79"* after the fix **and** that the builder adds assertion 1 as a new test. Both cannot hold: the file was **79** before this pass (measured), so adding assertion 1 as a test makes it **80**. I did not fold the new assertions into an existing test to hit 79 — the two step-3 fixtures need their own `withAccessor` counter, and the one test that already asserts on `Place.at` is the reuse/new-row path A-21a explicitly refuses to change. Reported here for QA rather than resolved by picking a number. |
> | **Objection to the design** | None. A-21a upholds the objection this builder filed against A-21 and prints the body; I implemented it as written, including the comments. |

> **Addendum, on `413a6d6` — ARCHITECTURE revision 16's **A-21** built in Parts 1, 3, 4 and 4(c)
> (Part 2 is "no changes" and Part 6 is "what this does not close"), plus QA round 17's
> **R17-2**, **R17-3** and **R17-4**; QA **R17-1**…**R17-4** all addressed.**
> Scope was A-21 and the three builder-routed round-17 findings and nothing else: **three source
> files, three test files**. No new source module, no `schemaVersion` bump, **no new export (71)**,
> no new `REDACTION_PATTERN` and no new `redactText` call site, nothing under `qa/`, nothing in
> `packages/client` or `apps/web`, nothing at the repo root, and no edit to `ARCHITECTURE.md`,
> `ROADMAP.md` or the visual roadmap.
>
> | | |
> |---|---|
> | **Part 1 — the predicate returns the entry** | `model/openingHours.ts`: `isWeeklyEntry` is **deleted** and replaced by `readWeeklyEntry(v): WeeklyRead`, the three-way union `{kind:'absent'}` / `{kind:'entry', entry}` / `{kind:'malformed'}`, reading `day`/`open`/`close` **once each** in A-20's own short-circuit order. `isClockTime` becomes a type predicate (`v is ClockTime`), which is what lets the entry be built with **no cast at all** — `w as {day: number; open: string; close: string}` is gone from this system rather than moved. `isOpeningHours` stays a `boolean` (its only consumer *reports* on the value) and reads `weekly`/`note` once each. Bodies are the ruling's, copied verbatim. Module stays **off `index.ts`**; `WeeklyEntry`/`WeeklyRead` are types and cost nothing there. |
> | **Part 2 — `fromJSON`: nothing changed, deliberately** | Not one line. The ~40 `...(o.x !== undefined ? {x: str(o.x, path)} : {})` sites are the **safe** double read (read 1 decides presence; read 2 is validated and *is* the value used) and the ruling blesses them explicitly so a later reader does not "finish the job" across forty call sites. |
> | **Part 3 — `toJSON`'s `hours()`** | `weekly` read into a local before `Array.isArray` and `.map`, so an export cannot throw `o.weekly.map is not a function`. The rest of `toJSON` is out of scope and the docstring now says why in the file: `toJSON` writes the user's own document back to the user, so an unstable getter elsewhere costs that caller their own data and crosses no boundary. `place()`'s `p.at ? {lat: p.at.lat, …} : null` is knowingly left, with A-20's own reopening trigger named beside it. |
> | **Part 4 — `copyStop.ts`, file-wide** | `weeklyForCopy` (now `WeeklyEntry \| null`, built from the reader's three scalars), `hoursForCopy`, `costForCopy`, `arrivalForCopy` and `placeForCopy` each read every field of a caller-supplied value **once into a local** before using it. Imports move as the ruling says: `WeeklyEntry`/`readWeeklyEntry` in place of `isWeeklyEntry`; `Money` and `LatLng` join the `types.ts` type import; `ClockTime` leaves the `ids.ts` type import. `arrivalForCopy`'s `label` and `costForCopy`'s `note` were already the *safe* form and are hoisted anyway — the rule for this file is only checkable if it is **total**. And the ten `src.*` fields (`name`, `category`, `note`, `cost`, `arrival`, `travelRole`, `flags`, `links`, `durationMins`, `provenance.confidence`) are read into `const`s ahead of the `StopInit` literal; `cost`, `arrival` and `links` were genuinely double-read (a truthiness test, then the value passed on). **No new defensive guard was added** — `src.links` as a truthy non-array still throws on `.map`, exactly as before. |
> | **Part 4 — the place block, where the alias was** | `src.place` is read **once** into `srcPlace`; the `as {placeId: string}` cast is **removed** (narrowing a `const` of a discriminated union needs none); and the ternary's missing `else` is now an explicit default of `{kind:'none'}`. That fallthrough — `place = src.place` — needed no getter at all: a cast-built link with an out-of-union `kind` put the **source's own object, with every key it carried**, into the target document. |
> | **Part 4(c) — the placement argument** | The two A-19 validation throws and the rebuilt `placed` merge into one branch on the discriminant, so `cityKey` is read once and the throw and the emission see the same value. Hint fields are read once into an object core owns, and everything downstream reads *that*. **A-19's throws, messages, `TRANSIT_CITY_KEY` exemption and dropped-hint fallback are byte-for-byte unchanged**, and its comment block is preserved. `placement.kind` is read once per branch rather than hoisted, because hoisting a discriminant loses TypeScript's narrowing and would put back the casts A-21 removes. |
> | **R17-2 (MINOR) — `toJSON`'s `hours` rebuild had nothing pinning it** | New test in `copyStop.test.ts` beside the existing R15-2 cast fixture: a cast-built place whose weekly entry carries `secret` and whose `hours` carries `extraKey`, asserting the **exported** key sets (`['close','day','open']` and `['note','weekly']`), that the rebuild is not a wipe (`note` survives), that four credential needles are absent from the export, and — the second property, which is only observable this way since `toJSON` stringifies immediately — that mutating the source entry after an export does not move the earlier export string. **Mutation-verified**: reverting to `hours: p.hours` turns exactly this test red (0 red before). |
> | **R17-3 (MINOR, pre-existing) — `clockOrNull`'s refusal had no test** | Two new tests in `serialize.test.ts`. The first asserts the refusal at its own JSON path over four documents — `placement.time` as `'PIN 0754'`, `'9:0'` and `'17:00 '`, plus a `Booking.startsAt.time`, because `clockOrNull` guards three fields and the two `Booking` ones carried the same hole. The second asserts the refusal is **not a wipe** (`''`, `'9:05'` and `null` all still parse) and measures the sentence the finding rests on: `validateTrip` reports nothing about `placement.time`, so the parser is the only guard. **Mutation-verified**: deleting the line turns the first test red (0 red before), and leaves the second green, which is the point. |
> | **R17-4 (MINOR, doc-only) — a comment that claimed a live route that does not exist** | `openingHours.test.ts`'s *"`store.importDoc` and `cli` both pass one"* is false and is replaced by the measured list: `store.importDoc` → `core.fromJSON(text)`, `store.ts`'s three internal calls → `stored.doc` where `TripDoc = string`, `cli.ts:37` → `readFileSync(…, 'utf8')`, `apps/web/src/sample.ts` → `JSON.stringify(raw)`, `tools/gen-sample.mjs` → `toJSON(…)`. **Every shipped caller passes text.** The corrected comment states the arm is an in-process entry point with no shipped caller and says why the distinction is load-bearing (it is what every reachability argument in this project turns on, R17-1's severity included). |
> | **The injected fault, and why the flipping values alone were not enough** | `flipping<T>` is the ruling's four-line helper, in both test files that need it. But a first pass using flipping values *only* left three of the ruling's own mutations alive at 0 red: the values are calibrated to the read count of the **pre-A-21** body, so a mutation that re-reads once more still lands on a benign value. The fixtures therefore also assert the **read count** — `open` 1, `close` 1, `cost.display` 1, `cost.amounts` 1, `hours.weekly` 1, `src.place` 1, `placement.cityKey` 1, `Place.at` **2**. That is A-21's rule stated literally, and it is what kills a re-read regardless of where the flip lands. |
> | **`Place.at` is 2, not 1 — a disclosed residue of the ruling, not a defect I introduced** | `copyStopInto`'s A-14 block reads `original.at` once to build the `refiled` probe `samePlace` compares against, and `placeForCopy` reads it once. A-21 prints that block as *"verbatim"*, so I did not touch it — see the objection below. |
> | **Mutation-verified: 11 mutations, every one turns ≥1 test red, none survives** | Applied one at a time to the shipped source, run, restored, and the restore verified byte-identical by `cmp` each time. The ruling's own six: re-read `e.open` in `weeklyForCopy` (1 red), re-read `c.display` in `costForCopy` (1), re-read `o.weekly` in `isOpeningHours` (1), re-read `o.weekly` in `hoursForCopy` (1), re-read `p.at` in `placeForCopy` (1), restore `place = src.place` as the fallthrough (1). Plus five of mine: re-read `placement.cityKey` in Part 4(c) (1), re-read `o.weekly` in `toJSON`'s `hours()` (1), revert `toJSON`'s `hours` rebuild — R17-2 (1), delete `clockOrNull`'s refusal — R17-3 (1), drop `Number.isFinite` from `readWeeklyEntry` (3, which is the accept set being pinned rather than assumed). |
> | **A-20's contract sentence, re-derived rather than assumed** | The entry table is re-expressed 1:1 with `readWeeklyEntry(v).kind !== 'malformed'` ⟺ the old `isWeeklyEntry(v)` and `null`/`undefined` ⟺ `kind === 'absent'`; **no row's verdict moved**, and the same table still runs through `fromJSON`'s object arm with the exact JSON path per row. A new assertion pins that `readWeeklyEntry` returns three named fields and never the caller's object — an extra `note: 'PIN 0754'` on a valid entry does not come back out of the reader. |
> | **Numbers, my own runs on this pass** | `npm run typecheck` clean (both projects). `npm run test:tap` **607 pass / 0 fail** (593 before; **+14** — 3 in `openingHours.test.ts`, 9 in `copyStop.test.ts`, 2 in `serialize.test.ts`). `npm run web:build` clean. `Object.keys(core).length` **71**, with `readWeeklyEntry` off `index.ts`. Reference trip **2 blockers / 4 warnings / 11 notes** at `FIXTURE_TODAY` and `validateTrip` **11** issues. `npm run golden` and `npm run sample` regenerate **byte-identically**, sample sha unmoved at `40955ca0b182`, `git status` clean apart from my six files. Comments stripped, `copyStop.ts` contains **no `as string`**, **exactly one `{ ...x }` record spread** (`{ ...target }`, the recipient's own document) and **no `as { placeId` cast**. The clock regex still appears exactly once in `packages/core/src`, at `model/openingHours.ts` (asserted by a source-grep test). |
> | **The `qa/` probes, run and reported rather than edited (A-19 assertion 7)** | **`qa/r14-horizon-copy.mjs` ALL OK. `qa/r15-place-copy.mjs` ALL OK. `qa/r2-copy.mjs` 0 FAIL. `qa/prov.mjs` 0 FAIL.** **`qa/r17-hours-parser.mjs`: 3 FAIL, down from 4** — §3.2's **first** assertion (the leak) is now **green**, *"0 of 7 flip points leak"*, which is the ruling's own test of whether Part 4 is implemented. The three that remain are §3.2's second (`warned \|\| restores`, **withdrawn as over-strong by Part 6** and not satisfiable by any implementation that does not re-read; I did not touch `toJSON` or `place_hours_malformed` to make it pass), §5.1's R17-2 line and §5.2's R17-3 line — both of the last two are literal statements *about the shipped suite* (§5.2 is `ok(…, false, …)`), which no product or test change can turn green; I closed both gaps and mutation-verified each, so QA re-expresses them in round 18. **`qa/r16-copy-depth.mjs`: 2 FAIL, up from 0** — §1.4's source-grep (`/isWeeklyEntry\(w\)/` and `/redacted\(e\.open\) !== e\.open/`), predicted by the ruling, whose equivalents are now `/readWeeklyEntry\(w\)/` and `/redacted\(open\) !== open/` and whose *subject* is unchanged and still true; and §3.5, **not predicted by the ruling** — see the row below. |
> | **§3.5 of `r16-copy-depth.mjs` — a behaviour change A-21 causes that the ruling does not name** | The probe recorded, as *"confirmed, not filed"*, that a `{kind:'nonsense'}` placement fell past A-19's city check (which tested `kind === 'pool'` first) and landed on the rebuild ternary's else-arm, writing `{kind:'pool', cityKey: undefined}` into the recipient's document. Part 4(c) merges the check and the rebuild into **one** branch on the discriminant, so the else-arm now validates `cityKey` before emitting it and the call **throws** `copyStopInto: no such city undefined in trip-tgt`. This is a direct consequence of the body A-21 prints, not a choice I made; it is strictly better (§2.1 calls an out-of-union argument programmer error, and refusing beats writing a filing nothing badges); and the target is byte-identical behind the throw. I have **pinned it with a test** so the change is deliberate and visible rather than an unobserved side effect, and flagged it here for the architect and for QA round 18. |
> | **Objection to the design — one, non-blocking, implemented as specified anyway** | Part 4 states a **file-wide** rule (*"every field of every record this function reads, once"*) and argues that its value is precisely that it is **total** and therefore checkable in one pass. But Part 4's own place block prints the `refileCityKey` / `samePlace` / `placeForCopy` body as *"verbatim"*, and that body still reads `original.at` **three times** in A-14's step-3 branch (`original.at === null ? … : {lat: original.at.lat, lng: original.at.lng}`) — the identical shape, in the identical file, that the ruling fixes one function away in `placeForCopy`, with the identical consequence — **measured on this tree, not argued**: a source place whose city the target cannot answer to, with an `at` flipping `[{lat:1,lng:2}, null]`, still raises `TypeError: Cannot read properties of null (reading 'lat')` out of `copyStopInto` after this pass. I hoisted it, then reverted, because *verbatim* is what the ruling says and this is an architect's call, not mine. The residue is that the file-wide rule is **not** total today, so the reviewer's one-pass question has an exception that is not written down anywhere but here. It is a two-line fix if the architect wants it. **CLOSED by A-21a** — upheld by the architect and built in the addendum above. |

> **Addendum, on `ec1f0c3` — ARCHITECTURE revision 15's **A-20** built in all five parts, plus
> QA round 16's **R16-1** and its named rider; QA **R16-1** and **R16-2** both addressed.**
> Scope was A-20 and R16-1 and nothing else: five source files, one new source module, one test
> file changed, one new test file. No `schemaVersion` bump (A-20: the refused population is
> empty and measured so — 0 of the reference trip's 95 places carry `hours`, and
> `importLegacyDays` never emits one — so a bump would be ceremony), **no new export (71)**,
> no new `REDACTION_PATTERN` and no new `redactText` call site, nothing under `qa/`, nothing in
> `packages/client` or `apps/web`, nothing at the repo root, and no edit to `ARCHITECTURE.md`,
> `ROADMAP.md` or the visual roadmap.
>
> | | |
> |---|---|
> | **Part 1 — one predicate, one module** | New `packages/core/src/model/openingHours.ts` with `isClockTime`, `isWeeklyEntry`, `isOpeningHours`, bodies exactly as the ruling prints them. Modelled on `model/cityName.ts` and, like it, **deliberately off `index.ts`** — §2.10 stays at **71** runtime symbols, asserted in the new test file as well as in `surface.test.ts`. Its doc comment carries the three things A-20 says it must not do (no `day` range check, extra keys are not malformed, an `undefined` slot is not malformed) so nobody adds them back. |
> | **Part 2 — `fromJSON` validates `hours` like every other field** | `parseOpeningHours(v, path)` plus a `clock(v, path)` helper; `parsePlace`'s cast is gone. Each `weekly` entry is rebuilt from `{day, open, close}` via `numOf`/`clock`, so R15-1's carrier — an unenumerated key — cannot survive parsing at all; `note` goes through `str`. `hours: null` is **refused** (`expected an object`), because `Place.hours` is optional and not nullable. `clockOrNull` now imports `isClockTime` too, so **the clock regex appears exactly once in `packages/core`** — pinned by a source-grep test that also asserts the address is `model/openingHours.ts`. |
> | **Part 3 — `validateTrip`** | `wellFormedHours` deleted (12 lines); the call site is `if (p.hours !== undefined && !isOpeningHours(p.hours))`. The `Issue` is byte-for-byte unchanged in level, code, ref, message and params. Its doc comment asserted the parser's cast was *deliberate* and cited A-10 for it — that sentence is now false, so it is replaced by A-20's narrowed meaning: **this in-memory document holds a `Place.hours` that `fromJSON` would refuse**. The same false sentence was also in `model/types.ts` beside the `IssueCode` and is replaced there for the same reason. |
> | **Part 4 — `copyStop.ts`** | `weeklyForCopy` keeps **one** line of its own: the redaction check, now commented as an A-18 **policy** and not a shape test, above `isWeeklyEntry`. `hoursForCopy` is **unchanged** — its `Array.isArray` guard and its `raw as unknown` treatment stay, because R15-2's closure is about an *in-memory* document and a ruling about the parser does not reopen it. Two more comments that asserted the parser's gap (`redacted`'s and `placeForCopy`'s `hours` row) are corrected rather than left to teach the wrong rule. |
> | **Part 5(a) — the redaction arm is unreachable, exhaustively** | All **11 000** strings matching `/^\d{1,2}:\d{2}$/` (hours `0`–`9` and `00`–`99`, minutes `00`–`99`) are byte-identical under `redactText`, with the count asserted so the loop cannot silently shrink. This is what makes R16-2 unrepeatable: the day a `REDACTION_PATTERN` breaks it, the divergence is a red test rather than a silent `null`. |
> | **Part 5(b) — the invariant, mutation-verified in both directions** | *If `isWeeklyEntry(w)` and `w != null`, then the entry survives the copy.* `weeklyForCopy` is module-private, so it is measured where it is observable — the copied place's `hours.weekly[0]` — over a 12-row table containing R16-2's three shapes, a legitimate entry, a single-digit hour, an extra-key entry, `null`, `undefined`, a nested object, an array, a string and a `NaN` day; 3 survive, 9 drop, and `validateTrip`'s verdict is asserted to agree row by row. **Mutation-verified both ways**: weakening `isWeeklyEntry` to `wellFormedHours`' old `typeof e.open === 'string'` turns 5(b) red (4 red in all), and making `weeklyForCopy` stricter than the predicate (`/^\d{2}:\d{2}$/` on `open`) turns **only** 5(b) red — which is precisely R16-2's divergence. |
> | **The one extra line, outbound** | `toJSON`'s `hours: p.hours` becomes a field-by-field rebuild, removing the aliasing between an in-memory `weekly` array and the object handed to `JSON.stringify` and stopping `toJSON` re-emitting an unenumerated key from a cast-built document. It **does not normalise, drop or throw on** a malformed value: anything not of the declared shape passes through, which is both A-20's *"an export stays a faithful record"* and the load-bearing premise of ratifying `place_hours_malformed` (the export must re-emit, so the *re-import* is what fails and the warning is what says so first). That non-throwing pass-through is my one judgment call inside Part 5's "one extra line", and it is pinned: the R15-2 test now asserts `toJSON(cast-built)` does not throw and `fromJSON(toJSON(cast-built))` does. |
> | **R16-1 (MINOR) — the `links` row that could not fail** | The hostile source in `copyStop.test.ts`'s key-set test gains `links: [{label, href, eleventh: 'PIN 0754'}]`, plus a `Link` key-set assertion and a greppability assertion against it. **Mutation-verified**: reverting the `links` line to `{ ...l }` now turns that test red (0 red before). |
> | **R16-1's named rider** | A new test pins `placeForCopy`'s `redacted(p.note)` against a cast-built place whose `note` is an object / a number / an array / `true`: each must arrive `'[redacted]'`. **Mutation-verified**: restoring `redactText(p.note) as string` turns exactly that test red (0 red before). A "redaction is not a wipe" line sits beside it so the fix cannot be satisfied by redacting everything. |
> | **The three shipped tests A-20 said would need re-expressing, and how** | `copyStop.test.ts`'s `reparsedWithHours` built its hostile fixtures **through `fromJSON`**, which A-20 now refuses — all three went red, exactly as the ruling predicted. They are re-expressed per A-20 (*"a hostile `hours` fixture now arrives by cast, not by parse"*) as `castWithHours`, and each assertion is **two-sided**: `refusedByParser(...)` asserts `fromJSON` throws a `TripParseError`, then the cast-built document asserts `copyStopInto` still never throws. R15-2's closure is not weakened — it is now stated against the population that can actually still produce it. The one exception is the extra-key fixture, which A-20 puts on the *normalise* side rather than the refuse side, so there the parser assertion is that the key is **dropped**. |
> | **Numbers, my own runs on this pass** | `npm run typecheck` clean (both projects). `npm run test:tap` **593 pass / 0 fail** (583 before; +10 — 8 in the new `openingHours.test.ts`, 2 in `copyStop.test.ts`). `npm run web:build` clean. `Object.keys(core).length` **71**. Reference trip **2 blockers / 4 warnings / 11 notes** at `FIXTURE_TODAY` (`2026-08-01`) and `validateTrip` **11** issues, with `place_hours_malformed` firing **0** times — 0 of 95 places carry `hours`. `npm run golden` and `npm run sample` regenerate byte-identically, sample sha unmoved at `40955ca0b182`, `git status` clean apart from my seven files. `qa/r14-horizon-copy.mjs` **ALL OK** (it does not construct an `hours` and is unmoved, contrary to what the routing note expected). `qa/r2-copy.mjs` **0 FAIL** (§H included). `qa/prov.mjs` **0 FAIL**. `qa/r2-constraints.mjs` **1 FAIL** (R2-18, known and pre-existing). |
> | **The two `qa/` probes that go red on purpose, reported rather than edited** | A-19 assertion 7 and A-20 both say the builder does not edit anything under `qa/`, so I did not. **`qa/r15-place-copy.mjs`: 1 FAIL, then an uncaught abort.** The FAIL is §1.1's *"the hostile `hours` survives fromJSON unvalidated (the live route this finding needs)"* — a line whose whole premise A-20 deletes. The abort is at `qa/r15-place-copy.mjs:150` (§1.2), an uncaught `TripParseError: expected a string (at $.places[0].hours.note)` from `reparse()` feeding `hours.note` as an object; §1.3 onward therefore does not run. **`qa/r16-copy-depth.mjs`: 1 FAIL, then an uncaught abort.** The FAIL is §1.2's R16-1 line, a literal `ok(…, false, …)` — a statement about the *shipped suite* that no product change can turn green, which is why I mutation-verified the R16-1 fix myself instead. The abort is at `qa/r16-copy-depth.mjs:253` (§2.2), an uncaught `TripParseError: expected HH:MM (at $.places[0].hours.weekly[1].close)` on the `close: '170000'` fixture, so §2.3's R16-2 line and §3–§5 do not run. Both aborts are `fromJSON` correctly refusing a shape A-20 rules it must refuse. The re-expressed assertion is two-sided and both halves must be kept: **the parser refuses with a path**, and **`copyStopInto` still never throws** on the equivalent cast-built document — `packages/core/test/` now states it in exactly that form and can be copied from. |
> | **Objection to the design** | None. A-20 is five parts with the bodies printed; I implemented them as written. The only place I had to decide anything was `toJSON`'s rebuild (row above), and I decided it the way the ruling's own ratification argument requires. |

> **Addendum, on `b3a0c89` — ARCHITECTURE revision 14's **A-18** and **A-19** built, plus the
> two findings QA routed straight here (**R15-1**, **R15-2**) and the two test-coverage ones
> (**R15-4**, **R15-5**); QA **R15-1**…**R15-6** all addressed.**
> Scope was round 15's six findings and nothing else: three source files, two test files.
> No `schemaVersion` bump, no migration, **no new export (71)**, nothing under `qa/`, nothing in
> `packages/client` or `apps/web`, and no change to `redactText`/`REDACTION_PATTERNS` or to
> `tools/redact.mjs` — this pass adds call sites, not patterns.
>
> | | |
> |---|---|
> | **A-18 (R15-3, BLOCKER) — free text does not become structural by being nested inside a `Stop`** | Three new module-private functions in `build/copyStop.ts` and four call sites. `redacted(s)` is `redactText` plus *"and if it did not come back a string, it is `REDACTED`"* — it **replaces every `as string` in the file** (rule 5's `note`, `placeForCopy`'s `note` and `hours.note`), because the cast is how R15-1 crossed. `costForCopy` rebuilds `{amounts, display, note?}`: `amounts` entry by entry and field by field (`{lo, hi, currency, basis}`), `display` kept only when `redacted(display) === display` and `null` otherwise, `note` redacted with the key present only if the source had one. `arrivalForCopy` rebuilds `{mode, mins, label?}` with `label` redacted. The `links` line becomes `{label, href}` — same policy as A-15's disclosed residue, different construction, because position 2 admits no exceptions. `flags` stays `[...src.flags]` (a `STRUCTURAL_KEY` on the sample path too, so the two thresholds already agree). |
> | **…and the rest of the file, so position 2 is true of the whole module and not just the write paths** | Three spreads of a source record that no finding named are gone too: `{...src.place.at}` and `{...original.at}` are now `{lat, lng}` field by field, and `refiled` — the probe `samePlace` compares against — is built from the three fields `samePlace` reads instead of spread from `original`. **`copyStop.ts` now contains no spread of a source record at any depth, and no `as string`.** Both are greppable one-line checks for round 16. |
> | **A-18's mechanical stop** | `copyStop.test.ts` gains four compile-time exhaustive maps beside A-15's `PLACE_FIELDS` — `STOP_FIELDS: Record<keyof Stop, true>`, `COST_FIELDS`, `MONEY_FIELDS`, `ARRIVAL_FIELDS`, `LINK_FIELDS` — so a new field on any of those five records fails `npm run typecheck` first, and then fails the five key-set assertions until it is classified. The runtime half is also forced against a **hostile** source carrying an unclassified ninth key on `cost` and `arrival`, so the assertion catches a re-introduced spread and not only a deleted field. Same limitation A-15 discloses, restated in the test: a field that silently fails to travel is the fail-closed direction and is caught by the maps and by review, not by the key-set assertion. |
> | **R15-1 (BLOCKER) — the one surviving spread, one level down inside `Place`** | `hours.weekly` entries are rebuilt by `weeklyForCopy` as `{day, open, close}` — `null` for anything that is not a well-formed range, which is `OpeningHours`' own specified unknown. `open`/`close` must be strings `redactText` leaves byte-identical, or the entry becomes `null`: a `[redacted]` opening time is A-18's `display` argument one record over, and `open`/`close` are **not** `STRUCTURAL_KEYS`, so §6.6's sample pass redacts them and the two thresholds now agree there too. `hours.note` goes through `redacted`, which is what makes `{pin: '…'}` and `5814731574` land as `[redacted]` instead of crossing whole. |
> | **R15-2 (MAJOR, a regression) — two halves, and the second one is a new `IssueCode`** | `hoursForCopy` treats its `OpeningHours` parameter as the `unknown` it actually is, so all six shapes `fromJSON` accepts (`{}`, a string, a number, an array, `null`, `weekly: 'mon-fri'`) copy to `{weekly: []}` with **no throw and no invented opening time**. That closes the crash. The finding's other sentence — *"nothing warns the user first"*, and `qa/r15-place-copy.mjs` §1.3's second line, which asserts it — needed `validateTrip` to say something: **`place_hours_malformed`** (level `warn`, `ref:{kind:'place'}`), one per place whose `hours` is present and is not structurally an `OpeningHours`. A weekly entry with **extra** keys is deliberately not reported: they are dropped at the copy boundary and nothing else reads them, so warning about them would be noise. See the disclosure row below — this is the one thing in this pass an architect has to ratify. |
> | **A-19 (R15-6, MINOR) — a placement is an instruction in the target's terms** | Three parts, all inside `copyStopInto`, all as ruled. (1) A `{kind:'pool'}` placement whose `cityKey` is neither `TRANSIT_CITY_KEY` nor a key of `target.cities` **throws** `copyStopInto: no such city <key> in <tripId>`, checked beside the existing `dayId` check so nothing is partially built behind it. (2) The placement is rebuilt field by field into `placed` and `placed` is what reaches `addStop` — R14-3 one field over, since `makeStop` stores the caller's object and `reindex` keeps it when the order already matches. (3) A `hint` whose `dayId` the target cannot resolve is **dropped, not thrown on**, so the recipient's *"Add to the plan"* falls through to `pickDay` + `CAT_DEFAULT_TIME` instead of throwing `scheduleFromPool: no such day`. `refileCityKey`, `placeForCopy`, rule 4, `addStop`, `pool.ts` and `validateTrip`'s `pool_stop_unknown_city` are all untouched. |
> | **R15-4 (MINOR, coverage) — A-16's step order, pinned by a test that can actually fail** | The shipped fixture filed its place under `'city_gone'`, a key **neither** document holds, so step 2 was false whatever the order. The new test uses QA §3.2's document: one trip id, a place filed under a key the **source snapshot** cannot resolve and the **target** can (it gained the city after the snapshot). Step-1-first gives step 3 (`place.kind === 'inline'`, no row); step-2-first returns the key, the reuse search then matches the original row, and the link is `'place'`. The three preconditions that make the order observable are asserted in the test rather than assumed. **Mutation-verified**: moving step 2 above step 1 turns exactly this test red. |
> | **R15-5 (MINOR, coverage) — `beyondHorizon`'s `every`, pinned in the shipped suite** | `horizonGate.test.ts`'s `sweptDocuments()` gains `duplicate-stop-id-far`: the same `duplicate_id` construction with `days` **reversed** (a document `fromJSON` accepts — nothing sorts days on the way in) and its two days at `2026-08-15` / `2026-12-01`. QA's own reversed fixture is not enough on its own, because the shipped test sweeps **six** clocks and QA's probe swept 406: on QA's dates none of the six lands in the discriminating band. These dates do — at `2026-08-01` the rule reports **14** days out (inside its 60-day horizon) while the ambiguous stop ref resolves to `2026-12-01`, **122** days out. **Mutation-verified**: `subjects.every` → `subjects.some` leaves the suite green before this fixture and turns A-17's directional test red after it. The A-11 (5) obligation assertion sweeps the new document too. |
> | **Numbers, my own runs on this pass** | `npm run typecheck` clean (both projects). `npm run test:tap` **583 pass / 0 fail** (568 before; +15, all in `copyStop.test.ts` — `horizonGate.test.ts` stays at 8 tests and gains a *fixture*, which is what R15-5 needed). `qa/r14-horizon-copy.mjs` **ALL OK**, with `/tmp/r14-pre` (`78b490f`) and `/tmp/r14-tw` (`fb3ff34`) present. `qa/r15-place-copy.mjs`: **every line that measures the code passes** — see the row below for the three that cannot. `qa/r2-copy.mjs` 36 ok / **0 FAIL** (§H included — two order-shaped hrefs still travel, which is the policy A-18 explicitly does not change). `qa/prov.mjs` **0 FAIL**. `npm run golden` + `npm run sample` regenerate byte-identically, sample sha unmoved at `40955ca0b182`, `git status` clean apart from my five files. `Object.keys(core).length` **71**, `placeForCopy`/`refileCityKey` still module-private. Reference trip **2/4/11** at `FIXTURE_TODAY`, `validateTrip` **11** issues — both unmoved (0 of its 95 places carry `hours`, 0 of 143 stops carry a `cost.note` or an `arrival.label`). |
> | **What `qa/r15-place-copy.mjs` still reports, and why I did not touch it** | Three of its 17 by-design FAILs cannot go green from product code, and **A-19 assertion 7 says in writing that the builder does not edit anything under `qa/`** — so I did not. (a) **§3.4 line 1** calls `copyStopInto` with a pool placement carrying the source's key and asserts against the **returned document**; A-19 makes that a throw, which the probe does not catch, so the script now exits there. A-19 names this and hands it to QA to re-express as a `throws` assertion in round 16. (b) **§3.2's R15-4 line** and (c) **§5.1's R15-5 line** are literal `ok(..., false, …)` — statements of a finding about the *test suite*, not measurements of the code — so no product change can turn them green either. To report §4/§5/§6 honestly I ran a **scratch copy** of the probe outside `qa/` with (a) re-expressed as a `throws` assertion and nothing else changed: **§3.4 both lines, all of §4, §5.1's two measuring lines, and all of §6 pass**, including the `/tmp/r15-pre` (`3409420`) differential — the copied stop and place are byte-identical to pre-A-15 on that fixture, the only removed key is still `links`. The scratch copy was deleted; the patch is the four lines quoted in this row. |
> | **The one thing an architect has to ratify** | `place_hours_malformed` is a **new `IssueCode`**, and §2.9's printed code list does not have it. A-18 says in terms that the ruling *"changes nothing in `fromJSON`"*, and it does not — but QA routed R15-2 whole to a builder, and the probe line that pins its second half asserts `validateTrip` mentions `hours`, which is not satisfiable without a code. I added it as a `warn` and marked it in `types.ts` as awaiting ratification rather than editing `ARCHITECTURE.md`, which this pass was told not to touch. §2.9's list already lags the type by A-10's three codes, so this is not a new class of drift — but it is drift, and it is mine. **No KD was minted**: `qa/r14-horizon-copy.mjs` §7 pins `kds.length === 49`, so a KD-50 would turn a green probe line red to record a decision this row already records. |
> | **Red before green** | Measured, not asserted: the three source files were reverted to `b3a0c89` with the new tests in place and the two test files run. **9 of the 15 new tests go red** — the key-set test (against its hostile source), both A-18 credential/`display` tests, both R15-1 tests, the R15-2 six-shape test (it *throws* before the change), and three of the four A-19 tests. The other 6 are ceilings that cannot fail before the change (redaction-is-not-a-wipe, no-aliasing, no-new-throw-site, the transit and within-trip pool cases, and R15-4's ordering test, which asserts what the old code already did *for the wrong reason*). Those, and R15-5's, were forced red by **mutation** instead, each reverted afterwards: reintroducing the `cost`/`arrival` spread (3 red), `{...w}` on `weekly` (3 red), aliasing the placement (2 red), deleting the pool-city check (1 red), carrying the hint (1 red), spreading `links` (1 red), reordering A-16's steps 1 and 2 (**1 red — R15-4's whole point**), and `beyondHorizon`'s `every` → `some` (**1 red — R15-5's whole point, and green on the same suite before this pass**). |

> **Addendum, on `3409420` — ARCHITECTURE revision 13's **A-15**, **A-16** and **A-17** built,
> plus the mechanical **R14-3**; QA **R14-1**, **R14-2**, **R14-3** and **R14-4** CLOSED.**
> Scope was round 14's four findings and nothing else. Three files of source (two of them
> comment-only), two test files and the round-14 probe. No `schemaVersion` bump, no migration,
> no new export, and nothing in `packages/client` or `apps/web` changed.
>
> | | |
> |---|---|
> | **A-15 (R14-4, BLOCKER) — a copied `Place` crosses a person boundary, so §6.6 applies to it** | New module-private `placeForCopy(p, cityKey, id)` in `build/copyStop.ts`, applied at the one site that pushes a row. `id`/`cityKey` as rule 1 and A-14 left them; `name`, `category` verbatim; `at` **cloned** or `null`; `note` through `redactText`, key present only if the source had one; `links` **dropped entirely, key absent**; `hours` key present only if the source had one, `weekly` cloned entry by entry, `hours.note` through `redactText`. **There is no remaining spread of a source `Place` into the target document.** `refiled` survives only as the probe `samePlace` compares against, so the reuse branch is bit-for-bit what A-14 left. `redactText`/`REDACTION_PATTERNS` unchanged — this adds call sites, not patterns. |
> | **A-15's mechanical stop against the fail-open direction** | Two layers, because the runtime one alone is weaker than the ruling wants. `copyStop.test.ts` holds `const PLACE_FIELDS: Record<keyof Place, true>` — a **ninth field on `Place` fails `npm run typecheck` there**, verified by adding one and reading the error (`TS2741: Property 'ninth' is missing … but required in type 'Record<keyof Place, true>'`) — and the same test asserts the fixture populates all eight and that the copy's key set equals the seven that A-15's table lets cross. |
> | **A-16 (R14-2, MAJOR) — re-filing is a derivation; the source may already hold the answer** | Four lines in `refileCityKey`: `if (source.id === target.id && target.cities.some((c) => c.key === cityKey)) return cityKey;`, placed **after** step 1 and **before** the name fold. Step 1 stays first, so a place whose `cityKey` the source cannot resolve still takes step 3 within one trip, deliberately. Both conjuncts written as ruled — `.id` not `===`, and the key read from `target` not `source` — and both are covered by their own test. |
> | **R14-3 (MINOR, routed straight here)** | `let place = src.place` aliased the source's `PlaceLink` — and for `{kind:'inline'}` one mutable `LatLng` — into the target document. Now `{kind:'inline', at:{...src.place.at}}` / a fresh `{kind:'none'}`; the `'place'` kind is untouched because every branch below replaces it. Same argument as KD-47's third bullet, applied to the branch beside it. |
> | **A-17 (R14-1, MINOR) — a doc narrowing, one contract obligation and one directional test** | **No code changed** in `detect.ts`, `subjectDate`, `beyondHorizon` or any rule file, as ruled. `conflict/rules/types.ts` gains the standing obligation on `horizonDays` as prose (comment only). `horizonGate.test.ts` gains A-17's directional test — over the reference fixture, all five fault fixtures, `horizon-60` and a `duplicate_id` document, at all six A-11 clocks — and the A-11 (5) test gains the obligation assertion (every conflict from a horizoned rule carries a resolvable `{kind:'day'}` subject). |
> | **The two probe edits A-17 authorises, and only those** | `qa/r14-horizon-copy.mjs` §1.5: the retired `ok()` is replaced by A-17 point 3's direction (*the gate never withholds a finding inside its own horizon*, 183 checks), naming A-17 in the comment; the `console.log` of surviving `daysOut` stays and still prints `[73]`. §1.4's `duplicate-stop-id` line is now a `console.log` **measurement** of the documented divergence — it prints `123/435 clocks diverge from pre-A-11, first at 2026-03-02`, which is QA's own 123 — while `reference` and `horizon-60` keep their `ok()` and are still byte-identical. Nothing else in the probe moved. |
> | **Numbers, my own runs on this pass** | `npm run typecheck` clean (both projects). `npm run test:tap` **568 pass / 0 fail** (554 before; +14 — 13 in `copyStop.test.ts`, 1 in `horizonGate.test.ts`). `qa/r14-horizon-copy.mjs` **15 FAIL → 0**, measured both ways by stashing this pass (the 15 were R14-4 ×6, R14-2 ×5, R14-3 ×2, R14-1 ×2); run with both scratch worktrees present (`/tmp/r14-pre` at `78b490f`, `/tmp/r14-tw` at `fb3ff34`) **and** without them, 0 FAIL both times. `qa/r2-copy.mjs` and `qa/prov.mjs` **0 FAIL**. `npm run golden` + `npm run sample` regenerate byte-identically, sample sha unmoved at `40955ca0b182`; `git status` clean apart from my five files. `Object.keys(core).length` **71** (probe §7). Reference trip **2/4/11** at `FIXTURE_TODAY`, `validateTrip` 11 issues — both unmoved. |
> | **Red before green** | 8 of the 14 new tests fail against the pre-change `copyStop.ts` (stashed, run, popped): the five A-15 behaviour tests, two A-16 tests and R14-3. The other six are **ceilings, and cannot fail before the change** — A-15's reuse branch, A-16's `.id`-not-`===` case, step 1 staying first, the stale-source case, the shared-key coincidence case (each of these fails against a *wrong* implementation of A-16, not against the old one) and A-17's directional test, which asserts a property no code in this pass touches. The two that cost the most to leave unforced were forced red by mutation instead: shrinking the applied horizon in `beyondHorizon` turns A-17's test red with its own message, and deleting `unbooked_ticketed`'s `{kind:'day'}` subject turns the obligation assertion red. Both mutations reverted. |
> | **The one judgment call the ruling left open** | A-17 point 3 says *"every conflict … whose `params.daysOut <= horizonDays` is present, by id, in `detectConflicts`"*. Taken literally that is false for a **past** day: `daysOut` is then negative, so it satisfies `<= horizonDays`, and §8.2's feasibility gate — which A-11 never touched and A-17 makes no claim about — withholds it. The test therefore sweeps `0 <= daysOut <= horizonDays`, and the narrowing is provable rather than convenient: `daysOut >= 0` means the day the rule iterated is today or later, so that subject is not strictly before `today`, and `suppressedAsPast` needs **every** subject in the past. Inside that band the horizon is the only gate left that could withhold the finding, which is exactly the claim A-17 is buying. Written into the test's own docstring. |
> | **Why there is no KD-50** | This pass introduces no divergence from the contract — it closes four — and `qa/r14-horizon-copy.mjs` §7 pins `KD ids are contiguous 1..49`, which A-17 forbids weakening. Minting a KD for the judgment call above would have turned a green probe line red to record a decision that belongs in this table. The disclosure test still passes: no new source comment trips a trigger. |
> | **What I could not verify** | Node 24 (this environment is Node 22.22.2). No browser run: nothing in `apps/web` changed, and no Chromium probe was executed. `Place.hours` has no write path in the shipped app, so A-15's `hours`/`hours.note` rows are exercised by constructed fixtures only — `importDoc`/`fromJSON` is the live route, asserted in the probe's §5.9 for `note` but not measured against a real document carrying `hours`. Whether a real device clock steps backwards in the field: unchanged from the A-11 pass, still cited rather than measured. |
> | **One thing the manager should know that is not about this diff** | The work sits on branch `claude/i4a-r14-issues-f0bkgc`, which is where the architect's revision 13 commit (`3409420`) already was. `master` (`f7fa577`) does **not** contain it, and master has live-planner commits this branch does not. Per the root `CLAUDE.md` that is the drift it warns about, and it is not something a builder pass should resolve silently — flagging rather than merging. |

> **Addendum, on `78b490f` — ARCHITECTURE revision 12 §2.7 **A-11**, **A-12** and **A-13** built;
> QA **R13-1**, **R13-2** and **R13-3** CLOSED.** Scope was those three rulings and nothing else.
> R13-4 and R13-5 were not touched; R13-6 was closed by the parallel A-14 pass, whose addendum is
> below. The retirement ledger (A-5, A-5a, A-5b, A-8) was not reopened.
>
> | | |
> |---|---|
> | **A-11 — the clock may not decide *membership* of the un-gated set** | `Rule` gains `horizonDays?: number`. `unbookedTicketed` **declares** `horizonDays: UNBOOKED_HORIZON_DAYS` and deletes `if (delta > UNBOOKED_HORIZON_DAYS) continue;`; `ctx.today` stays in that file for `summary` and `params.daysOut` only — prose — and no branch reads it. `detect.ts` grows `beyondHorizon(trip, conflict, today, horizonDays)`, module-private, symmetrical with `suppressedAsPast` and sharing its asymmetry (*every* subject beyond the horizon, so one subject inside it keeps the finding). Both live under the **same `gate` conjunct** and are not nested: past-ness is a property of the rule's *class*, a horizon is a property of the *rule*. `detectUngated` therefore disables the horizon exactly as it disables the gate. |
> | **A-9's greppable ceiling, replaced not deleted** | The `ctx.today`-in-one-file test is gone from `retirementGate.test.ts` (with a comment saying where it went) and replaced by A-11's property, swept: for one document, `detectUngated` returns the **same conflict ids at all six clocks**, over the reference fixture **and** five injected-fault fixtures that between them fire all ten rules — the sweep fails if any rule is silent everywhere. New helper `packages/core/test/faultFixtures.ts` collects those fixtures, each lifted from the per-rule test that already owns it. The probe's own §9 grep still passes; the token is still there, for prose. |
> | **A-12 — a crashed rule's contribution is *unknown*, not *absent*** | `runRules` collects `crashed: RuleId[]` in the existing `catch`, in `RULES` order. `detectUngatedChecked(trip, opts): { conflicts, crashed }` is the new internal entry point; **`detectUngated` keeps its array shape** and becomes a one-line wrapper, so round 13's §1/§5/§9 assertions call it verbatim and stay independent evidence that A-11 worked. `syncResolutions` returns the trip unchanged if `crashed.length > 0`, trip-wide and before any row is stamped. `detectConflicts`, the `!crashed` gate conjunct and `store.retireResolutions` are all unchanged. Neither new name is on `index.ts`. |
> | **A-13 — A-9 assertion 4's mechanism** | The inert `setTripMeta({endDate})` call is deleted from `retirementGate.test.ts` and the test renamed to the **clock crossing** it runs; every assertion and the pre-A-9 control kept, plus one new assertion that the gate really did withhold the finding at the post-`endDate` clock (otherwise the crossing is not a crossing). A-13's tripwire added: no `feasibility` rule emits a finding whose subjects *all* resolve through §8.2 ruling 2's `endDate` fallback, over every fixture. |
> | **Numbers, my own runs on this pass** | `npm run typecheck` clean (both projects). `npm run test:tap` **554 pass / 0 fail** (539 at `78b490f`; +15 — 7 in the new `horizonGate.test.ts`, 7 net in `retirementGate.test.ts`, 1 in `packages/client/test/retirement-clock.test.ts`). `qa/r13-gate-citykey.mjs` **11 FAIL → 0** (§1.1 ×1, §1.2 ×4, §1.3 ×2, §3 ×2, §4 ×2). `npm run golden` regenerates byte-identically and the sample sha is unmoved at `40955ca0b182`. `Object.keys(core).length` is **71** (probe §7). |
> | **Red before green, per test** | All 15 watched fail first except two that cannot fail before the change and are ceilings rather than features: A-11 (3) (`detectConflicts` byte-identity, whose digests were taken by *running* the pre-A-11 code) and A-13's tripwire, which A-13 states is vacuously true today. The tripwire was forced red anyway, by temporarily making `missing_lodging` emit a `{kind:'trip'}` subject — it fired with A-13's own message. The store-level A-11 test was forced red by stashing the three source files. |
> | **Two judgment calls the rulings did not settle** | **KD-48** — A-11 assertion 4 says the rule fires *three* times on the reference trip; it fires *ten*. **KD-49** — §3 of the QA probe: A-13 authorises replacing its first assertion, and its second measured a call the same ruling orders deleted, so it now checks what A-13 actually requires of the test file. |
> | **One place I strengthened rather than followed** | A-12 assertion 1 says *"a live dismissal of a **different** rule's finding present"*, but QA §4 — which the same sentence calls verbatim — crashes the rule that **owns** the dismissal. Both are written. The different-rule case is **vacuous pre-A-12** (crashing `geo_outlier` never removed a `missing_lodging` finding, so nothing retired either way), so it is written as the discriminating version instead: a *genuinely fixed* dismissal plus an unrelated crash, which pre-A-12 retires and post-A-12 defers — and the test then asserts retirement **resumes** on the next recompute, which is the sentence A-12 leans on when it says nothing is lost. |
> | **What I could not verify** | Node 24 (this environment is Node 22.22.2). No browser run: nothing in `apps/web` changed, and no Chromium probe was executed on this pass. Whether a real device clock steps backwards in the field — the platform behaviour A-11 rests on is cited from Apple/AOSP docs in the ruling, not measured here. |

> **Addendum, on `be1ed01` — ARCHITECTURE revision 12 §2.14 **A-14** built; QA **R13-6** CLOSED.**
> Scope was A-14 and nothing else. A-11/A-12/A-13 were built in a parallel pass over `conflict/`;
> this one touched `build/copyStop.ts`, one new file, and three test files. R13-1…R13-5 were not
> touched by *this* pass.
>
> | | |
> |---|---|
> | **What changed** | `copyStopInto` rule 4 now runs A-14's three-step decision before any reuse search: find the source's city by key, re-file by normalised name onto the target's own key (lowest `order`, then document position), or — if the target has no city of that name — the place does not travel and the stop keeps the raw coordinate (`{kind:'inline'}`, or `{kind:'none'}` when the source place had none). No `Place` row is added in the third case and `target.cities` is never touched. Full reasoning and the three judgment calls: **KD-47**. |
> | **New file** | `packages/core/src/model/cityName.ts` — `normalizeCityName`, A-10's fold, in the lowest layer so `build/` and the later `derive/summary.ts` + `derive/travelStats.ts` import one copy. **Not** on `index.ts`: `Object.keys(core).length` is **71 before and 71 after**, run both ways. |
> | **Numbers, my own runs on this pass** | `npm run typecheck` clean (both projects). `npm run test:tap` **539 pass / 0 fail** (was 524; +15 — 10 A-14 cases in `copyStop.test.ts`, 5 in the new `cityName.test.ts`). `qa/r13-gate-citykey.mjs` **§10: 1 FAIL → 0** (12 FAIL → 11 overall; the 11 are R13-1 ×7, R13-2 ×2 and R13-3 ×2, all in the parallel pass's scope, none in mine). `qa/r2-copy.mjs` and `qa/prov.mjs` **0 FAIL**. `npm run golden` regenerates byte-identically; the sample sha is unmoved at `40955ca0b182`. |
> | **How those numbers were run** | A parallel builder was editing `conflict/` in the same working tree, so the full suite and the probes were run in a **detached `git worktree` at `be1ed01` carrying only this pass's five files** — otherwise the counts would have been measuring their in-flight work. The two files I iterated on were run in place. |
> | **What I could not verify** | Node 24 (this environment is Node 22.22.2). Whether Hermes ships `String.prototype.normalize` — still unverified, still a Phase 5 check, and now guarded so its absence degrades to step 3 instead of throwing (A-14; test in `cityName.test.ts`). No browser run: nothing in `apps/web` changed. |

> **Addendum, on `30d6288` — QA round 13's two routine MINORs, R13-7 and R13-8, both CLOSED.**
> Scope was those two findings and nothing else; R13-1, R13-2, R13-3, R13-4, R13-5 and R13-6 were
> not touched by this pass.
>
> | | |
> |---|---|
> | **R13-7 — six opaque keys out of six `Issue.message` strings** | `validateTrip.ts` only. `cityLabel` resolves a key to `City.name` where the trip has the city; each caller composes its own fallback where it does not. `Issue.params` unchanged at five sites and *added to* at one. Full reasoning and the two judgment calls: **KD-46**. |
> | **R13-8 — three Chromium assertions repointed** | `qa/p2b-past.mjs` §1c, §2d, §3d measured the deleted name-derived slug. All three kept, none deleted: §1c and §2d look the city up by the name the user typed and read the minted key back off the persisted document; §3d is *inverted* — the 東京/京都 collapse it expected the app to report cannot happen after A-10, so it now asserts there is nothing to report, which is the claim that fails again if the collapse returns. One assertion **added** (§3d0), because "zero issues on screen" is only evidence if the Validation panel is the panel being read — it now proves that from the panel's own empty state. Same class as KD-43, same file family, `qa/` is outside the disclosure scan. |
> | **Numbers, my own runs on this pass** | `npm run typecheck` clean (both projects). `npm run test:tap` **524 pass / 0 fail** (was 515; +9, all R13-7). `npm run web:build` clean. `qa/p2b-past.mjs` in real Chromium **3 FAIL → 0** (the three were §1c, §2d, §3d before; the run was done before and after). `qa/r13-gate-citykey.mjs` **13 FAIL → 12**. |
> | **The one number that moved that the task did not predict** | `qa/r13-gate-citykey.mjs` was expected to stay at 13. It goes to 12, because its §10 assertion `R13-6b` — *"the issue a person reads does not print the raw opaque key"* — **is** an R13-7 assertion, filed under §10 because a cross-trip copy is how it is reached. The remaining 12 are R13-1 ×7, R13-2 ×2, R13-3 ×2 and R13-6's own first assertion; R13-6 itself is untouched and still fails. |
> | **What I could not verify** | Node 24 (this environment is Node 22.22.2). Safari/iOS, a real second user: unchanged from previous passes. |
>
> The pre-existing status note below stands except for one line it now contradicts: it recorded
> that `qa/p2b-past.mjs` had **not** been re-run in Chromium. It has been, twice, on this pass.

> **Status: CURRENT — ROADMAP revision 11, increments I-3a and I-4a** (`master`, on `23f37b9`).
> The two architect rulings QA round 12 routed — `ARCHITECTURE.md` §2.7 **A-9** (P2-1) and §2.2
> **A-10** (P2-2) — built. Both were owed before I-6 and both are now in. **P2-5 and P2-8 were
> not touched and remain open.** I-5 … I-11 untouched. The retirement **ledger** (A-5, A-5a,
> A-5b, A-8) was not reopened: A-9 changes *when* retirement fires, never how a retirement
> behaves once it has.
>
> | | |
> |---|---|
> | **I-3a — retirement stops answering to the clock** | `detect.ts`'s body is now one private `runRules(trip, opts, gate)`. `detectConflicts = runRules(…, true)` (export unchanged); `detectUngated = runRules(…, false)` is module-level and **not** on `index.ts`. The gate line keeps every conjunct it had — including P2-4's `!crashed`, which A-9 explicitly preserves — and gains `gate &&` at the front, so the gate still lives **once**, where §8.2 put it. |
> | **I-3a — the footgun is deleted, not documented** | `syncResolutions` goes from `(trip, conflicts, at)` to `(trip, at)` and calls `detectUngated` itself. The rejected fix was passing the un-gated set in: handing it `derived.conflicts` is the *natural* call, it is the call QA's own probe made, and a function whose correctness depends on the caller not making the natural call is a footgun. Two early returns, cheapest first: no live resolution row (the reference trip has zero), then `!isIsoDate(at)` — `at` is now the clock as well as the stamp, so a missing or malformed one must mean *do nothing*, never *detect with no horizon*. |
> | **I-3a — the store** | `retireResolutions(derived, run)` loses the conflict-set argument and calls `core.syncResolutions(doc, derived.today)`. Retirement is now a function of `(document, today)` — `derivedFor`'s own cache key — so the render path runs it **only when `derivedFor` returned a new cache object** (`cache = retireResolutions(cache, cache !== prev)`). The public `store.syncResolutions()` passes `true`: explicit request, idempotent, not a render path. A-5's *"after `set()`, read `state.doc`, never the local"* is untouched. |
> | **I-3a — one rule lost half a guard** | `unbooked_ticketed`'s `delta < 0` is **deleted**. It was §8.2's gate open-coded inside a rule — what `rules/types.ts` forbids in writing — and it defeated A-9, because a finding the *rule* withheld is invisible to `detectUngated` and therefore looks to retirement like a fix. Provably output-neutral, and **measured**: `detectConflicts` on the reference trip is byte-identical before and after at five clocks and with no clock at all. The far-future half stays; as a clock advances `delta` only shrinks, so the 60-day horizon can only ever admit a finding. |
> | **I-4a — city keys are minted ids** | `CityInit.key` is optional; `createTrip` mints `ctx.ids.newId('city')` when it is absent, with `??` and not `\|\|` so an explicit key is honoured **verbatim** (legacy import's `vienna`/`split`/…, every fixture, every stored document). No migration, no `schemaVersion` bump, `CityKey` is still `string`. |
> | **I-4a — the slug is deleted, not repaired** | `name.toLowerCase().replace(/[^a-z0-9]+/g,'-')` is gone from `PastTripForm.tsx` and `Library.tsx`; both now pass `{ name, order }` and nothing else. `PastTripForm` **reads the minted key back** off the created document for its `setDayMeta` loop — recomputing one there is precisely the bug. Transliteration was not attempted: §1 forbids the dependency, and a hand-rolled kanji reading table produces a confident wrong answer, which is worse than a hole. |
> | **I-4a — three new validation codes, all `error`** | `duplicate_city_key`, `reserved_city_key` (the `transit` sentinel) and `city_name_empty`, all `ref: {kind:'trip'}` with `params.cityKey`. None is reachable by construction any more; all three are reachable by `importDoc`, by hand-edit, and from a build predating the ruling. **`fromJSON` refuses none of them** — an already-collapsed document must still *open*, or the user cannot see or act on it (the P2-7 harm). Each has an injected-fault test that also asserts the round trip still parses. |
> | **I-4a — `geo_outlier` says "the Vienna map"** | One shared `cityLabel(trip, key)` helper behind both label sites, resolving a key to `City.name`. `params.cityKey` keeps the id — structured data, and §2.7 requires the id there. This is the **only** expected string that moves in the repo, and it moves in the injected-fault `geo_outlier` case only. **Post-pass (KD-44, closed):** the no-such-city fallback was changed from the raw key to the phrase *"a city this trip does not have"*, composed as a standalone phrase rather than interpolated into `` `the ${label} map` `` — see KD-44. |
> | **Numbers, my own runs** | `npm run typecheck` clean (both projects). `npm run test:tap` **515 pass / 0 fail** (was 492; +23). `npm run web:build` clean. |
> | **Ceilings, measured not asserted** | `detectConflicts` + `validateTrip` on the reference trip: **byte-identical** JSON before and after, at `FIXTURE_TODAY`, 2026-08-10, 2026-08-27, 2027-01-01, 2019-01-01 and with no clock (11 validation issues both sides; 2 blockers / 4 warnings / 11 notes at `FIXTURE_TODAY`). `fixtures/golden/*.json`, `fixtures/europe2026.sha256` and `apps/web/src/sample/europe2026.json` all regenerated and **byte-identical**. `ctx.today` appears in exactly one file under `conflict/rules/` (`unbookedTicketed.ts`) — the two prose mentions in `rules/types.ts` were reworded so the grep measures code. The slug expression appears nowhere under `apps/` or `packages/`. |
> | **Export surface** | Unchanged. `detectUngated` is deliberately **not** on `index.ts`; `syncResolutions` keeps its place with a changed signature. **KD-42 (closed):** the count is 71, not the 70 A-9 and ROADMAP I-3a originally stated — it was 71 before this pass too. The stale `70` in both docs' prose has been corrected in place to match §2.10's own enumerated 71-entry list. |
> | **Probes, before → after** | `qa/p2b-gate.mjs` **13 FAIL → 5**. Closed: **§1.10** (2) and **§1.11** (2) for I-3a, **§3.3** (4) for I-4a. The 5 remaining are P2-5 (§3.4), P2-8 ×2 (§4.6), the §1.7 un-padded-`today` crash and the §2.1 `datePrecision`/`summary.ts` ceiling — all four pre-existing, disclosed, none of them this pass's. `qa/confid2.mjs` 0 FAIL. |
> | **Probes I edited, and why** | Two, both because the call they made no longer exists. `qa/p2b-gate.mjs` §1.10's `core.syncResolutions(t1, after, '2026-08-30')` → the two-argument form: A-9 says in writing *"that call is the defect, not the test"* and that its assertions are kept verbatim. `qa/confid2.mjs`'s `recompute` helper, the same edit. **§3.3 is the judgment call** — see KD-43. |
> | **Red/green, verified per increment** | Both written test-first and watched fail. I-3a: 3 of 9 red (the six that passed were the no-live-row early return, `detectUngated`'s absence from the surface, and cases the old code happened to satisfy). I-4a: 9 of 11 red. |
> | **Files** | Core: `conflict/detect.ts`, `conflict/resolve.ts`, `conflict/rules/unbookedTicketed.ts`, `conflict/rules/types.ts`, `conflict/rules/geoOutlier.ts`, `build/createTrip.ts`, `validate/validateTrip.ts`, `model/types.ts`. Client: `store/store.ts`. Web: `views/PastTripForm.tsx`, `views/Library.tsx`. Tests: new `packages/core/test/retirementGate.test.ts`, new `packages/core/test/cityKey.test.ts`, new `packages/client/test/retirement-clock.test.ts`, edited `packages/core/test/conflict.test.ts`. Probes: `qa/p2b-gate.mjs`, `qa/confid2.mjs`. Docs: this file, `QA-FINDINGS.md`, `CAIRN_VISUAL_ROADMAP.md` + `.html`. **No `ARCHITECTURE.md` or `ROADMAP.md` change.** Nothing at the repo root was touched. |
> | **What I could not verify** | Node 24 (this environment is Node 22.22.2). Nothing was run in a browser this pass beyond `web:build` — `qa/p2b-past.mjs` (Chromium) was **not** re-run, so its §3 P2-2 assertions are unconfirmed against the fix even though the headless §3.3 equivalent passes. Safari/iOS and a real second user, unchanged from previous passes. |
> | **Objection to the design** | None on A-9. One small one on A-10 — recorded in **KD-44** and resolved directly as a routine UX call (not an A-10 deviation: `unknown_city_key`/`params.cityKey` still carry the real signal, only the fallback sentence changed). |
>
> **The status note below is superseded by this one** and is kept as the record of what was
> true at `7fb753c`.

> **Status: superseded — the round-12 P2-3 / P2-4 / P2-6 / P2-7 pass** (`master`, after `7fb753c`).
> Four routed defect fixes from QA round 12 and nothing else. **P2-1, P2-2, P2-5 and P2-8 were
> not touched** (P2-1/P2-2 are with the architect; P2-5 and P2-8 are disclosed and open).
> I-5 … I-11 untouched.
>
> | | |
> |---|---|
> | **P2-3 (MAJOR) — closed** | `mergeTrips`' `TRIP_FIELDS` gains `datePrecision`, one entry, no restructuring. It now merges last-writer-wins per §2.2 exactly as `title` does, and a change taken from the other tab is **reported** (`report.fromRemote`) instead of vanishing. Three tests in `packages/core/test/merge.test.ts` cover remote-only, local-only and both-sides-changed. `homeBase` is **still** missing from that list — pre-existing since Phase 1, named as out of scope by the finding itself, and now named in a comment above the array so it is not re-derived. |
> | **P2-4 (MINOR) — closed, as a code fix** | The comment was right and the code was wrong: the synthesised `rule_error` note inherits the **crashing rule's** `class`, so a crash inside a `feasibility` rule was silent on every finished trip while the identical crash in an integrity rule reported. `detect.ts` now carries a local `crashed` flag set by the `catch`, and the gate reads `!crashed && rule.class === 'feasibility' && …`. The exemption is the crash itself, not the string `'rule_error'`, so a live rule cannot claim it by minting a conflict with that `ruleId`. Two tests in `ruleClass.test.ts`, one of which crashes **every** rule in turn. |
> | **P2-4 — one latent bug it made visible** | With the fix in, `qa/p2b-gate.mjs` §1.7 turns from ok to FAIL at `3 vs 2`: on an **un-padded** `today` (`'2019-3-5'`) the `unbooked_ticketed` rule throws `invalid IsoDate`, and until now the gate swallowed the crash report on a past trip. The crash is pre-existing and is the probe's own §1.7 divergence (and R2-14's *"`detectConflicts` accepts a garbage `today`"*); what changed is that it is no longer hidden. **Not fixed here** — validating `opts.today` is R2-14's scope, not P2-4's. |
> | **P2-6 (MINOR) — closed** | `TripSummaryRow` carries `datePrecision` and `Library.tsx` renders `dateRangeLabel(row)`, the same function `TripView` already used. The Library now lists *"June 2019"* and *"2015"* where it listed `2019-06-01 → 2019-06-30`. This is a **one-field** widening of the row, not I-6's (`cityKeys`, countries, `SUMMARY_VERSION` are untouched and still I-6's). A row written to IndexedDB before this change has no `datePrecision`, reads `undefined` and falls through to the exact form — which is what it was. |
> | **P2-6 — the ceiling it moved, read this** | §8.1's greppable ceiling (*`datePrecision` appears nowhere under `conflict/`, `derive/`, `validate/`*) now has **one exemption, `derive/summary.ts`**, because the Library lists rows read back from storage rather than `Trip`s — so `tripSummary` is display's hand-off point. The exemption is not a free pass: a second test asserts `summary.ts` **cannot** branch on the value (it names none of `'exact'`/`'month'`/`'year'`, contains no comparison against the field, and mentions it exactly three times — the type field and `datePrecision: trip.datePrecision`), and the exemption list itself is asserted to be exactly one entry. `qa/p2b-gate.mjs`'s own copy of that grep now reports 1 FAIL for this file — **expected, and the reason is here.** See KD-41. |
> | **P2-7 (MINOR) — closed** | `assertDatePrecision` in `createTrip.ts`, applied at both doors: `setTripMeta` when the patch **has the key** (so `{datePrecision: undefined}`, which spreads the field away, is refused too) and `createTrip` when `init.datePrecision` is not `undefined`. Throws `Error` naming the field and the three legal values, following `createTrip`'s existing calendar-date guard and `stops.ts`' `assertPatchable`. Guarding `createTrip` as well as `setTripMeta` is a deliberate one-line extension of the finding: same file, same field, same *"writes a document it cannot read back"* harm. |
> | **Numbers, my own runs** | `npm run typecheck` clean (both projects). `npm run test:tap` **492 pass / 0 fail** (was 479; +13). `npm run web:build` clean. |
> | **Probes, before → after** | `qa/p2b-gate.mjs` **19 FAIL → 13** (§1.8 P2-4, §2.5 P2-3, §2.6 P2-7 and §2.7 P2-6 all closed; the 13 are P2-1 ×4, P2-2 ×4, P2-5, P2-8 ×2, the §1.7 crash above, and the ceiling grep above). `qa/p2b-past.mjs` in real Chromium **6 FAIL → 4** (§4 P2-6 closed both halves; the 4 are P2-5 and P2-2 ×3). `qa/p2-pasttrip.mjs` **0 FAIL**, `qa/baseline.mjs` **0 FAIL**, `qa/accept.mjs` **28 pass / 0 fail**, `qa/r2-import.mjs` **0 FAIL**, `qa/prov.mjs` **0 FAIL**, `qa/r2-constraints.mjs` **1 FAIL** (R2-18, known, untouched). |
> | **Red/green, verified per fix** | Every one of the four was written test-first and watched fail: P2-3 2 of 3 red (the local-only direction passes trivially, since the local side already wins by construction — kept as the control), P2-4 2 of 2 red at `expected 1, actual 0`, P2-6 red on both the core row and the `Library.tsx` grep, P2-7 red on both doors. |
> | **Files** | `packages/core/src/merge/mergeTrips.ts`, `packages/core/src/conflict/detect.ts`, `packages/core/src/build/createTrip.ts`, `packages/core/src/derive/summary.ts`, `apps/web/src/views/Library.tsx`; tests `packages/core/test/merge.test.ts`, `ruleClass.test.ts`, `datePrecision.test.ts`, `packages/client/test/storage-version.test.ts` (one literal widened to satisfy the row's new field), `test/views.test.ts`. No `ARCHITECTURE.md`/`ROADMAP.md` change. No new export symbol. Nothing at the repo root was touched. |
> | **What I could not verify** | Node 24 (this environment is Node 22.22.2), Safari/iOS, and a real second user — all unchanged from previous passes. |
>
> **The status note below is superseded by this one** and is kept as the record of what was
> true at `7fb753c`.

> **Status: superseded — the KD-38 / absent-`ownerId` pass** (`master`, after `f26905d`). Two
> routed fixes, both disclosed by the I-0…I-4 pass below, and nothing else. I-5 … I-11 untouched.
>
> | | |
> |---|---|
> | **Fix 1 — KD-38, closed** | `PastTripForm` now requires **at least one city** and assigns the trip's **first** city to **every** day it mints, through the existing `setDayMeta` action (one dispatch per day, `{primaryCity, cities:[key]}`). Before this, `ensureDays`' `primaryCity:'transit'` catch-all meant a recorded "past trip to Japan" had **zero** city-bearing days and I-6's `cityKeys` widening would find nothing on the trips 2a exists to record. No new action, no reducer logic, no city-editing UI: the days are all the one city and any of them can be re-pointed later in the ordinary editor. `createTrip`'s existing name-only city collection is followed exactly — no coordinate input was added, so a city centre is still `createTrip`'s `{0,0}` default on **both** the new-trip and past-trip screens (**KD-39**). |
> | **Fix 1, what it did to criterion 3** | KD-38's disclosure was that criterion 3 *"a past trip is silent"* **still passed with the §8.2 gate deleted**, because transit days silence `missing_lodging` on their own. It does not any more: with the gate line deleted, `packages/client/test/past-trip.test.ts` fails **2 of 6** — criterion 3 itself, and the ceiling half. Verified by deleting the line, running, and restoring it. |
> | **Fix 2 — the absent `ownerId`, closed** | `fromJSON` threw `TripParseError: expected a string (at $.ownerId)` on a document with no `ownerId`, which §2.14 rule 1 says is an **allowed** input class (*"neither the local user … **nor absent**"*). Two edits: the parser carries absence through as `''` (it may not invent an owner — core does not know who is signed in), and `store.importDoc` refuses only a **present, foreign** owner and adopts an ownerless document as the local user's. Reading and its justification: **KD-40**. |
> | **Fix 2, what did NOT change** | A document owned by a different real user is still refused with `ForeignDocumentError` — `packages/client/test/store.test.ts`'s existing refusal test is untouched and green, `qa/prov.mjs` is 0 FAIL, and a **non-string** `ownerId` (`42`) still fails the parse with the `$.ownerId` path. §2.14's other rules were not touched. |
> | **Numbers, my own runs** | `npm run typecheck` clean (both projects). `npm run test:tap` **479 pass / 0 fail** (was 472; +7). `npm run web:build` clean. |
> | **QA probes, before → after, both extended not replaced** | `qa/r2-import.mjs` **1 FAIL → 0**. `qa/p2-pasttrip.mjs` in real Chromium **0 FAIL → 3 FAIL** with the three new city assertions added and the form unchanged (the RED), then **0 FAIL** with the fix — and its criterion-3 §3 (Conflicts and Validation both unbadged, both panels empty) still reads zero **with** the city assigned. `qa/baseline.mjs` 0 FAIL, `qa/accept.mjs` 0 FAIL, `qa/prov.mjs`, `qa/r2-copy2.mjs`, `qa/r2-redact.mjs` 0 FAIL. `qa/r5-freshness.mjs` is **4 FAIL, unchanged** — R5-2 ×2 and the two null-actor findings, none of them mine and none touched. |
> | **Files** | `apps/web/src/views/PastTripForm.tsx`, `packages/core/src/serialize/fromJSON.ts`, `packages/client/src/store/store.ts`, plus tests: `packages/core/test/serialize.test.ts`, `packages/client/test/store.test.ts`, `packages/client/test/past-trip.test.ts`, `test/views.test.ts`, and `qa/p2-pasttrip.mjs`. No `ARCHITECTURE.md`/`ROADMAP.md` change. Nothing at the repo root was touched. |
>
> **The status note below is superseded by this one** and is kept as the record of what was
> true at `f26905d`.

> **Status: superseded — Phase 2, increments I-0 … I-4 (2a: past trips and the trip lifecycle).**
> `master` @ `a55634f`+. Scope was exactly I-0 through I-4; nothing from I-5 onward was touched.
>
> | | |
> |---|---|
> | **I-0 — probe repair** | Sixteen `qa/` probes repaired in place, none deleted. Seven had **crashed** and had not executed past their first bad line for several rounds (`attack3` `updateStop({placement})`; `attack8`/`confid` a `tgt` that §2.12 removed; `prov` `importDoc` of a foreign document now throwing by design; `r2-copy2`/`r2-import` `load()` returning `{doc,version}`; `r5-freshness` `core.accept` un-exported by R5-5). Nine asserted a contract the architecture had **deliberately changed** — see the table below. Every repair carries its reason at the call site. |
> | **I-0 — measured baseline** | `node qa/baseline.mjs` → **0 FAIL**, deriving all six numbers by running: `detectConflicts` at `FIXTURE_TODAY = 2026-08-01` is **2 blockers** (both `legacy_flag`, Aug 18 + Aug 20) / 4 warnings / 11 notes / 17 total; `geoCheck` clean is **0/112** scheduled stops and **0/94** places; under a +1° latitude fault injected one record at a time it is **112/112** and **92/94**, the two misses being `Blue Cave, Biševo` and `Stiniva Cove, Vis`. |
> | **I-1 — `lifecycle()`** | `packages/core/src/derive/lifecycle.ts`, pure, derived from `(trip, today)`, **no stored status field**. `endDate` inclusive; zero-day trip active on exactly that day; calendar day numbers, not string comparison. `cli.ts trip --today 2026-08-27` prints `[completed]`. **Export surface 70 → 71, counted not quoted** — §2.10, ROADMAP criterion E and `surface.test.ts` all moved in the same commit. |
> | **I-2 — `Trip.datePrecision`** | `'exact' \| 'month' \| 'year'`, default `'exact'`. `types.ts` + `createTrip` + `TripMetaPatch` + `toJSON` (fixed key order, always written) + `fromJSON` (rejects anything else, with a JSON path) + `migrateDoc` (absent → `'exact'`). **No `schemaVersion` bump.** No new action — it rides on the existing `setTripMeta`. The greppable ceiling is a test: `datePrecision` may not appear under `conflict/`, `derive/` or `validate/`, and must appear in the five files §8.1 names. |
> | **I-3 — rule `class` + the feasibility gate** | All ten rules classified per §8.2's table. `subjectDate(trip, ref)` and the gate itself in `detect.ts`, **once** — a feasibility finding is dropped iff `ctx.today` is present and **every** subject resolves to a date strictly before it. §8.2 revision 10's three edge rulings each have a named test. |
> | **I-4 — the past-trip flow, and 2a ships** | `apps/web/src/views/PastTripForm.tsx` (title, precision, dates, cities — no day-by-day required), lifecycle chips in `Library.tsx` and `TripView.tsx`, and a range label that reads *"March 2019"* rather than two exact days the user never claimed. Dispatches **`createTrip` + `setTripMeta` and nothing else**, asserted by grep. The closed list of six document-installing store methods is still six (`retirement-ledger.test.ts`'s existing ceiling, unchanged and green). |
> | **Numbers, my own runs** | `npm run typecheck` clean (both projects). `npm run test:tap` **472 pass / 0 fail** (was 432 at `8df2ae6`; +40 new). `npm run web:build` clean. `node qa/baseline.mjs` 0 FAIL. `node qa/accept.mjs` **28 pass / 0 fail** (was 23/4). |
> | **Browser leg, real Chromium** | `qa/p2-pasttrip.mjs` → **0 FAIL**, 30 assertions. Records "Japan, March 2019" as a user; asserts the **persisted IndexedDB document** (31 dense days over the stored range, `Day.id === Day.date`, zero stops, `datePrecision:'month'`, `schemaVersion` still 1, exactly one document installed); both lifecycle chips; criterion 3 on screen (Conflicts and Validation tabs both unbadged, both panels empty); and the injected fault on the real fixture — Europe 2026 at the real clock shows **no feasibility rule at all**, then with the browser's `Date` pinned to 2026-08-19 the same document shows `missing_lodging` ×2 and `unbooked_ticketed` ×2 back, with no wholly-past feasibility finding. |
> | **Red/green, verified** | The I-3 gate: deleting the one gate line fails 3 of `ruleClass.test.ts`'s 10. The I-2 field: deleting `datePrecision` from `toJSON` fails 3 core and 1 client test. Both restored and re-run. **A first draft of the straddling test passed with the gate deleted** — `unbooked_ticketed`'s own 60-day horizon was doing the work — and was rewritten onto `missing_lodging`, which has no horizon. |
> | **New KD entries** | **KD-37** (`lifecycle`'s parameter is `Pick<Trip,'startDate'\|'endDate'>`, not `Trip`, so `Library` can call it per summary row rather than growing a second implementation) and **KD-38** (criterion 3's zero is partly `ensureDays`' transit days, not only the gate — and the open question of whether the past-trip form should assign the trip's city to its days). Both need an architect's eye; neither is a behaviour change. |
> | **Not touched** | I-5 … I-11. No country attribution, no `travelStats`, no `TripSummaryRow` widening, no Map/Profile, no participants. No `ARCHITECTURE.md` change beyond §2.10's export count. |
>
> ### I-0's probe board — one line per repair
>
> | Probe | Was | Repaired to | Reason |
> |---|---|---|---|
> | `r6-flush.mjs` §6 | 1 stale FAIL | PASS | `/^\s*saving = (?!saving)/` matched `chainOntoSaving`'s own `saving = run;` — it reported R3-3 open against the fix that closed it. Now: exactly one assignment, and it is that one. |
> | `r7-chain.mjs` static + §11 | 2 FAIL | 0 FAIL | Two hardcoded counts. `chainOntoSaving(` also matched a doc comment, and the expected 3 became 4 when R7-3 put `deleteTrip` on the chain. `ports.storage.delete` likewise counted two comment mentions, and *"delete is NOT on the chain"* is now false — the claim is **inverted** to the one the product makes. |
> | `r5-freshness.mjs` | crashed at `:602` | runs, 71 ok / 4 FAIL | §5.7 called `core.accept`/`friendImport`/`needsBadge`, all removed by R5-5 — the fix to the finding §5.7 filed. Reached by module path; §5.7a now asserts the un-export itself. The 4 FAILs are pre-existing (R5-2, and `fromJSON` accepting a null-actor accepted record — see below). |
> | `r2-copy2.mjs`, `r2-import.mjs` | crashed | 0 FAIL | `load()` returns `{doc, version}` since `3a124a2`; `save()` became `saveIfVersion()`. `r2-copy2`'s *"a copied Place carries provenance"* also asserted a design §2.13 A-6 explicitly rejected — inverted to the ceiling (`Place`'s shape does **not** change; the credit is on the linking stops). |
> | `attack3.mjs` | crashed at `:29` | 0 FAIL | `updateStop({placement})` now throws (§2.10: `moveStop` is the one function). Also `params.stopName` → `params.name`, and `stop_far_from_city` (DELETED, §2.9) → the ceiling that replaced it. |
> | `attack8.mjs` | crashed at `:19` | 0 FAIL | Targeted an `impossible_transfer` §2.12 took to zero. Also `updateStop({id})` now throws, and `rollUpCost(..., {homeCurrency})` was a typo for `{target}` — the probe was measuring its own mistake. |
> | `confid.mjs` | crashed at `:46` | 0 FAIL | Same `impossible_transfer` premise. Also asserted ROADMAP **revision 1**'s conflict-id criterion, which the current §C retracts **by name**; inverted. |
> | `prov.mjs` | crashed at `:79` | 0 FAIL | `importDoc` of a foreign document now throws `ForeignDocumentError` — the fix to the finding this probe filed. The claim is now stronger: a friend's document cannot get in at all, and nothing is installed as a side effect. |
> | `confid2.mjs` | 2 FAIL | 0 FAIL | Filed R2-7; R2-7 was fixed by `syncResolutions`, which the probe never called, so it reproduced the behaviour of a caller that opts out of the fix. Now recomputes the way `getDerived()` does. |
> | `accept.mjs` | 4 FAIL | 0 FAIL | Four stale ROADMAP revision-1 numbers: `12 blockers` → **2**; `2 bundled` → **3** (sequencing rule 5's own worked example); `1 error 30 warn` → **1 error 10 warn** (the 20 that went were `stop_far_from_city`); and `pool split` compared `JSON.stringify` of an object, so it was comparing **key order**. |
> | `attack2.mjs`, `attack5.mjs` | 2 + 4 FAIL | 0 FAIL | `stop_far_from_city` is DELETED not renamed (§2.9) and `params.stopName` became `params.name`. Inverted to the ceilings. |
> | `rules.mjs` | 1 FAIL | 0 FAIL | Filed the `closed` rule's *"no data path"*; the rule was **dropped from Phase 1** as a result. Asserting it fires re-reports a closed finding forever. Now asserts it is gone **and** that the premise (0 of 95 places carry `hours`) still holds. |
> | `r2-constraints.mjs` | 2 FAIL | 1 FAIL | The zero-dep check counted `packages/client`'s workspace-internal `{"@cairn/core":"*"}` — which installs nothing and is the dependency direction §3 **requires**. The remaining FAIL is real and **untouched**: `test/boundaries.test.ts`'s determinism grep walks `packages/core/src` only, and the constraint names *"core **or the reducer**"*. Disclosed, not in I-0–I-4's scope. |
> | `baseline.mjs` | — | NEW, 0 FAIL | I-0's deliverable: the six numbers, derived by running. |
> | `p2-pasttrip.mjs` | — | NEW, 0 FAIL | I-4's browser leg. |
>
> **FAILs that remain, and are real open findings — none of them mine, none repaired away:**
> `r10-redo` 3 and `r9-ledger` 2 (**R10-1**, MINOR) · `r7-r6recheck` 3 and `r6-flush` 1 (**R6-1/R6-2**, MINOR) ·
> `r8-geo` 1 (**R8-3**, MAJOR-but-unreachable) · `r8-persist` 1 (**R8-4**, MAJOR-but-unreachable) ·
> `r6-actor` 5 (round 6's non-string-actor `params` observation) · `r3-cas2` 3 and `r3-pool` 3 (round 3 MINORs) ·
> `r5-freshness` 4 (R5-2, plus two below) · `r2-constraints` 1 (above).
>
> **One NEW finding, surfaced by the repair and NOT fixed — it is outside I-0–I-4 and touches `importDoc`, which `cairn/CLAUDE.md` routes builder+breaker:**
> `qa/r2-import.mjs` now reaches its own §"the spec says an ABSENT `ownerId` is allowed (§2.14 rule 1)" and reports **1 FAIL**: `fromJSON` throws `TripParseError: expected a string (at $.ownerId)` on a document with no `ownerId`, while §2.14 rule 1 says a document whose `ownerId` is *"neither the local user … nor absent"* is what gets refused. Either `fromJSON` is stricter than §2.14 intends, or §2.14's *"nor absent"* is stale. **An architect's call, not mine.** `qa/r5-freshness.mjs` §5's last two FAILs are the adjacent question (`fromJSON` accepts an `accepted`, credited record with a `null` actor; `validateTrip` flags it, the parser does not).
>
> **The status note below is superseded by this one** and is kept as the record of what was
> true at `8df2ae6`.

> **Status: superseded — the A-7 pass.** One ruling (ARCHITECTURE §2.2a A-7, §4.2 rule 4a),
> implemented exactly as specified, for the one BLOCKER the Phase 1 gate re-review sent back
> (R11-1):
>
> | | |
> |---|---|
> | **A-7, resolved** | Two edits in `packages/client/src/store/store.ts`, both required, neither substitutes for the other. (1) `writeAndSettle`: immediately after `stillOurs` is computed, `if (!stillOurs && toWrite !== startedFrom)` sets `'conflict'`, upserts the library row from the write's own summary, and returns — no install, no fence advance, no re-arm. (2) `doMerge`'s merged-write link, at the top of the `chainOntoSaving` callback: `if (state.doc !== doc)` abandons the merge before even attempting the write, closing the wide half of the window (the storage read, the parse, `mergeTrips`, serialization, anything already queued) for free. |
> | **Regression** | Six tests in `merge-race.test.ts`, extending its existing `gatedStorage` harness with a `load()` gate (`parkLoad`) alongside the existing `saveIfVersion` gate, since the two gates open different halves of the window: the ordinary merge (ceiling — must still install), an edit during the write, an edit during the storage read, a write already queued ahead, the invariant asserted directly plus a second-press convergence, and the ordinary-autosave ceiling (both non-merge call sites are `toWrite === startedFrom` and must be untouched). Every assertion is on the bytes the port holds. |
> | **Numbers, my own runs** | `npm run test:tap` **432 pass / 0 fail** (was 426; +6 new). `npm run typecheck` clean. Red/green confirmed via `git stash` on `store.ts` alone: exactly the 4 tests that exercise the actual defect (cases 2, 3, 4, 5) fail without it; the ordinary-merge and ordinary-autosave ceiling tests correctly pass either way. The breaker's own `qa/r11-recheck.mjs` §1.3b/§1.3c re-run clean, unedited. |
> | **Scope** | `store.ts` and `merge-race.test.ts` only. No `qa/*.mjs`, no `ARCHITECTURE.md`/`ROADMAP.md`. R8-3, R8-4 and R10-1 untouched, as instructed — R8-4 was NOT folded in; the deleted-trip merge branch (a different `chainOntoSaving` link, a different question about `load()`'s trustworthiness after a delete) is unmodified. |
>
> **The status note below is superseded by this one** and is kept as the record of what was
> true at `c6c6e2b`.

> **Status: superseded — the R10-3 / R10-2 pass.** Two fixes for the two Phase 1-gating findings
> QA round 10 surfaced while independently re-verifying A-5b and A-6a — both applying an
> already-decided principle to a door it had not yet been wired into, not a new architectural
> call:
>
> | | |
> |---|---|
> | **R10-3 (BLOCKER), resolved** | `set()` now clears `history` (`past`/`future`) whenever a document arrives via `{reseed:true}` — the same "installed from outside this store's own dispatched edits" test A-5 already uses for the ledger, extended to the undo stack. The six document-installing transitions were already a no-op under this (they zero `history` themselves via `...initialState()`); `doMerge` was the one path that didn't, so a Ctrl+Z straight after a successful merge could restore a pre-merge snapshot and the autosave would write it over storage under the post-merge `savedVersion` — silently. |
> | **R10-2 (MAJOR), resolved** | `pruneOrphanedCopyPlace` (A-6a) is now also called from `updateStop`, keyed on the stop's state BEFORE the patch — the same four clauses, unchanged. `apps/web`'s `StopEditor` puts `place` in every patch, so typing coordinates into a copied stop swapped its `{kind:'place'}` link for an inline one with no `removeStop` in the trace; the orphan is now pruned there too. |
> | **Regression** | `store.test.ts`: the exact `qa/r10-mergeundo.mjs` sequence — disjoint edits, merge, one Ctrl+Z, checked in STORAGE, not just in memory. `geoCheck.test.ts`: re-pointing a copied stop's place prunes it; an unrelated-field patch never prunes; a user-authored re-point never prunes (even as the sole remaining linker); two copies (one survives, the second prunes); the real fixture end to end (2 blockers, not 3). |
> | **Numbers, my own runs** | `npm run test:tap` **426 pass / 0 fail** (was 420; +6 new). `npm run typecheck` clean. Red/green confirmed via `git stash` on both product files together: 4 of the 6 new tests fail without them (the other 2 assert pre-existing behaviour alongside the new). The breaker's own `qa/r10-mergeundo.mjs`, `qa/r10-prune.mjs` and (in real Chromium) `qa/r10-editdoor.mjs` all re-run clean, unedited. |
> | **Note found and fixed along the way** | The existing source-scan test (`A-5: reseed: true — the six document-installing transitions all pass it`) counts literal occurrences of `reseed:\s*true` across the whole file, including comments — my first draft of the R10-3 doc comment used that exact token twice in prose and tripped it (9 vs the expected 7). Reworded, not weakened; the test is untouched and still checking the same ceiling. |
> | **Scope** | `store.ts`, `stops.ts`, and their two test files only. No `qa/*.mjs`, no `ARCHITECTURE.md`/`ROADMAP.md`. R10-1, R8-3, R8-4 untouched, as instructed. |
>
> **The status note below is superseded by this one** and is kept as the record of what was
> true at `9ba5aec`.

> **Status: superseded — the A-5b / A-6a pass** (`master`, after `9ba5aec`). Two architect
> addenda, closing the two MAJORs QA round 9 found (R9-1, R9-2), and nothing else:
>
> | | |
> |---|---|
> | **A-5b — R9-1, resolved** | `redo()` releases the retirement ledger too, keyed off the document delta (a `conflictId`'s row count rising is exactly "the redone step was a `resolveConflict`"). `rowsFor` added next to `liveConflictIds`. `undo()` is unchanged, per the ruling. |
> | **A-6a — R9-2, resolved** | `removeStop` prunes the one `Place` a copied stop orphans — only when the removed stop was itself a copy, nothing else links the place afterward, and the place exists. Never a sweep; lives in `core.removeStop`, `Place`'s shape unchanged. |
> | **Regression** | `retirement-ledger.test.ts`: QA's six-action sequence (dismiss → retire → undo → dismiss again → undo → redo) is not stillborn, holds across further `set()`s; the ledger invariant checked at every step; `undo` confirmed to still release nothing. `geoCheck.test.ts`: the real-fixture four-click-plus-delete regression (2 blockers, not 3); a user-authored removal is never a sweep (guard, even when it is the place's only linker); two copied stops on one place (first removal survives, second prunes); `rejectCandidate` prunes nothing. |
> | **Numbers, my own runs** | `npm run test:tap` **420 pass / 0 fail** (was 412; +8 new). `npm run typecheck` clean. Red/green confirmed by `git stash`ing both product files together: 3 of the 8 new tests fail without them, all pass with them. |
> | **Scope** | `store.ts`, `stops.ts`, and their two test files only. No `qa/*.mjs`, no `ARCHITECTURE.md`/`ROADMAP.md`. |
>
> **The status note below is superseded by this one** and is kept as the record of what was
> true at `c9c274d`.

> **Status: superseded — the A-5a pass** (`master`, after `c9c274d`). One architect addendum,
> closing the one open objection (**KD-36**) the A-5/A-6 pass below disclosed and declined to
> work around, and nothing else:
>
> | | |
> |---|---|
> | **A-5a — KD-36, resolved** | The ledger veto: `liveConflictIds(doc)` in `store.ts`, consulted at **both** `marksOf` (reseed) and step 4 (absorb) — a `conflictId` may not be *acquired* from a document that still holds a live (`retiredAt === null`) row for it. Acquisition is vetoed; retention (an already-held mark) is untouched, so R8-1's undo behaviour is unchanged. |
> | **Regression, three cases per the ruling** | `retirement-ledger.test.ts`: a second dismissal (plain `resolveConflict`, no `unresolveConflict`) is not stillborn and survives a further edit; the same case survives a storage round-trip (`flush` → `closeTrip` → `openTrip`, i.e. reseed — the case a veto placed only in absorb would miss); R8-1 itself re-asserted unchanged. |
> | **Numbers, my own runs** | `npm run test:tap` **412 pass / 0 fail** (was 409; +3 tests, all new). `npm run typecheck` clean on both projects. Red/green confirmed by `git stash`ing the `store.ts` change alone: 2 of the 3 new tests fail without it (the R8-1 re-assertion test correctly still passes, since that path was never broken), all 3 pass with it. |
> | **Scope** | `store.ts` and its test file only. No other product code, no `qa/*.mjs`, no `ARCHITECTURE.md`/`ROADMAP.md`. R8-3 and R8-4 remain untouched, as instructed. |
>
> **The status note below is superseded by this one** and is kept as the record of what was
> true at `6d336f1`.

> **Status: superseded — the A-5 / A-6 pass** (`master`, after `6d336f1`). Two architect rulings
> from ARCHITECTURE revision 6, closing the two **user-reachable** MAJORs of round 8, and
> nothing else:
>
> | | |
> |---|---|
> | **A-5 — R8-1** | The retirement ledger. `reassertRetirements` is a new pure core function; `AppState.retired` is a per-trip, never-persisted, outside-`history` ledger; `set(next, {reseed})` is its one maintenance site; `resolveConflict`/`unresolveConflict` release the key. **KD-34.** |
> | **A-6 — R8-2** | A copy-borne `Place` — ≥1 linking stop, **all** of them `attribution() !== null` — is measured but never `'certain'`. Derived in `geoCheck`; `Place`'s shape does not change. **KD-35.** |
> | **Numbers, my own runs** | `npm run test:tap` **409 pass / 0 fail** (was **387 / 0** at `6d336f1`; +22 tests, all new). `npm run typecheck` clean on both projects. `npm run web:build` clean. |
> | **QA probes, before → after, unedited** | `qa/r8-persist.mjs` **2 FAIL → 1** (§3/R8-1 closes; §1/R8-4 is out of scope and still FAILs). `qa/r8-geo.mjs` **2 FAIL → 1** (§1/R8-2 closes; §2/R8-3 is out of scope and still FAILs). `qa/r8-undo.mjs` in Chromium **1 FAIL → 0**. `qa/r8-views.mjs` **0 FAIL**, `qa/r7-browser.mjs` **0 FAIL**. No `qa/*.mjs` script was edited. |
> | **Export surface** | **69 → 70.** `reassertRetirements` joins §2.10's conflict group; `surface.test.ts`'s one list and both length assertions are updated to match. |
> | **Out of scope and NOT fixed** | **R8-3** (the `adjacent_day` anchor is one representative chosen by position, so acceptance can *replace* it) and **R8-4** (`doMerge`'s off-chain `load()` resurrects a deleted trip). Both are named open findings, both still reproduce, and neither was touched. Everything else open in QA-FINDINGS' round-8 note is likewise untouched. |
> | **One objection to the ruling, reproduced and NOT worked around** | **KD-36** — A-5 as specified makes a *second* dismissal of a conflict that already carries a retired row stillborn. Read it before the next breaker pass; it is a behaviour change I chose to ship rather than redesign. |
>
> **The status note below is superseded by this one** and is kept as the record of what was
> true at `6d336f1`. §3 through §8 are as of that pass and are unrevised.

> **Status: superseded — gate-review SEND-BACK pass** (`master`, after `5bdd0dc`). This pass
> implements the manager's `REVIEW.md` routing **B-1 … B-7** and the architect's revision-5
> rulings **A-1, A-2, A-4**, and nothing else. Every one of the thirteen items has a `KD-`
> entry in §1 — **KD-23 … KD-33** are new and each names the item it answers.
>
> **§3 and §4 are regenerated.** §3's `apps/web` and `packages/client` rows claimed the credit
> line and `syncResolutions` while §6 caveated them away; both are now true of the product as
> well as of the code, and both rows say what changed. §4's *"231 pass"* table — stale since
> before round 2 — is **replaced**, not annotated: `npm run test:tap` is **387 pass / 0 fail**
> (was **333 / 0** at the reviewed `8a65a53`), `npm run typecheck` clean on both projects.
>
> **§5, §6, §7 and §8 are as of the earlier passes and are unrevised except where a bullet is
> struck in place.** §6's PoolPanel caveat is closed by KD-26 and marked so.
>
> **Two QA probes now report a stale assertion rather than a defect, and §4's probe table says
> which and why:** `qa/r6-flush.mjs` samples `status` 200 ms after the abort, by which time
> §4.2 rule 6a″ says the banner has correctly cleared; `qa/r7-chain.mjs` §static and §11 carry
> hardcoded counts of a structure that changed. Neither script was edited — probe repair is a
> commit of its own and it belongs to the breaker.
>
> **`qa/r5-freshness.mjs` §5.7 stays rotten and is still deliberately unpatched.** It has
> called the removed `core.accept` since round 5; §2.10 revision 5 also removes
> `friendImport` and `needsBadge`, which the same dead block references. Nothing observable
> changes — it already crashed one line earlier. KD-33.
>
> **Out of scope and NOT fixed, so nobody has to re-derive it:** everything on the review's
> *"What rides"* list (R5-3, R5-4, R3-6…R3-9, R2-13…R2-21, the five `r6-actor` residuals), and
> `acceptCandidate` is still reachable from no control in `apps/web` — an imported stop stays
> badged forever. That fails safe; §3's row now says so out loud instead of leaving it to be
> found.

> **Status, R3-3 pass (`master`, after round 6):** one finding only — **R3-3** is fixed and its
> row is appended to §5. `npm test` **333 pass / 0 fail** (was **331 / 0** at `584c218`; the two
> new tests are `packages/client/test/merge-race.test.ts`), `npm run typecheck` clean on both
> projects. `qa/r3-merge.mjs` now reports **4 ok / 0 FAIL** (round 6 recorded 2 FAIL) and
> `qa/r3-cas.mjs` probe **A** reports 3 ok (round 6 recorded it as FAILing in agreement with
> R3-3). **Neither script was edited** — both were already written to assert the fixed state,
> so they flip from FAIL to ok on their own. **R6-1, R6-2 and everything else open in round 6's
> status note were explicitly out of scope and are NOT fixed;** I did not re-run those probes.
> Everything below this line is as of the round-5 pass and is unrevised.

> **Status:** §1 (Known divergences) is current through **KD-21**, which includes the round-2
> fix for R2-3 (`b5c742b`). **§4 (Verified) predates round 2 QA** — it records the state after
> round 1's re-delivery ("231 pass") and was not regenerated. Don't read §4's numbers as
> current without re-running the commands in them.
>
> **§5 (Defects fixed) is current as of the round-5 fix pass** — **R5-1, R5-2 and R5-5** are
> added at the end of the table. Round 4's rows (R4-1, R4-2, the two other F2 violations, the
> R2-11 ruling, and the corrected R3-4 row) stand unchanged. Test count at this pass:
> **`npm test` 331 pass / 0 fail** (was 318 at `d97feed`), typecheck clean on both projects.
> §6's third bullet ("this is **not** a compare-and-swap at the storage layer") has been stale
> since `a746d75` and is struck in place.
>
> **R5-3 and R5-4 were explicitly out of scope for this pass and are NOT fixed.** So is
> everything else still open in `QA-FINDINGS.md`'s round-5 status note.
>
> **One probe is now rotten because of the R5-5 fix, deliberately not patched:**
> `qa/r5-freshness.mjs:602` calls `core.accept(...)` unguarded and now crashes with
> *"core.accept is not a function"*, which is the finding's own remedy taking effect. Its §5.5
> check (*"core.accept(p, at, null) refuses a missing actor"*) reports `ok`. Editing the
> tester's script is not a product change and is not smuggled into a fix commit — the same
> ruling the round-5 note applies to `qa/r2-copy2.mjs` and `qa/r2-import.mjs`.

For the breaker and the manager. What is built, how to run it, what is stubbed, what I
could not verify, and — first, because it is the thing that went wrong last round —
**every known divergence from the contract**.

> **Read §1 first.** A source comment is not a disclosure. Every "see BUILD-NOTES",
> "objection", "artifact" or "the roadmap says X but" in `packages/*/src`, `packages/*/test`,
> `apps/web/src`, `cli.ts` and `tools/` cites a `KD-n` entry in §1 by number, and
> `npm test` fails if a citation has no entry or an entry has no home. That check is
> `cairn/test/disclosure.test.ts`.

---

## 1. Known divergences from the contract

Every entry is a place where the shipped code does **not** do what `ARCHITECTURE.md` or
`ROADMAP.md` says, or does it in a way whose consequences are not obvious from the spec.
Each says what it is, why, what it costs, and who has to decide.

### KD-1 — `impossible_transfer` now reads `travelRole`, and the Aug 18 case was never real

`packages/core/src/conflict/rules/impossibleTransfer.ts`

Revision 1's objection is **resolved** by §2.12 and this entry now records the outcome, not
the complaint. `Stop.travelRole` says what a stop's `time` and `arrival` mean: `'transfer'`
→ blocker, `'unknown'` → the same arithmetic as a warning, `'journey'` → the rule does not
run. Measured: 4 blockers → **0 blockers and 0 warnings**.

**The one thing worth reading twice:** all four of revision 1's hits were artifacts,
*including the Aug 18 05:00-checkout → 05:30-bus case that the review, the QA pass, my own
BUILD-NOTES and the note to Jacob all called the single real transfer defect.* The bus
departs 05:30, runs 40 minutes, reaches PRG at 06:10, and the flight is 07:30. Four reports
agreed on a number none of them had checked the semantics of. The tightest remaining margin
on any `'transfer'` stop is 7 minutes (Aug 14, Skradin bus stop → ticket office), and
`conflict.test.ts` asserts that number so it cannot drift quietly.

The two recorded constraints both hold: `computeLegs` still reads only `arrival` (leg parity
is byte-identical on all 16 days), and the importer derives the field from `move.mode` +
`cat` for 102 of 112 stops, with the other 10 becoming `'unknown'` rather than a guess.

### KD-2 — `geo_outlier` is now a thin publisher over `geoCheck`

`packages/core/src/conflict/rules/geoOutlier.ts`, `packages/core/src/derive/geoCheck.ts`

Also **resolved**, by §2.13. There is one implementation of coordinate-to-anchor distance in
core and `geo_outlier` is its only consumer; `validateTrip.stop_far_from_city` is deleted
outright, not folded. Every coordinate is measured to the nearest point in the trip's own
declared geography — city centres of the day's cities, `Trip.homeBase`, other stops that
day, the adjacent-day boundary — rather than to `day.primaryCity`.

Measured here, and every number in §2.13 reproduced exactly:

| | clean trip | +1° latitude injected on each record in turn |
|---|---|---|
| scheduled stops | 0 findings / 112 | **112 caught / 112** |
| places | 0 findings / 94 | **92 caught / 94** |

The two permitted misses are `Blue Cave, Biševo` and `Stiniva Cove, Vis`, named in §2.13 and
named in `geoCheck.test.ts` so a third would fail the run. The Fisherman's Bastion typo
fires at 109.5 km with exactly one blocker naming `place-68`. Revision 1's rule saw none of
this: 27 conflicts before the typo and 27 after.

`validateTrip` drops from 31 issues to 11 as a consequence.

### KD-3 — day-cost parity is **6 of 16**, not 16 of 16, and §2.6 requires that

`packages/core/test/derive.test.ts`, `packages/core/src/derive/cost.ts`

ROADMAP's acceptance criterion reads *"`rollUpCost(day)` reproduces the live app's
`dayCost()` string for all 16 days"*. **It reproduces 6.** The criterion and ARCHITECTURE
§2.6 contradict each other, and §2.6 is right: it exists precisely to stop the live page's
four money defects being carried forward. Reproducing `dayCost()` on all 16 days would mean
reproducing those defects.

All ten divergences, classified — and the test now proves each classification against the
data instead of citing this file and moving on:

| Day | Core | Live page | Why |
|---|---|---|---|
| 08-09 | ≈ €35–48 | ≈ €20–48 | `split_product` — "Gardens free · palace €15–24" is two products; `c:[0,24]` is one |
| 08-13 | ≈ €15–25 | ≈ €175–185 | `multi_currency` — "$159.98pp" stays USD instead of becoming `c:[160,160]` |
| 08-14 | ≈ €88–92 | ≈ €88–93 | `c_pair_vs_display` — a €14.49 fare carries `c:[14,15]` |
| 08-15 | ≈ €21–31 | ≈ €25–35 | `multi_currency` — ~100 CZK stays CZK |
| 08-16 | ≈ €15–20 | ≈ €37–42 | `multi_currency` — ~550 CZK stays CZK |
| 08-17 | ≈ €95–130 | ≈ €113–148 | `multi_currency` — ~450 CZK stays CZK |
| 08-18 | ≈ €63–94 | ≈ €67–98 | `multi_currency` — ~100 CZK stays CZK |
| 08-19 | ≈ €62–80 | ≈ €630–658 | `per_party_basis` — "$573.25 total" is a party total for 5, in USD |
| 08-21 | ≈ €7 | ≈ €30–47 | `multi_currency` — London GBP stays GBP |
| 08-22 | (no EUR) | ≈ €57–84 | `multi_currency` — the day has no EUR amount at all |

**The code is right and the criterion is wrong.** The architect is restating the criterion.
Nothing in the code changes.

### KD-4 — the ticket census is **7 ticketed, 3 bundled over 2 files**, not "2 bundled"

`packages/core/test/import.test.ts`

ROADMAP says *"7 stops carrying a Ticket, **2** of them `kind:'bundled'`"*. The import
produces **3** bundled stops over **2** distinct files: both FlixBus legs of the
Split↔Skradin return share `tickets/flixbus-split-skradin-3384415948.pdf`, and the
Dubrovnik→Split leg has its own PDF. Three stops, two files. The criterion counts files;
the model counts stops, and stops are what the UI renders a badge on.

**The previous BUILD-NOTES reported "7 tickets (2 bundled)" under "Verified, by running it",
and the repo's own `import.test.ts` asserted 3 at the same time.** That is the disclosure
failure this section exists to prevent, and it is why the count below is now shown with its
breakdown attached.

### KD-5 — the `closed` rule is deleted (doc-only: the file no longer exists)

`packages/core/src/conflict/rules/closed.ts` — **deleted this round.**

Revision 1 shipped the rule with a fixture case that does not exist. **0 of 95 places carry
`hours`**, §2.11's mapping table has no `hours` row, and no stop named Naschmarkt exists in
the source; the "coverage" was a synthetic test constructing the only input that could ever
reach it. §2.7 now drops the rule from Phase 1 and it returns in the phase that has an hours
source. `Place.hours` stays in the type.

Recorded here rather than quietly removed because a rule that reads as coverage and is not
is the same failure mode as a count that reads as a result and is not — and this one sat in
a source comment for a whole round.

### KD-6 — `compareStops` is never applied destructively to an existing day

`packages/core/src/build/stops.ts`

§2.4 specifies stop ordering as `(timeVal(time), order)` ascending. The implementation uses
that comparator when **inserting** a stop and never re-sorts a day that already exists,
because Jacob can drag stops into an order that contradicts their times and §2.4 says that
must survive. The two statements are consistent, but only if you read the second sentence:
`day.stops` array order is canonical and `placement.order` mirrors the array index. A reader
who sees "ordering is by time" and applies `compareStops` to a loaded day will silently undo
a drag.

### KD-7 — the map min-span guard moved into core, so the view arithmetic is gone

`packages/core/src/derive/cluster.ts`

§2.5 says the min-span guard "moves into core"; it lived inside `applyDayFit()` in the live
page's view layer. Consequence worth stating plainly: `mapBounds` returns a box that has
**already been widened to `MIN_SPAN_KM` (1.2 km)** and reports `clamped: true` when it did.
A port that applies its own minimum on top will double-clamp. `apps/web`'s Leaflet port
therefore does no bounds arithmetic at all, which is the point — `CLAUDE.md` records that
both live map bugs came from view-layer map maths.

### KD-8 — `booking_vs_plan` has a 30-minute time tolerance that §2.7 does not mention

`packages/core/src/conflict/rules/bookingVsPlan.ts`

A stop is often timed for boarding or check-in rather than departure — the Danube cruise
boards at 19:10 for a 19:30 sailing and the voucher says arrive 20–30 minutes early. With no
tolerance this rule is a blocker on ordinary, correct data and would be switched off within
a day. `BOOKING_TIME_TOLERANCE_MINS = 30`. **Dates never get a tolerance.** This is a
builder's judgement inside a spec that did not anticipate the case; it should be either
blessed or replaced with a number the architect picks.

### KD-9 — `mergeTrips` is on core's export surface and is not in §2.10

`packages/core/src/merge/mergeTrips.ts`, `packages/core/src/index.ts`

§2.2's authority table promises **"last-writer-wins per stop with a revision guard"** for
`Trip`/`Day`/`Stop`. Phase 1 shipped neither half, which is F-1: two tabs on one trip
destroyed each other's edits and the losing tab said "Saved". The guard is a compare-and-set
in `packages/client/src/store/store.ts`. The resolution is `mergeTrips`, a pure three-way
merge in core — merging documents is domain logic, and putting it in the client would have
meant `apps/mobile` re-deriving it later.

§2.10 says core re-exports *"exactly this and nothing else"* and `mergeTrips`,
`mergeLostData` and `describeMerge` are not on that list. (Neither are 64 other symbols —
F-14, architect.) Flagging it rather than hiding it inside the client.

**A refusal alone would not have been enough.** The manager's routing said "refuse the write
and surface it"; that is implemented, for the case where there is **no common ancestor** to
merge against. But refusing every concurrent write would leave §2.2's sentence half built
and would still lose tab B's work in the ordinary two-tab case, so the merge is there too.
If the architect wants refuse-only, deleting the `mergeTrips` call in `save()` leaves the
guard intact.

### KD-10 — `persistence.lastMerge` is additive to §4.2's `AppState`

`packages/client/src/store/reducer.ts`

§4.2 fixes `persistence: { savedRevision, status: 'idle'|'saving'|'error', lastError? }`. A
merged save is neither an error nor silent, and there is no in-contract place to put "this
trip was edited elsewhere while you were working; here is what I kept and what I overrode".
Added `lastMerge?: { message, report }`, cleared by `store.clearMergeNotice()` and by
switching or closing a trip. `status` is untouched and still one of the three specified
values.

### KD-11 — `Import JSON` is restore-my-own-export only, decided by Jacob, not by §2.10

`packages/client/src/store/store.ts`

`importDoc`'s doc comment promised that an import never overwrites an existing trip, and
then checked the boot-time in-memory `state.library` instead of storage, so an import from a
stale tab wiped a stored trip (F-2). Both halves are fixed: the collision check reads
`ports.storage.load(doc.id)`, and a document whose `ownerId` is not this user's is
**refused** with a visible message.

The refusal is Jacob's decision, relayed through the manager: import is backup/restore of
his own exports; friends build their own itinerary and copy individual activities across,
which is Phase 2. **The architect is writing the formal contract into §2.10/§4.5 and it may
supersede this.** If it says "adopt and badge", the `imported` badge already exists in
`packages/tokens/src/index.ts` and in `DayTimeline.tsx`; nothing currently produces the
state, so no badge machinery has to be built, only switched on.

### KD-12 — the calendar guard is on `createTrip`/`setTripMeta`, not on `fromJSON`

`packages/core/src/build/createTrip.ts`, `packages/core/src/model/ids.ts`

F-11: `createTrip({startDate:'2026-13-45'})` used to yield a 2-day trip starting 2027-02-14
that validated clean, because the guard checked the shape and `Date.UTC` rolled over.
`isIsoDate` now validates the calendar and is the single date validator in core.

**A document can still arrive through `fromJSON` with `"startDate":"2026-02-30"`.**
`fromJSON`'s enum and numeric-domain validation is absent generally (F-12: it accepts
`"category":"nuclear"` and `"lat":1e999`), which is deferred; the date domain is part of
that same gap and I did not widen the fix into it unasked. `validateTrip` has no
`invalid_date` code, and adding one is an addition to §2.9's issue list.

### KD-13 — `apps/web`'s stubs

`apps/web/src/views/Library.tsx`

Duplicate and rename are stubbed, which ROADMAP permits. So is the city map: `cityMapPoints`
exists and is tested, but no view mounts it, and the Places panel is a list. Drag-reorder is
↑/↓ buttons. The new-trip wizard is title + dates + a comma-separated city list. All four are
explicitly allowed to be stubbed; they are listed here as well as in §5 so the two lists
cannot drift.

### KD-14 — `fixtures/golden/core-*.json` are self-snapshots, not independent goldens

`tools/gen-golden.mjs`

`legacy-*.json` is generated by executing the **live page's own** `haversine`, `legBetween`,
`dayCost`, `clusterStops` and `focusCluster` inside a `node:vm`. Diffing against those is a
real check. `core-*.json` is this code's own output, recorded. A `core-*` golden proves
*nothing changed*; it cannot prove *anything is right*. `core-conflicts.json` in particular
records 12 blockers, and KD-1 and KD-2 are why 9 of them are noise. The file's own header
says this; it is repeated here because a number read out of it landed in a report as a
result.

### KD-15 — a journey does not overlap the journey that immediately follows it

`packages/core/src/conflict/rules/overlap.ts`

§2.12 says a `travelRole:'journey'` stop occupies `[time, time + arrival.mins)` for
`overlap`, even with `durationMins` null. Taken literally that puts **one warning on the
reference trip**: Aug 21, BA863 departs Budapest 12:55 and runs 165 minutes, and the next
stop is 15:15 in Windsor. §2.7 requires `overlap` to return 0 on that trip, and §2.12 itself
identifies that exact pair as a **CEST → BST timezone artifact** — the reason
`journey_overrun` is deferred to Phase 4. Reporting it under a different rule id would ship
the artifact the deferral exists to avoid.

So: a journey's *derived* occupancy is not compared against an immediately-following stop
that is itself a `'journey'` — the itinerary continuing at the destination, on the
destination's clock. Anything else scheduled inside the run still fires, and
`conflict.test.ts` asserts both halves. **This is a narrowing of §2.12's overlap row that
the architect did not write.** If it is wrong, the fix is one `continue` and a golden.

### KD-16 — ROADMAP C's injected-fault criterion names a stop that cannot show the fault

`packages/core/test/conflict.test.ts`

*"Set `travelRole:'transfer'` on the Aug 8 Condor DE4345 stop and `impossible_transfer` fires
as a blocker."* **It does not, in any role.** DE4345 departs 14:30 against a 13:00 previous
stop and runs 80 minutes: the gap already exceeds the journey by 10 minutes, so the rule is
silent whichever role the stop carries. It is one of the 25 stops §2.12 itself describes as
"silent only because the printed clock gap happens to exceed the journey time".

The mechanism the criterion is reaching for is real, so the test asserts it on a stop where
the flip **is** observable — Aug 7, Condor DE2081, a 660-minute flight in a 120-minute gap,
blocker as `'transfer'`, warning as `'unknown'`, silent as `'journey'` — and then asserts
that DE4345 is silent in all three roles, so the criterion's own stop is covered too and the
reason is written down. Architect: restate the criterion against DE2081.

### KD-17 — the redaction pattern for booking references does not require a digit

`tools/redact.mjs`

§6.6 words one pattern as *"any 6+ character uppercase-alphanumeric token **containing both
letters and digits** (`YZGDTS`, `IU1TUY`, `D8WQHO`)"* — and `YZGDTS` contains no digits. The
examples win: a six-character all-caps booking reference is exactly the shape being
protected, and requiring a digit would have let `YZGDTS` — **one of the five strings the
review found in the bundle** — straight through the rule written to catch it.

Shipped as `\b[A-Z0-9]{6,}\b`. The cost is that a 6+ letter ALL-CAPS word in prose is
redacted too; on the reference trip that is **0 strings**, and `test/redact.test.ts` asserts
both that every fixture is fully redacted and that six pieces of ordinary prose survive
untouched, so the trade is measured rather than assumed.

Two smaller departures in the same file, for the same reason — a pattern that fires on
structure rather than credentials is a pattern that gets switched off:

- the keyword pattern's separator excludes a bare hyphen, so the structural id `booking-16`
  is not mistaken for a reference;
- it is split in two (`keyword_token`, `keyword_digits`) so *"the booking is done"* and
  *"Booking recommended in summer"* survive while *"PIN BGXw"* and *"Booking 338 441 5948"*
  do not. Both halves carry their own fixture, per §6.6's "a pattern that catches nothing is
  itself a failure".

### KD-18 — three source COMMENTS were shipping booking references, and `sourceDoc` is dropped

`packages/core/src/build/bookings.ts`, `conflict/rules/supersededBooking.ts`,
`conflict/rules/unverifiedReference.ts`, `tools/redact.mjs`

Two findings that only appear once the §6.6 bundle check is actually run, both worth
recording because neither is in any report:

1. **The check must include `.js.map`.** A sourcemap embeds `sourcesContent`, so a booking
   reference sitting in a *source comment* ships in the build artifact exactly as surely as
   one in the data. Three comments named `YZGDTS`, `IU1TUY` and `I54C9A` to explain their
   own fixture cases; all three are reworded, and the test greps maps as well as scripts so
   a fourth cannot creep back. Nothing about the rules changed.
2. **`Booking.sourceDoc` is dropped from the redacted sample.** It holds `docs/BOOKINGS.md`,
   which is not a credential — but `BOOKINGS` matches the all-caps pattern of KD-17, and the
   alternative was to exempt a key from the "no string matches any pattern" criterion. A
   provenance breadcrumb pointing at a file that is not deployed is not something the sample
   needs, so dropping it keeps the criterion literal instead of carved out. **The real trip
   keeps it** — redaction never touches `importLegacyDays` output.

### KD-19 — core exports 112 runtime symbols against §2.10's 50, and the gap is enumerated not narrowed

`packages/core/src/index.ts`, `packages/core/test/surface.test.ts`

§2.10 says the index re-exports *"exactly this and nothing else"* and ROADMAP E asks for set
equality in both directions. **The first half is met and the second is not.** Every symbol
§2.10 names is exported (asserted). But 62 more are exported besides, and this round did not
narrow them — it enumerated them.

`surface.test.ts` carries two lists: §2.10 transcribed, and `BEYOND_2_10`, which names every
extra symbol **with the caller that needs it, one line each**. A symbol added to the index
without appearing in one of the two fails the build; a listed symbol that stops being
exported fails too; and the size of the gap is asserted so it cannot drift.

Six of the 62 are marked `INTERNAL` and should simply become private: `canonical`, `digest`,
`makeConflict`, `conflictId`, `blankDay`, `toDoc`. The other 56 are things the client, the
CLI or the views demonstrably call — `fmtMins`, `issueCounts`, `orderedCities`, `haversine`,
`isIsoDate`, `effectiveRole` and so on — which is the same finding F-14 made and the
architect answered by widening §2.10 to 50. **50 is still short of what the client uses.**

**Why enumerated rather than narrowed:** cutting 62 exports at the end of a session means
rewriting the import site of every test and every view, with the failure mode being a
green suite that no longer tests through the public surface. The enumerated list gives the
manager the thing the criterion was actually for — a reviewable, line-by-line account of the
leak that cannot grow silently — and leaves the cut as one mechanical change against a test
that already knows the answer. **This is a criterion partially met, and it is reported as
partially met.**

### KD-20 — `copyStopInto` was redacting the structured credentials and copying the same class of credential as prose

`packages/core/src/build/copyStop.ts`, `packages/core/src/build/redactText.ts` (new — moved
out of `tools/redact.mjs`, which now imports it), `packages/core/test/copyStop.test.ts`

QA round 2's worst finding, confirmed by the coordinator independently before routing here.
Rule 3 already drops `bookingId` and refuses to let a `Ticket` travel, in as many words
because a booking reference and a ticket URL are access credentials (§6.6). Rule 5 then
copied `note` verbatim — and Jacob's door PINs and booking confirmations live as prose
inside notes, not in structured fields, so the exact class of information rule 3 protects
crossed the trip boundary through rule 5. Reproduced by `qa/r2-copy.mjs` section H: copying
the Habyt Vienna stop carried `"conf 5814731574, PIN 0754"` into the target trip's note.

**Fix:** the pattern set that already existed for build-artifact redaction (§6.6) is the
right tool — a booking confirmation and a door PIN are exactly what it was written to catch.
It has moved to `packages/core/src/build/redactText.ts` so both callers share one
definition of "credential-shaped": `tools/redact.mjs` now imports and re-exports it rather
than defining its own copy, and `copyStopInto` runs a copied stop's `note` through it before
the stop exists in the target trip. `name`, `category`, `flags`, `durationMins`, `arrival`
and `travelRole` are unchanged — they describe a place and a journey, not a claim about the
user, and are not where the leak was.

No exposure existed — Phase 1 has no second user, so there was nobody to leak to — but this
is the mechanism Phase 2's real sharing runs on unchanged, which is why round 2 routed it as
a blocker rather than a note for later.

**Not addressed here, and worth the architect's attention regardless:** round 2 also found
`PoolPanel` renders a copied stop's badge without calling `attribution()`, which is rule 7
("every view that renders one renders the other") failing on its own terms — a display gap,
not a leak, and out of scope for this fix. *(Closed later, in the SEND-BACK pass — KD-26.)* And the redaction pattern set is still the fixed
list KD-17/KD-18 describe, not a broader mechanism; sharing the definition closes the
note-field leak specifically without closing that gap.

### KD-21 — moving `redactText` into core shipped its own rationale strings to the browser

`packages/core/src/build/redactText.ts`

Caught in the same pass as KD-20, before it was pushed, by rebuilding and grepping the
bundle the way QA round 2 did. Each pattern in `REDACTION_PATTERNS` originally carried a
`why: '...'` string for documentation — one of them was `'A 6+ character all-caps
alphanumeric token: YZGDTS, IU1TUY, D8WQHO, 3379864687.'`, using the real leaked references
as the example. That was harmless while the module lived only in `tools/redact.mjs`, a
build-time-only script never bundled for the browser. Moving it into `packages/core` for
KD-20 changed that: `apps/web` bundles core, so the string became runtime data shipped to
every visitor, and `npm run web:build` proved it — `YZGDTS`, `IU1TUY` and `5814731574` were
all present in `dist/assets/index-*.js`, none of them inside a comment.

**Fix:** `why` is a comment on each pattern now, not a field. Nothing reads `.why` at
runtime (checked — zero references outside this file before the change), so nothing was
lost by making it non-data; minification strips comments, so it does not reach the bundle.
The lesson generalises past this one file: **a rationale string is exempt from bundle
scrutiny only while its module is provably build-time-only, and that exemption silently
expires the moment something in `packages/core` or `apps/web` imports it.**

### KD-22 — the page-exit handlers live in `packages/client`, not `apps/web`

`packages/client/src/store/pageExit.ts`, `apps/web/src/App.tsx`

§4.2 rule 6 says *"`apps/web` registers `visibilitychange` → `hidden` and `pagehide` … and
registers a `beforeunload` handler"*. It does — `App.tsx` calls `registerPageExit({ win:
window, doc: document, … })` — but the handler *logic* sits in `packages/client`, taking its
two event targets as arguments and touching no DOM type.

Why, in one sentence: **§3's dependency-direction test forbids anything importing `apps/web`,
so a module that lives there cannot be tested**, and ROADMAP F asks for exactly that test
("assert the listeners are registered and that the visibility handler calls `flush()`"). The
first attempt did put it in `apps/web/src/pageExit.ts` with a root-level test, and
`test/boundaries.test.ts` correctly failed the run.

**Cost:** none that I can see — it does not violate "`packages/client` never touches the DOM
or React" (there is no DOM type in the file, only a two-method structural type), and
`apps/mobile` will want the same dedupe logic against `AppState` rather than
`visibilitychange`. **If the architect disagrees, the move back is one file and one import**,
and the test goes with it — but then the criterion loses its test and should say so.

### KD-23 — `geoCheck` gives a copied stop no anchors, in both directions

`packages/core/src/derive/geoCheck.ts`

§2.13's anchor table gained a row in revision 5 and this implements it. Two halves, and the
second is the one that is easy to get backwards:

1. **A record `copyStopInto` produced is measured but never `'certain'`.** Copying "Arrive
   LAX" into a Lisbon trip produced `geo_outlier: 9140 km, certain` — a blocker on the
   phase's newest primitive, seconds after a human deliberately asked for that record to be
   there. §0.5 governs. `km` and `nearest` are still measured, so a view can say how far it
   is; `geo_outlier` publishes neither `'unanchored'` case.
2. **An un-accepted copy is not an anchor for anything else.** An anchor asserts *"the
   trip's geography includes this point"*, and a candidate the user has not accepted is not
   yet part of the plan — letting one in would let it **suppress a real blocker** on a stop
   the user wrote themselves. Once accepted it joins the anchor set, and that direction
   matters: acceptance only ever *adds* anchors, so it can only ever remove a blocker,
   never create one.

**The known blind spot, restated because it is deliberate:** a coordinate typed *into* a
copied stop after the copy is invisible, because the row keys on `attribution(stop) !== null`
and not on `provenance.state`. Keying on state would make the same document produce different
conflicts either side of a provenance transition. §2.13 rates a named blind spot above a rule
that mints unexplained blockers.

**`Place` gets no row and needs none** — it carries no `provenance`, so a copied place is not
identifiable as one, and both outcomes the existing Place row produces are already correct.
No `Place.provenance` was added.

**Ceiling, asserted:** the reference trip contains no record with a non-null `attribution`, so
0/112 and 0/94 clean, 112/112 and 92/94 under +1°, and the Fisherman's Bastion blocker are all
unchanged. `geoCheck.test.ts` asserts the "no attributed record" premise itself, so the day
that stops being true the ceiling fails rather than quietly stops meaning anything.

### KD-24 — `travelLine` re-parses `HH:MM` instead of calling core's `timeVal`

`packages/client/src/selectors/index.ts`

§2.12's day-view row needs "departs 14:30 · 1h 20m · **arrives 15:50**", and the arrival
clock has to be computed from a time and a duration. Core has that arithmetic — `timeVal` —
and **§2.10 revision 5 took `timeVal` off the public surface** in the same pass, as an
internal of `computeLegs`; §2.10's own ceiling then forbids `packages/client` from reaching
past the index into a core module path. So the selector carries four lines of `HH:MM`
parsing of its own.

That is a second implementation of something, and sequencing rule 1 is about exactly that, so
it is written down rather than left to be found. **Why it is the cheaper wrong:** it decides
nothing about the trip; it returns `null` on anything that is not a clock rather than
guessing; and the alternative — widening §2.10 for a display helper — is a documentation
change the builder does not get to make. **If the architect would rather have `timeVal` on the
surface, this is four lines and one import.**

Two related choices, stated: the shaping lives in `packages/client` and not in `apps/web` so
it can be tested in plain Node (§3 forbids importing `apps/web` from anywhere) and so
`apps/mobile` inherits it. And the arithmetic is **wall-clock with no timezone** — a run that
crosses midnight reports `nextDay` and renders "(+1 day)"; a run that crosses a timezone is
reported as the clock arithmetic it is and nothing more, which is why `journey_overrun` is
still deferred to Phase 4 (KD-15).

### KD-25 — `syncResolutions` is called from `getDerived()`, and one ROADMAP F test was rebuilt around that

`packages/client/src/store/store.ts`, `packages/client/test/derived-cache.test.ts`

§2.7 calls `syncResolutions` *"a build function the client calls whenever it recomputes the
derived conflict set"*. Nothing called it (QA R2-7), so the conflicts panel's **Not a problem**
button resurrected its own dismissals. The call now sits in `getDerived()`, immediately after
`derivedFor` — the one place the conflict set is known to have been computed from the current
`state.doc`, which is what §2.2b F2 requires of a function that reads derived data and
**writes the document**.

Two consequences worth naming:

- **`getDerived()` can now change the document and schedule a save.** It is a read that
  writes, which is unusual, and it is what §2.7 asks for. It converges in one pass —
  retiring a resolution cannot make a conflict appear or disappear, only detach a
  `resolution` from one — and the retirement is bookkeeping, so it does not go on the undo
  stack, exactly as the pre-existing `store.syncResolutions()` method already did it.
- **`derived-cache.test.ts`'s R4-1 test had to be rebuilt.** Its old setup acknowledged a
  conflict, edited it away, and then undid — and with the call finally wired, the
  intermediate `getDerived()` retires that acknowledgement *legitimately*, which made the
  final assertion vacuous rather than wrong. The resolution is now created **after** the
  cache has gone stale, which is the only way a live resolution and a stale conflict set can
  coexist at all. The property under test is unchanged and still fails if the sync trusts
  the cache instead of recomputing.

### KD-26 — the credit line is one shared function, and the views ceiling carries one exemption

`apps/web/src/format.ts`, `apps/web/src/views/Panels.tsx`, `apps/web/src/views/StopEditor.tsx`

§2.14 rule 7: *"any view that renders a record with a non-null `attribution` renders the
credit"*. Two of the four stop-rendering views did not — `PoolPanel` rendered the badge *from
a friend* and no credit, `StopEditor` rendered neither (QA R2-8). Both now do, using the same
`creditLabel` the day view used, **moved into `format.ts` rather than copied**: four
hand-written versions of a rule is four chances for one of them to quietly not exist, which
is how this defect happened.

The ceiling is now a grep, not four hand checks (`test/views.test.ts`): a view that renders
the provenance **badge** renders the **credit**, and the set of badge-rendering views is
pinned so a fifth cannot appear silently. **One exemption, `Sidebar.tsx`**, which renders a
`Day` chip and never a `Stop`. Its justification is not argued, it is asserted: the test
proves at runtime that neither the reference trip nor a freshly copied stop produces a `Day`
with a non-null `attribution`, so the day the exemption stops being true the run fails.

**What this ceiling cannot do**, stated: `apps/web` cannot be imported from `cairn/test/` —
§3's dependency test forbids it, and that is the boundary keeping the planner's data out of a
bundle — so the views are read as *text*. The rendered strings are asserted separately, in
Chromium, by `qa/r8-views.mjs` §2.

### KD-27 — the bundle check is a derived rule now, with two named non-credentials

`packages/core/src/build/redactText.ts`, `packages/core/src/model/types.ts`, `test/redact.test.ts`

§6.6 enforcement clause 2 asks for *"a rule applied by the sample generator, covered by a
test, not a one-off scrub"*. The shipped test grepped `apps/web/dist` for six hardcoded
literals and never applied `redactionHits` at all, so a seventh credential was simply not
looked for — and a seventh had crept in: a real FlixBus booking reference written as the
example in a source comment, shipped through the sourcemap's `sourcesContent`, plus a real
flight designator from `types.ts`. Both are replaced with invented placeholders.

The rule now **derives** the credential set — run the redactor over the *unredacted* trip,
keep every token it removes, assert none appears in any emitted asset — so it grows with the
data. **`REDACTION_PATTERNS` is deliberately NOT applied to the bundle directly**: minified
JS is wall-to-wall short uppercase identifiers and long digit runs, and QA already ruled that
unimplementable. The patterns are applied to the DATA; the resulting tokens are what the
bundle is grepped for.

**The divergence: two tokens are excused, by name, with a checkable claim each.** `OPTIONAL`
is an English word in Jacob's own day note, caught by the deliberately digit-free all-caps
pattern (KD-17's stated cost), and in the bundle it is `LegacyConstants.OPTIONAL`, a property
name of the importer's input type. `BOOKINGS` is part of the repo path `docs/BOOKINGS.md` on
a dropped `sourceDoc` field, and in the bundle it is a doc comment naming that file. Both
entries are asserted **live** — an excuse the derivation no longer produces is a dead line
and fails — and asserted **disjoint from the known-leak list**, so a real credential can
never be excused. The six-literal list stays as a floor beneath the rule, not as the rule.

### KD-28 — the flush-exhausted exit reports and re-arms; the other two exits do neither

`packages/client/src/store/store.ts`

§4.2 rule 6a″ (revision 5, QA R6-1/R6-2). Exhausting `FLUSH_MAX_ATTEMPTS` was the one path
that aborted a transition without telling anyone — `status` stayed `'idle'`, and no banner
reads `'idle'`, so the click did nothing and said nothing — and it cancelled the timer the
user's own edit had scheduled without putting it back. It now sets `status:'error'` with
`FLUSH_EXHAUSTED_MESSAGE`, which renders through the **existing** error banner with its two
recoveries, and re-arms the ordinary debounced `attemptSave`.

**Deliberately not `'conflict'`:** nothing refused the write and there is no other writer to
merge with, so offering a merge would be a lie about what went wrong. **Deliberately a
three-way rule:** on `'conflict'` a re-armed autosave would spin against a fence that refuses
it every 400 ms; on a port `'error'` the port is failing and the banner's Retry is the
deliberate act. Only the bound-exhausted exit re-arms. All three are asserted, the last two
as ceilings — behaviourally, by firing the scheduler and counting writes at the port, because
`manualScheduler.pending` keeps cancelled jobs and is not an answer to "is a timer pending".

### KD-29 — `expiresAt` and `revokedAt` fail closed on anything that is not a calendar date

`packages/core/src/access/predicates.ts`

`if (s.expiresAt && s.expiresAt < now)` is a lexical string compare, and a lexical compare on
an unvalidated string is not a calendar comparison: `"9999-99-99"`, `"tomorrow"` and
`"never"` all sort after a real `YYYY-MM-DD`, so all three read as *not yet expired* and
granted access. That is F-13's argument one field over, and §6.2.4 is why it is not
Phase-2 work: these predicates are *the definition the Phase 2 RLS policies are generated
from and tested against*, and a definition that fails open generates a policy that fails open.

Both fields are validated with `isIsoDate` and fail closed. **`null`, `''` and absent keep
meaning "no expiry"** — asserted explicitly, in both directions, alongside a real past date
still expiring and a real future date still granting.

### KD-30 — `cli export` resolves symlinks, and refuses to clobber

`cli.ts`

Two holes in one command (QA R2-5). `safeWritePath` was lexical: `resolve()` normalises `..`
and a leading `/` but does **not** follow symlinks, so `ln -s <outside>/victim.txt
cairn/qa/escape-link.json` passed the prefix test and `writeFileSync` wrote *through* the
link — the file outside `cairn/` was overwritten with the trip JSON and the CLI reported
success. Root `CLAUDE.md` calls this boundary *"the one rule that must never drift"*. The
guard now `realpathSync`es the containing directory (which catches a symlinked parent) and
the target itself when it exists (which catches a symlinked file), and a missing parent
directory is a refusal too.

Second half: `export <existing file>` overwrote it with no prompt and exit code 0. **A CLI has
no dialog to raise and a prompt would break every scripted use, so the answer is
refuse-by-default with the way through named in the message** — exit 3, *"refusing to
overwrite … Pass --force if you meant to replace it."* `--force` is a deliberate act and it
still cannot cross the `cairn/` boundary, asserted. If the architect wants an interactive
prompt on a TTY instead, that is a small addition on top of this, not a replacement for it.

### KD-31 — `deleteTrip` is a link on the serialization chain

`packages/client/src/store/store.ts`

§4.2 rule 6c, revision 5 (QA R7-3). **The exception is about not *writing*. It is not about
not *ordering*.** A write already queued can settle *after* `ports.storage.delete(id)`
returns, and an expect-absent write is *satisfied* by the record's absence, so it succeeds,
`upsertSummary` puts the library row back, and the trip is resurrected with the delete
silently undone.

`await saving; ports.storage.delete(id)` is **not** the fix and was not used — the architect
identified it as its own race, a check-then-act with an interleaving point in the middle. The
delete is a `chainOntoSaving` link of its own: *drain, delete, forget*, with the port delete,
the library-row removal and (when the deleted trip was active) the reset of `doc`, `savedDoc`
and `savedVersion` all inside the one link, so no later link can observe a half-deleted store.

**The exception survives, and it is asserted**: the active trip's pending timer is still
cancelled *without* writing, so the queue this link drains holds only writes the store had
already committed to; a conflicted trip is still deletable.

### KD-32 — the merge button has an in-flight guard, and the debounced save absorbs its own rejection

`packages/client/src/store/store.ts`

**R7-1.** `mergeWithStored` is `load()` … `mergeTrips` … `chainOntoSaving(write)`, three
awaits with interleaving points between them, and `App.tsx` has no disabled state on the
button. Two presses before the first settles both read the same `stored.version`, so the
first write moved storage on and the second was refused against a version its own predecessor
had spent — leaving `'conflict'` and *"Not saved — edited elsewhere"* over a document that was
merged and written correctly. **Chaining does not close this**, which is why the guard is an
in-flight slot and not a queue: serialising two merges still runs the second one's stale
expectation. A second press joins the first press's promise. `finally` clears the slot
whichever way the merge ends, so a failed merge never wedges the button.

**R7-2.** The fix is the `.catch` on `scheduleSave`'s `void save(...)`, **not** a `try/catch`
per listener in `emit()`. The two are not equivalent here: per-listener isolation would also
swallow the rejection an explicit `flush()` owes its own caller, and `qa/r7-chain.mjs` §3
asserts that a failing link still rejects for the caller that asked for it. The absorbing
`.catch` is on the fire-and-forget path only — the one with no caller to reject to — and it is
the same shape as `chainOntoSaving`'s existing `.catch(() => {})`, one level out. A *storage*
failure is still reported: `attemptSave` turns that into `status:'error'`, and the only
rejections reaching the swallowed line come from a subscriber throwing inside `set()`.

### KD-33 — the export surface is 69 symbols, and 45 came off

`packages/core/src/index.ts`, `packages/core/test/surface.test.ts`

§2.10 revision 5 settled a criterion that had been "partially met" for three rounds: the test
asserted set equality against the **union** of a 50-name list and a 60-name "beyond the
section" list, which is 110 = 110 for any 110 exports, and QA R2-12 found 42 of the 60
per-symbol justifications did not hold. It is now one list of 69, set equality both
directions, plus ROADMAP E's two ceilings: no second list and neither banned identifier
anywhere in the file (asserted by grepping the test's own source), and no consumer outside
`packages/core` importing a core module path.

**The expected shape of the change, per §2.10 itself: some tests and probes now import a
module path directly.** Tests do not create surface, and attacking an internal is their job.
Rewritten from the index to the module path: `access.test.ts` (`isIsoDate`), `build.test.ts`
and `merge.test.ts` (`userProvenance`, `systemSuggestion`, `addPlace`), `conflict.test.ts`
(`STALE_RESOLUTION_LIMIT`, `timeVal`), `copyStop.test.ts` (`addPlace`, `needsBadge`),
`derive.test.ts` (`haversine`, `rawSpanKm`), and the probes `qa/attack2.mjs`,
`qa/r2-copy.mjs`, `qa/r6-actor.mjs`, `qa/vehicles.mjs`. `tools/redact.mjs` moved the other
way — its deep import into `build/redactText.ts` now goes **through** the index, which is why
the redaction four are on the surface at all.

**Not repaired, and disclosed:** `qa/r5-freshness.mjs` §5.7 calls `core.accept`, which QA
R5-5 removed two rounds ago, so that block has been dead since round 5 and BUILD-NOTES
already records it as deliberately unpatched. This pass also takes `friendImport` and
`needsBadge` off the index, which that same dead block references; nothing observable changes
because it already crashes one line earlier. Probe repair is a commit of its own, and it is
the breaker's.

### KD-34 — the retirement ledger: five implementation calls A-5 did not spell out

`packages/core/src/conflict/resolve.ts`, `packages/client/src/store/reducer.ts`,
`packages/client/src/store/store.ts`

A-5 is unusually precise and I followed it literally: `reassertRetirements(trip, retired)`
next to `syncResolutions`, `AppState.retired`, the five-step `set(next, {reseed})`, the seven
reseeding paths, the two-action release in `dispatch`, and `retireResolutions` keying
`derivedFor` on `state.doc` rather than the local `next`. Five things the ruling left to the
builder, each recorded because a reader should not have to infer them from the diff:

1. **`writeAndSettle` gained a fifth parameter.** A-5 names *"`doMerge`'s result"* as the
   seventh reseeding path, but `doMerge` does not call `set` — `writeAndSettle` does, and it
   is shared with `attemptSave`. So `writeAndSettle(..., opts?: { reseed?: boolean })` forwards
   to `set`, and the merge branch is the only caller that passes `{ reseed: true }`. The
   alternative — reseeding after `await chainOntoSaving(...)` — is a second `set`, which is
   the double-emit A-5's step 5 forbids in as many words.
2. **A `null` incoming document takes the reseed branch.** Step 3's condition reads
   `state.retired.tripId !== next.doc.id`, which has no meaning when `next.doc` is `null`.
   Steps 2 and 3 agree on the answer for that case (`retired` becomes `null`), so the guard is
   written to take the seed branch and both readings produce the same state. Under the closed
   list a `null` document only ever arrives via `closeTrip`/`deleteTrip`, which reseed anyway;
   the guard is there so an eighth path cannot crash.
3. **The gate is `if (r.retiredAt)`, not `if (r.retiredAt === null)`.** Identical over the two
   values `IsoDate | null` permits, and it matches `syncResolutions`' own idiom one function
   up rather than introducing a second spelling of the same test.
4. **The release replaces the map, it does not mutate it.** `retired.marks` is reachable from
   an `AppState` a subscriber may still be holding, and §2.1's immutability discipline does not
   stop at the document. It costs one `Map` copy on two action types.
5. **`releaseRetirement` assigns `state` without emitting.** It runs *before* `set`, per the
   ruling, and `set` emits for both. A-5's *"exactly one place it is read or written"* is
   about the ledger's maintenance sequence; the release is the ruling's own named exception,
   and it is a private helper called from exactly the two lines `dispatch` names.

The reference trip is unaffected: it carries no resolutions, so `marksOf` returns an empty map
and `reassertRetirements` returns the same reference on every `set`.

### KD-35 — A-6 is derived at evaluation time, and `Place` keeps its shape

`packages/core/src/derive/geoCheck.ts`

The places loop builds a `placeId -> linking stops` index once — over
`trip.days.flatMap(d => d.stops)` then `trip.pool`, in document order — and computes
`copyBorne = linking.length > 0 && linking.every(isCopied)`, reusing the `isCopied` helper the
copied-**stop** row already uses. `anchors` is computed exactly as before, so `km` and
`nearest` stay real: §2.13's *"measure it and decline to publish"*, not *"skip the record"*.

**No anchor-side change, deliberately, and A-6 says so:** `Place` is not a `GeoAnchor` kind, a
place's coordinate enters the anchor set only through a stop that resolves via it, and that
stop's eligibility is already governed by `anchorsOthers`. Accepting a copied stop therefore
leaves the place exempt (the clause keys on `attribution()`, not `provenance.state`) while
adding the stop to `anchorable` — anchors are added, so a blocker can only disappear.

**Re-derived, not quoted, and none of §2.13's numbers moved:** 0 findings / 112 scheduled
stops and 0 / 94 places on the clean reference trip; 112/112 and 92/94 under a +1° latitude
fault with the two permitted misses still `Blue Cave, Biševo` and `Stiniva Cove, Vis`; the
Fisherman's Bastion typo still one blocker naming `place-68`. That is `geoCheck.test.ts` 1–15,
unchanged by this pass and re-run against it.

**Limitation 4, restated where the code is:** a coordinate typo already present in a
copy-borne `Place` in its *source* trip travels with the copy and is not re-reported here.
§2.13 names it; it is not a surprise.

### KD-36 — OBJECTION: A-5 makes a *second* dismissal stillborn, and I shipped it anyway

**RESOLVED, `c9c274d`/A-5a.** The architect upheld the objection and ruled a veto: the ledger
may acquire a `conflictId` from a document only when that document holds no live row for it,
at both reseed and absorb (bare "skip in absorb" was insufficient — it still failed on a
storage round-trip). Implemented as `liveConflictIds(doc)`, consulted at both sites in
`store.ts`. Three regression cases in `retirement-ledger.test.ts`; `npm run test:tap` 412/0.
The objection below is kept as the record of what was found and why it was not worked around.

`packages/client/src/store/store.ts` (`set` step 4 × `dispatch`'s release)

**This is an objection to the ruling, not a deviation from it.** The code does exactly what
A-5 specifies. The specification has a consequence I do not think the architect intended, I
reproduced it, and I am not redesigning around it — that is an architect decision.

A-5's release fires *before* `set`, and `set`'s step 4 then re-absorbs from `next.doc`'s own
retired rows. `core.resolveConflict` **keeps** a retired row for the same `conflictId` (it is
the record `detectConflicts` reads for *"you dismissed this on 12 Aug; it has come back"*) and
appends the new live row beside it. So the release deletes the key and the absorb immediately
puts it back from the surviving retired row, and step 5 stamps the brand-new live row.

ROADMAP's stated criterion — `unresolveConflict` **then** `resolveConflict` — is unaffected and
passes, because `unresolveConflict` drops *every* row for the id, so there is nothing left to
absorb. The broken path is `resolveConflict` **alone**, which is what the Conflicts panel's
*"Not a problem"* button does when a retired conflict has come back:

```
dismiss → edit away → getDerived() retires → edit back (conflict live, resolution null)
→ press "Not a problem" again
  before this pass: rows = [dismissed retiredAt=2026-08-01, dismissed retiredAt=null]  renders "dismissed"
  after  this pass: rows = [dismissed retiredAt=2026-08-01, dismissed retiredAt=2026-08-01]  renders UNRESOLVED
```

Verified both ways by `git stash`ing this pass's `src` changes and re-running the same script.
It is user-reachable in the shipped UI and it is A-5's own *"a ledger that re-stamps a fresh
answer has implemented 'never un-retires' as 'never resolve again'"*, reached through the other
door. **No test in this pass asserts the post-fix behaviour as correct**, precisely because I
do not think it is.

Two candidate one-line fixes, both of which are the architect's call and neither of which I
made: skip a `conflictId` in step 4's absorb when `next.doc` also holds a **live** row for it;
or have the release survive one `set` (a released-this-tick set the absorb consults).

### KD-37 — `lifecycle`'s parameter is `Pick<Trip, 'startDate'|'endDate'>`, not `Trip`

`packages/core/src/derive/lifecycle.ts` · **Phase 2 I-1/I-4.**

§8.1 writes the signature as `lifecycle(trip: Trip, today: IsoDate)`. It ships as
`lifecycle(trip: DatedTrip, today: IsoDate)` where `DatedTrip = Pick<Trip, 'startDate' |
'endDate'>`. A `Trip` satisfies that, so **every caller §8.1 anticipated is unaffected** and no
behaviour changes; the widening is a type change and nothing else.

**Why.** I-4 requires a lifecycle chip in `Library.tsx`, and `Library` renders
`TripSummaryRow`s. §8.4 says `AppState` holds **exactly one** trip document in memory, so the
Library cannot hand `lifecycle` a `Trip` per row. The two options were: widen the parameter, or
let `apps/web` compare `row.startDate`/`row.endDate` to `today` itself — which is a second
implementation of trip state in a second place, and sequencing rule 1 calls that a design
defect. I took the widening.

**What the architect may want to change.** If the intent is that a `TripSummaryRow` should
carry its own stage, that is a §8.4 decision (and it collides with §8.1's *"no stored status
field"*, since a summary row is a cache written at save time and a stage goes stale at
midnight). I did not make that call. `lifecycle` is on §2.10's list either way.

### KD-38 — criterion 3's "zero findings" is partly `ensureDays`, not only the gate

`packages/client/test/past-trip.test.ts` · **Phase 2 I-4.** Not a deviation — a measurement
that changes what the criterion proves, recorded so the breaker does not have to rediscover it.

`ensureDays` mints blank days as `primaryCity:'transit'` with `cities:['transit']`, and
`missing_lodging` skips transit days by design. So the 21-day, one-city, zero-stop 2019 trip
the criterion names is silent for **two** independent reasons — the §8.2 gate, and the fact
that its days are not assigned to its city — and **criterion 3 alone still passes with the gate
deleted.** Verified by deleting the gate line and re-running.

The suite therefore carries a second test, *"the CEILING half: the silence is the GATE, not
transit days"*, which takes the same document, assigns every day to Tokyo via `setDayMeta`, and
asserts it is loud as a plan (20 uncovered nights, one `missing_lodging` run) and silent at
`today`. That is the case §8.2 actually names — *"a 21-day memory trip in one city with no
stops trips `missing_lodging` on every night of it"* — and it fails with the gate removed.

**RESOLVED in the pass after this one, and the entry stays because the reasoning is what the
next reader needs.** The ruling routed back was: the past-trip form assigns a city. It now
requires at least one and dispatches one `setDayMeta` per day putting the trip's **first** city
on it — the existing action, no reducer logic, no day-by-day UI. Two consequences worth
carrying forward:

1. **Criterion 3 now proves the gate.** The measurement above — *criterion 3 alone still passes
   with the gate deleted* — is no longer true. With the gate line deleted, `past-trip.test.ts`
   fails 2 of 6, criterion 3 among them. The "CEILING half" test survives and now runs against
   the document the form actually produces rather than a harsher one built by hand.
2. **The injected-fault test deliberately does NOT assign cities.** A `missing_lodging` run over
   a trip that straddles `today` survives the gate by §8.2 ruling 1 (all-subjects) and names
   past days, which is correct and would have made that test measure two things at once.

### KD-39 — a city's centre is `{0,0}` on both trip-creation screens

`apps/web/src/views/PastTripForm.tsx`, `Library.tsx` · **Phase 2, the KD-38 fix.** Not a new
divergence — the pre-existing shape of the new-trip flow, recorded because KD-38's fix now makes
it matter.

Both forms collect cities as **names only**, comma separated; `createTrip` fills
`centre: {lat: 0, lng: 0}` (`createTrip.ts:68`) and `countryCode: ''`. The past-trip fix follows
that pattern rather than inventing a coordinate input, per its own scope. Nothing today reads a
city centre for a stopless trip — `geoCheck` measures stops and places — so this costs nothing
yet. It will matter at **I-7** if country attribution is ever taken from a city centre rather
than from stop coordinates: every hand-entered city would attribute to the Gulf of Guinea. The
fix belongs with whatever gives cities coordinates (a geocoder, or an autocomplete), which is
not this pass and not I-6.

### KD-40 — an absent `ownerId` is adopted by `importDoc`, not by `fromJSON`

`packages/core/src/serialize/fromJSON.ts`, `packages/client/src/store/store.ts` ·
**Phase 2.** The reading behind the fix, written down because §2.14 rule 1 states the *refusal*
predicate and not what an accepted ownerless document's owner becomes.

Rule 1 refuses a document whose `ownerId` is *"present and is neither the local user … nor
absent"*, so **absent is accepted** — that half is not ambiguous, and `qa/r2-import.mjs` was
right to call the parser's `TripParseError` a defect. What the text does not say directly is
whether the trip stays ownerless or becomes the local user's. It is settled by the model rather
than by rule 1: §2 types `Trip.ownerId: UserId` as *"present from Phase 1, carrying the sentinel
`local:self`"*, `validateTrip` reports `owner_missing` as an **error**, and §6.2's predicates
grant `owner` by id — so an ownerless trip installed in the library is a trip its own restorer
could not be shown to own. There is no coherent "distinct allowed owner-less case"; absent means
the local user.

**So the adoption is at the client, not in core.** `fromJSON` carries absence through as `''`
(a pure function that stamped `LOCAL_OWNER` would make a stranger's ownerless file the local
user's silently, and core cannot know who is signed in); `store.importDoc` — rule 1's own stated
home, *"enforced in `packages/client`"* — refuses a present foreign owner and adopts an absent
one as `localOwner()`. That also makes rule 1 hold in **Phase 2**: a signed-in `user:jacob`
restoring an ownerless backup gets it under `user:jacob`, which a `LOCAL_OWNER` default in the
parser would have turned into a `ForeignDocumentError` against the sentinel. Rule 1's *"it does
not adopt ownership"* is read as being about the refused foreign document — the adopt-and-badge
alternative the same sentence rejects — not as a ban on owning your own restored backup.

**If the architect meant the other reading** (an ownerless document stays ownerless and shows
`owner_missing` until the user is asked), the change is two lines in `store.importDoc` and the
parser half stands either way.

### KD-41 — `datePrecision`'s greppable ceiling now has one exemption: `derive/summary.ts`

`packages/core/src/derive/summary.ts`, `packages/core/test/datePrecision.test.ts` ·
**Phase 2.** Closing QA P2-6 required the field to reach a directory §8.1's ceiling names, and
the divergence is recorded rather than argued away.

§8.1 says `datePrecision` is *"read by display and nothing else: no conflict rule, no derive and
no validation may branch on it"*, and I-2 turned that into a grep over `conflict/`, `derive/` and
`validate/`. But the Library — the screen a past trip mostly lives on — does not render `Trip`s.
It renders `TripSummaryRow`s read back from storage, and `tripSummary` is the only thing that
builds one. So either the row carries the precision or the Library states dates the user never
claimed, which is the convention `CLAUDE.md` calls absolute. The breaker filed P2-6 against
`derive/summary.ts:60` for exactly this reason, and §8.9 already anticipates `tripSummary`'s
return type widening (there, for I-6's country index).

**The distinction the ceiling was written to protect is *branching*, not *naming*, and that is
what the tests now enforce.** The exemption list has one entry, asserted to have one entry, and
a second test proves the claim behind it by construction: `summary.ts` names none of `'exact'`,
`'month'` or `'year'`, contains no comparison against the field, and mentions `datePrecision`
exactly three times — the field on the type and `datePrecision: trip.datePrecision` on the copy.
A fourth mention fails the test.

**`qa/p2b-gate.mjs` §2.1's copy of the same grep now reports 1 FAIL** naming this file. That is
expected and it is this entry. If the architect wants the ceiling to stay literal, the
alternative is a display-owned row type outside `packages/core` that `apps/web` builds from a
`Trip` — which would mean the Library loading every trip in full to list them, and that is the
cost `TripSummaryRow` exists to avoid.

### KD-42 — the runtime export count is 71, not 70; A-9 and ROADMAP I-3a both said 70 — CLOSED

`packages/core/src/index.ts`, `packages/core/test/surface.test.ts` · **Phase 2, doc-only.**

A-9 point 5 and ROADMAP I-3a's *"Architecture / data model"* row both stated that §2.10's runtime
symbol count *"stays at 70"*. It stays at **71**. That was not a drift this pass introduced:
`Object.keys(core)` counted 71 at the base commit `23f37b9` too, `surface.test.ts` transcribes
§2.10 as a 71-entry list and asserts set equality in both directions, and that test is green
before and after. So the substance of the assertion holds exactly — **no symbol was added or
removed, and one exported signature changed** — only the number in the prose was stale.

The builder correctly declined to resolve this itself (a builder editing the architect's stated
ceiling to match the code is how a ceiling stops being one). This is not that case: §2.10's own
enumerated list, further down the very same document, already reads 71 — confirmed independently
against `surface.test.ts` and a live `Object.keys(core)` count. Two sentences in the A-9/I-3a
addenda contradicted the architect's own settled §2.10 list elsewhere in the same file; that is a
same-document consistency fix, not a ceiling being moved to match code, and squarely a
documentation-accuracy correction within standing autonomy. Both `70`s corrected to `71` in
`ARCHITECTURE.md` and `ROADMAP.md`, each with a note pointing here.

### KD-43 — `qa/p2b-gate.mjs` §3.3 measures the product now, not a copy of the deleted slug (doc-only: its home is `qa/`, which the disclosure scan does not cover)

`qa/p2b-gate.mjs` · **Phase 2.** The one probe edit A-10 did **not** pre-authorise, so the
reasoning is here rather than assumed.

§3.3 opened with `const keyOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')` — the
probe holding its own copy of the expression `PastTripForm.tsx` held, and asserting things about
that copy. With the expression deleted from the product, that block would have gone on failing
forever while measuring nothing that ships: a private function in a QA file, unreachable from any
user action.

So `keyOf` now calls `createTrip` and reads back `trip.cities[0].key` — what the form actually
stores after A-10 — and **every assertion is kept verbatim**. The deleted expression survives as
`legacySlug`, called only in the `console.log` line, so the log still shows what it used to do
beside what the product does now. Three assertions were **added** rather than changed: the
already-collapsed document still `fromJSON`s, and the `reserved_city_key` and `city_name_empty`
cases each report. The one assertion whose *wording* moved is *"two colliding city keys are
reported by `validateTrip`"*, which now runs against an injected collision, because a collision
can no longer be produced by the path the probe was using; the original sentence is kept beside
it as *"a two-city Japanese trip is now CLEAN"*.

If the breaker disagrees, the honest alternative is to delete §3.3's first three assertions
outright rather than leave them measuring a private helper — I chose to keep them pointed at the
product instead.

### KD-44 — A-10's fallback in the label helpers can print an opaque id at a person — CLOSED

`packages/core/src/conflict/rules/geoOutlier.ts` · **Phase 2.**

Flagged by the builder as the one objection to A-10 as literally written: the label helpers'
fallback (*"the key, when the trip has no such city"*) went from printing `vienna` (reads as a
place) to `city-7` (reads as nothing), and the case it fires on is exactly the broken document
where the user most needs a legible sentence.

This is a single-line, user-facing UI string with no data-model or architectural consequence —
`unknown_city_key` (in `validateTrip`) and `params.cityKey` already carry the real signal for
anything structured or debuggable; this is only the sentence a person reads. Routine UX decision,
resolved directly rather than round-tripped through another architect dispatch: `cityLabel` now
returns `null` instead of the raw key.

**Round 13 (QA R13-5) caught a second bug in the first fix.** The first pass had `cityLabel`
return the fallback phrase itself, substituted straight into `` `the ${label} map` `` — which
reads "on the a city this trip does not have map" and, worse, made both call sites (`map` and
`optional list`) emit the identical string, losing the distinction `whereOf` exists to draw.
Corrected: `whereOf` now composes the fallback per call site — *"the map for a city this trip
does not have"* / *"the optional list for a city this trip does not have"* — so both read
grammatically wherever they're embedded and stay distinguishable. `cityKey.test.ts`'s A-10
fallback assertion still matches (the phrase is a substring of both forms). Full suite
re-verified green (515/515) after each change.

### KD-45 — `test/disclosure.test.ts` silently stopped reading past KD-38 — CLOSED (doc-only)

`docs/BUILD-NOTES.md`, `test/disclosure.test.ts` · **Phase 2, doc-only.**

`knownDivergenceIds()` finds this section's heading, then truncates at the first line matching
`/^\n---\n/m` to find where it ends. Every other entry in this section is separated by a blank
line only; the KD-38 entry (added earlier this phase) was followed by a stray `---` rule, which
the parser read as the section's *close*. From that point on, `knownDivergenceIds()` returned a
set missing KD-39 through KD-44 entirely — not "unrecognized", **absent** — so both disclosure
tests that depend on it (the "cites a KD that exists" check and the "every KD is cited somewhere"
check) were silently checking nothing for six entries. Neither test failed, because nothing in
scanned source cited any of the six by name until this pass's own KD-42 citation tripped the
first one and forced discovery of the rest.

Not a defect in the checked code — every one of KD-39/40/41/43/44's claims independently held.
The stray `---` is removed (the section now reads as one continuous list of blank-line-separated
entries again, closing at the genuine `---` before "## 2. How to run it"), which surfaced five
real citation gaps: KD-39, KD-40 and KD-41 now have a one-line `KD-n` pointer at their code's home
(`PastTripForm.tsx`, `fromJSON.ts`, `derive/summary.ts`); KD-44 likewise in `geoOutlier.ts`; KD-43
is marked doc-only in its own heading, since its only home (`qa/`) is outside the disclosure
scan's roots by design. `test/disclosure.test.ts` itself needed no change — the mechanism was
correct throughout; the document violated a convention the mechanism assumed but never asserted.
Worth a `### KD-n` heading of its own rather than a silent fix, since the whole point of this
section is that nothing gets corrected without a record of why it needed to be.

### KD-46 — the same opaque-key legibility fix, applied to `validateTrip`'s six messages — CLOSED

`packages/core/src/validate/validateTrip.ts` · **Phase 2.** Closes QA **R13-7**. KD-44's decision,
applied to the six sites A-10's change table did not list.

A-10's *"what this changes elsewhere — the complete list"* names exactly one string site,
`geoOutlier.ts`. It missed six more, and R13-7 measured all of them: `duplicate_city_key` and
`city_name_empty` (both codes A-10 itself added) plus four that had been legible until keys became
minted ids — `primary_city_not_in_cities`, `unknown_city_key` on a day, `pool_stop_unknown_city`
and `unknown_city_key` on a place. Every one printed a raw `CityKey` into `Issue.message`, which is
the sentence the Issues panel shows: *"Place "Belvedere" references unknown city "acity-1""*. Two
of them are reachable without a corrupt document at all — `qa/r13-gate-citykey.mjs` §10 reaches one
by an ordinary cross-trip copy (R13-6).

Fixed exactly as KD-44 fixed `geoOutlier.ts`, and deliberately not more cleverly: a private
`cityLabel(trip, key)` returns `City.name` or `null`, each caller composes its own sentence, and
`Issue.params` keeps the raw key untouched at all six sites — it is structured data and §2.1/§2.7
require the id there. Only the human-readable string changed. Two details worth stating because a
strict reading of the finding does not settle them:

- **`cityLabel` treats a blank name as unresolvable** where `geoOutlier`'s copy does not. An issue
  reading *"the day's primary city, "", is not listed"* is the illegibility this is fixing, and the
  blank name is separately reported by `city_name_empty`.
- **`primary_city_not_in_cities` gained `params.cityKey`.** Its params already carried the key, but
  under the name `primaryCity`; `primaryCity` is kept verbatim and `cityKey` added, so all six
  city-key issues expose the key under the one name `geoOutlier.ts` and the other five use. Purely
  additive — no golden, fixture or test read that params object, verified by running.
- **One new branch, not a shared phrase:** `primary_city_not_in_cities` can fire on the `transit`
  sentinel, which is *not* a city, so the generic *"a city this trip does not have"* fallback would
  have been a lie there. That case reads *"the day is marked travel-only, but the travel-only
  marker is not listed among the day's cities."*

Nine tests, all watched red first (`packages/core/test/cityKey.test.ts`); the reference trip's
validation output is unchanged (`fixtures/golden/core-validation.json` carries only
`cost_basis_mixed` and `lat_lng_out_of_range`, neither of which this touches).

### KD-47 — a copied `Place` is re-filed in the target trip's terms, or it does not travel — CLOSED

`packages/core/src/build/copyStop.ts`, `packages/core/src/model/cityName.ts` (new) · **Phase 2.**
Implements ARCHITECTURE §2.14 **A-14** (revision 12) and closes QA **R13-6**.

Rule 4 copied the referenced `Place` with `{...original, id: newId('place')}`, carrying the
**source** trip's minted `CityKey` into the target. After A-10 two independently created trips can
never share a key, so every cross-trip copy of a place-linked stop left the recipient reporting
`unknown_city_key` — an **error** no control in the UI can clear — and `samePlace`, which compares
`cityKey` first, could never match across trips either, so the reuse branch silently duplicated
places the target already had. Built exactly as A-14 specifies: a private `refileCityKey(source,
target, cityKey)` runs steps 1 and 2 and returns the target's key or `null`, and `null` is step 3.

`normalizeCityName` is its own module in `model/` — the lowest layer — so `build/copyStop.ts` and
the `derive/summary.ts` / `derive/travelStats.ts` uses A-14 anticipates share one definition rather
than growing two. It is importable by any `packages/core` module and is deliberately absent from
`index.ts`; §2.10's runtime surface is 71 symbols before this pass and 71 after, measured by
`Object.keys(core).length` both times.

Three things a strict reading of A-14 did not settle, decided as follows:

- **`geoCheck`'s A-6 fixture had to change, and that is a real consequence rather than a test
  repair.** A-14 says A-6/A-6a *"apply unchanged to the step-2 case and simply have less to do in
  the step-3 case"*. `lisbonWithCopiedPlaceStop` — the fixture 14 of the A-6/A-6a tests are built on
  — copies a place-linked stop out of the reference trip into a **Lisbon-only** trip, which is now
  step 3: no `Place` travels, so the copy-borne place those tests exist to measure no longer exists
  and all 14 failed on their own precondition (*"rule 4 must have dragged the Place across"*). Not
  one assertion was weakened and no production code was bent to fit: the fixture's trip now holds a
  **second city named after the source place's own city, created with no coordinates** (which is
  what `createTrip` does — `centre` defaults to `{lat:0,lng:0}`). That keeps the copy on step 2, so
  the place travels and is re-filed, while leaving it far from every anchor the trip offers — which
  is precisely the record §2.13 A-6 exempts. The fixture asserts the stub city does not join a day,
  so it is filing and not itinerary.
- **A `Place` already in the target that carries the *source's* key is not matched, and is
  duplicated once.** The reuse search runs against the re-filed key only, as A-14 writes it. A
  document that already contains such a row can only have got it from a copy made *before* this fix;
  A-14 orders no migration and no `schemaVersion` bump, so this pass does not add a second search to
  find those. The cost is bounded — one duplicate place row per pre-A-14 copy re-copied — and
  `validateTrip` already reports the old row's `unknown_city_key` for as long as it is there.
- **Step 3 clones the coordinate rather than aliasing it.** A-14 writes `place = {kind:'inline', at:
  original.at}`; built as `{...original.at}`. `copyStopInto` is pure and the two documents must not
  end up sharing one mutable `LatLng` object. Nothing in core mutates a `LatLng` today, which is the
  only reason the literal reading is not already a defect.

15 tests, all watched red first: 10 in `packages/core/test/copyStop.test.ts` covering A-14's own
assertions 1–5 (re-filing, normalised/NFC name matching, cross-trip reuse, the no-match case, the
`at: null` case, a blank source name, a source key the source itself cannot resolve, the two
same-named-cities tie-break on `order` and then on document position, byte-identity across two
identical runs, and copying within one trip being unchanged), and 5 in the new
`packages/core/test/cityName.test.ts` — including one that removes `String.prototype.normalize` from
the prototype and restores it, to hold down A-14's claim that a runtime without it degrades to step
3 instead of throwing.

### KD-48 — A-11 assertion 4 says `unbooked_ticketed` fires **three** times on the reference trip; it fires **ten** — CLOSED

`packages/core/test/horizonGate.test.ts` · **Phase 2.**

A-11's fourth builder assertion reads: *"At a clock 200 days before the reference trip,
`detectConflicts` reports **no** `unbooked_ticketed` note and `detectUngated` reports **three**; at
`FIXTURE_TODAY` both report three."* Measured, the rule fires **ten** times on the reference trip at
`FIXTURE_TODAY`, un-gated and gated alike.

"Three" is §2.7's rule table naming the three *fixture cases* — Széchenyi, Prague Castle, Windsor —
which is also how `conflict.test.ts` asserts them (by name, never by count). Ten is what the shipped
ceiling has always said and still says: **11 notes at `FIXTURE_TODAY`**, ten of them from this rule.
So the number in the ruling is a slip about the fixture, not a claim the code fails; nothing about
A-11's mechanism depends on it.

The test keeps **A-11's shape** — no note at 200 days out in the gated set, every note in the
un-gated set, both sets equal at `FIXTURE_TODAY` — with the measured count, and additionally asserts
the three named cases are among the ten, so the fixture-case reading is checked too. A builder
silently writing `10` where the architect wrote `3` is how a ceiling stops being one; this is that
number, said out loud.

### KD-49 — `qa/r13-gate-citykey.mjs` §3's first two assertions are retired by A-13, not fixed (doc-only: its home is `qa/`, which the disclosure scan does not cover)

`qa/r13-gate-citykey.mjs` · **Phase 2.** Same class as KD-43 — a probe edit, recorded because a
builder editing the probe that measures him is exactly the move that needs a reason attached.

A-13 pre-authorises one of the two: *"§3's first assertion — 'extending `endDate` makes the conflict
return' — is **retired by this ruling, not fixed**: it asserts a mechanism the model does not have,
and the honest edit is to replace that line with the tripwire."* Done: §3's first line is now A-13's
tripwire (*no feasibility finding resolves only through §8.2 ruling 2's `endDate` fallback*), run
over the reference trip and §3's own document, and it fails loudly with the instruction to write
A-9(4)'s literal test the day a rule makes it achievable.

The **second** assertion — *"the substituted test's `setTripMeta` changes its outcome (i.e. it is
load-bearing)"* — A-13 does not mention, and it measures a call the same ruling orders **deleted**.
Left alone it would fail forever while measuring nothing that exists. It is replaced by the two
things A-13 actually requires of `retirementGate.test.ts`, both read off the file: the inert call is
gone (comments stripped first — the ruling deletes the *call*, and the test header is allowed to say
why), and A-9(4)'s test name describes the **clock crossing** rather than an extended `endDate`. The
third assertion — *"a clock crossing leaves the dismissal live and the finding un-accused"* — is kept
verbatim, because A-13 says that is what the substitution does prove.

Nothing else in the probe moved. §1, §4, §5 and §9 call `detectUngated` as an array and are
untouched, deliberately: A-12 adds `detectUngatedChecked` beside it rather than changing its shape,
precisely so round 13's assertions stay independent evidence that A-11 worked.

---

## 2. How to run it

```bash
cd cairn
npm install
npm test          # 387 tests. Plain node, no browser, no network.
npm run typecheck # generates the sample first (see F-3 below), then both TS projects
npm run cli -- trip           # headline counts and city ranges
npm run cli -- day 2026-08-13 # one day: stops, legs, costs, badges
npm run cli -- conflicts      # the conflicts panel as text
npm run web:dev   # http://localhost:5173
npm run web:build && npm run serve   # production build on http://localhost:4173
```

Both commands work from a **clean clone**. `npm run typecheck` used to fail on a fresh
checkout — `apps/web/src/sample/europe2026.json` is gitignored and generated by
`gen-sample.mjs`, so `tsc` could not resolve it until after `npm run web:build` (F-3). There
is now `npm run sample`, and `pretypecheck` runs it.

`npm run golden` regenerates `fixtures/golden/*.json`. Only run it when you have decided the
new output is correct — that is the whole point of the files. See KD-14 for what a `core-*`
golden does and does not prove.

`npm run cli -- export <path>` refuses any path that normalises outside `cairn/` (F-16).
`cairn/test/cli.test.ts` runs the real CLI against `../europe-2026-itinerary.html`,
`../docs/BOOKINGS.md`, `../tickets/…` and `/etc/passwd` and asserts all four are refused.

**The persistence probes**, for anyone re-checking R2-1 / R3-1 / R3-4 / R3-2 / R4-1. Plain node:

```bash
node qa/r3-undo.mjs      # the fence vs. Ctrl-Z            (all probes ok)
node qa/r3-loss.mjs      # flush-before-switch, real timers (all probes ok)
node qa/r3-cas2.mjs      # ABA, corrupt records, page exit  (probes 1-4 ok; 5-7 are R3-5+)
node qa/r3-cas.mjs       # the save chain                   (all ok except A, which is R3-3)
node qa/r4-switch.mjs    # R4-1's ten probes                (all ok since the round-4 pass)
node qa/r2-copy.mjs      # R2-11's ruling, §B               (all ok since the round-4 pass)
```

The 200-step walk in `packages/client/test/dirty.test.ts` takes a seed, so a failing run is
replayable: `CAIRN_WALK_SEED=12345 node --test packages/client/test/dirty.test.ts`. The
default is `20260826` and the failure message prints whichever seed was used.

Real Chromium, against real IndexedDB — needs the build and the server first:

```bash
npm run web:build && node tools/serve.mjs &
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-race.mjs      # 0 of 3 rounds lose an edit
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-tabs.mjs
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r3-browser.mjs   # R3-1 and R3-2, both closed
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r3-upcast.mjs    # the §2.2a upcast
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-browser.mjs   # R4-1, 4 probes, all ok
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-epoch.mjs     # R4-2, 6 probes, all ok
```

`qa/r3-upcast.mjs` is new: it seeds a genuine **version-1** `cairn` database — `docs` +
`summaries`, no envelope version, the shape Jacob's browser actually holds — then boots the
app over it and checks the record is stamped at open, opens, edits and saves.

---

## 3. What actually runs

| Piece | State |
|---|---|
| `packages/core` | Model, build, derive (incl. **`geoCheck`**), conflict (**10 rules** — `closed` deleted), validate, access, serialize, legacy import, merge, **`copyStopInto`**. |
| `packages/client` | Store, reducer, ports, selectors, derived cache, the **`StorageVersion` write fence** (refuse + explicit merge — §2.2a), **flush-before-switch** (§4.2 rule 6) and `pageExit`, **browse-another-trip**. `syncResolutions` is now *called*, from `getDerived()` — until this pass it existed with no caller and the row said so anyway (KD-25). Every `StoragePort` mutation, `delete()` included, is on the serialization chain (KD-31); the merge button has an in-flight guard (KD-32); the exhausted flush reports and re-arms (KD-28). `travelLine` shapes §2.12's day-view string (KD-24). |
| `packages/tokens` | Colours, category labels, mode icons, status badges. **No test of its own.** |
| `apps/web` | Library, day view, day map, conflicts, validation, pool, places, export, **restore-from-backup**, **Browse & copy**. The **credit line now renders in all four views that render a stop** — the day view and the browse pane always did; the Optional panel and the stop editor did not, and the row used to claim otherwise (KD-26). **`travelRole` is rendered**: a `journey` stop reads *"departs 14:30 · 1h 20m · arrives 15:50"*, and an `unknown` stop carries the one-tap control §2.12 asks for (KD-24). **`acceptCandidate` is still reachable from no control** — an imported stop stays badged forever. That fails safe and it is not fixed here; it is named so nobody has to find it again. |
| `cli.ts` | Complete. `export` resolves symlinks before the boundary test and refuses to clobber an existing file without `--force` (KD-30). |
| `tools/extract-legacy.mjs` | Reads the live planner READ-ONLY. |
| `tools/gen-sample.mjs` | Builds the web app's sample trip at build time, **through `redactForSample`**, and fails the build if a credential survives. Output is gitignored. KD-14, KD-17, KD-18. |
| `tools/redact.mjs` | The §6.6 pattern array and `redactForSample`. Never imported by `packages/core`. |
| `tools/serve.mjs` | Zero-dependency static server for `apps/web/dist`. |
| `tools/doc-section` | Prints one section of a docs file. |

---

## 4. Verified, by running it

**Regenerated for the SEND-BACK pass** (round 8's builder pass, on `master` after `5bdd0dc`).
The previous table under this heading reported *"231 pass"* and predated round 2; the review
was explicit that a stale table here is what round 1 was sent back for. Every number below
came out of a command in this repo, on this delivery, in this pass. Where a number is
misleading, the caveat is **next to the number**, not in a footnote.

| What | Number | Command | Caveat |
|---|---|---|---|
| Tests | **387 pass, 0 fail** | `npm run test:tap` | Was **333 / 0** at `8a65a53` (the reviewed commit). +54, all of them this pass's regression coverage; one file is new (`packages/client/test/travel-line.test.ts`, `test/views.test.ts`) and one existing test was **rebuilt rather than added to** — see KD-25. |
| Typecheck | clean, both projects | `npm run typecheck` | `pretypecheck` generates the sample first. Not re-checked from a fresh clone this pass; the review verified that clause at `8a65a53` and nothing here changes the install or the config. |
| Web build | clean | `npm run web:build` | 583 kB `index-*.js`, unchanged in kind. |
| Bundle credentials | **0 leaks of 108 derived tokens** | `npm run web:build && node qa/r2-redact.mjs` | Was **7**, including Jacob's real FlixBus reference in a `.js.map`. The three the probe still prints are `OPTIONAL` and `BOOKINGS`, which are an English word and a repo-path fragment — named, justified and asserted-live in `test/redact.test.ts`. **KD-27.** |
| Import | 16 days · 112 scheduled · 31 pooled · 95 places · 21 bookings | `node cli.ts trip` | Unchanged. |
| Tickets | **7 ticketed stops: 3 bundled over 2 files, 4 url** | ticket census through `importLegacyDays` | ROADMAP says 3/2 too; revision 1 said "2 bundled" and an earlier version of this report repeated it — **KD-4**. |
| `travelRole` | **21 journey · 81 transfer · 10 unknown** of 112 | `import.test.ts`; `qa/r8-views.mjs` §1 | The model half was already right. **This pass put it on the screen** — Aug 8 renders *"departs 14:30 · 1h 20m · arrives 15:50"*, asserted in Chromium, and the ten `unknown` stops now carry a control that dispatches. KD-24. |
| Blockers | **2** | `node cli.ts conflicts` | Both are Jacob's own `legacy_flag` days, and the golden carries one line per blocker saying why he must act — a third cannot appear without someone writing that line. **The copy path can no longer mint a third** (KD-23), which is what R2-9 was. |
| `impossible_transfer` | **0 blockers, 0 warnings** | `conflict.test.ts` | Unchanged. Tightest remaining transfer margin **7 min**, asserted. KD-1. |
| `geoCheck` clean run | **0 findings** — 0/112 stops, 0/94 places | `geoCheck.test.ts` | Unchanged by KD-23's new row, and the test now asserts the *premise* (the reference trip holds no attributed record) so the ceiling cannot go quietly vacuous. |
| `geoCheck` injected fault | **112/112 stops, 92/94 places** at +1° latitude | `geoCheck.test.ts` | Unchanged. The two misses are the named ones. |
| Fisherman's Bastion typo | **1 blocker, `place-68`, 109 km** | `geoCheck.test.ts`, `qa/r2-data.mjs` | Unchanged; re-derived independently by the probe in this pass. |
| Copy path × `geo_outlier` | **`unanchored`, 9140 km, 0 conflicts** | `node qa/r2-data.mjs` | Was `certain` → `blocker: geo_outlier`. Both halves asserted: the false blocker is gone, **and** an un-accepted copy cannot suppress a real blocker on an own stop. KD-23. |
| Validation | **1 error, 10 warnings** | `node cli.ts validate` | Unchanged. |
| Leg parity | **16 of 16 days** exact | `derive.test.ts` | Against the live page's own `legBetween` in a `node:vm`. Untouched by this pass — `computeLegs` still does not read `travelRole`. |
| Day-cost parity | **6 of 16 exact, 10 divergent** | `derive.test.ts` | Each of the ten is classified and the classification is proved against the data — **KD-3**. |
| Export surface | **69 runtime symbols = §2.10's 69** | `surface.test.ts` | Was **110 against an enumerated 50 + 60**, which was 110 = 110 for any 110 exports. Set equality, both directions, one list, plus ROADMAP E's two ceilings. **KD-33 supersedes KD-19.** |
| Redaction | every pattern exercised; 6 prose strings survive; `importLegacyDays` output unchanged | `test/redact.test.ts` | Plus the new derived rule and its red-green check: a planted credential the old six-literal grep would have missed is caught. KD-27. |
| `cli export` boundary | 6 lexical escapes + **2 symlink escapes** refused; clobber refused | `test/cli.test.ts` | The symlink half is new. Reproduced first: the file outside `cairn/` really was overwritten. KD-30. |
| Access predicates | 3 named malformed expiries fail closed; `null`/`""`/absent still mean "no expiry" | `packages/core/test/access.test.ts`, `node qa/r2-access.mjs` | `qa/r2-access.mjs` was **1 FAIL**, now **0**. KD-29. |
| Read-only boundary | 0 modified tracked files at the repo root | full run, then `git status --porcelain` | `md5sum europe-2026-itinerary.html` = `7c69df3208ef91c8be0fb59a56443188` before and after, across the full suite, four web builds, six Chromium sessions and ~25 probe runs. See §7. |

**The 2 blockers, line by line.** Unchanged, and this is the whole table:

| # | Rule | Subject | Act on it? |
|---|---|---|---|
| 1 | `legacy_flag` | Aug 18 — Jacob's own rebuild note | **Yes** — his flag, his words |
| 2 | `legacy_flag` | Aug 20 — the 7:30am/7:30pm correction | **Yes** — his flag, his words |

**The QA probe board, as measured in this pass**, against the review's own counts at `8a65a53`:

| Probe | Review @ `8a65a53` | This pass | What moved |
|---|---|---|---|
| `r2-access` | 1 FAIL | **0** | KD-29 |
| `r2-resolutions` | FAIL at §4 | **0** | KD-25 — §4 flips **through the dispatch path**, not by a hand call |
| `r2-data` | `geo_outlier` blocker on the copy | **0**, finding is `unanchored` | KD-23 |
| `r2-redact` | 7 leaks | **0** (3 printed, 2 distinct, both named non-credentials) | KD-27 |
| `r7-chain` | 3 FAIL | **2** | §3b, §7 and §10 all close (KD-31, KD-32). The two left are the probe's own hardcoded structural counts — *"three call sites route through it"* is now 5, and *"recorded: `ports.storage.delete` is NOT on the chain"* is a recording line that is now false. **Probe repair, not a defect.** |
| `r6-flush` | 3 FAIL | **2** | R6-2's *"autosave is still armed after the bound is spent"* closes. The remaining R6-1 line samples `status` **200 ms after** the abort, by which time the re-armed write has landed and §4.2 rule 6a″ says the banner clears. Measured directly: immediately after `closeTrip()` returns, `status='error'`, `lastError="Couldn't finish saving before switching. Your edit is still here."`. **Probe sampling point, not a defect** — `packages/client/test/switch.test.ts` asserts the rendered banner at the right moment. |
| `r3-undo` `r3-loss` `r4-switch` `r2-copy` `r3-merge` `r2-race` `r3-cas` `r4-epoch` | 0 FAIL | **0** | nothing regressed |
| `r3-pool` `r3-cas2` `r6-actor` `r2-constraints` `r5-freshness` | 3 / 3 / 5 / 2 / 4 | **3 / 3 / 5 / 2 / 4** | identical — all accepted Phase 1 residue |

**Driven in real Chromium over real elapsed time** (`npm run web:build && node tools/serve.mjs`,
then `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r8-views.mjs` — a new probe, **0 FAIL**,
zero page errors across five sessions):

- **Aug 8 reads `departs 14:30 · 1h 20m · arrives 15:50`** and Aug 18 reads `departs 05:30 ·
  40 min · arrives 06:10`. A `transfer` stop still renders the bare time. An `unknown` stop
  renders *"This time — is it when you arrive, or when this leaves?"* with two buttons, and
  one click dispatches `updateStop`, removes the control and re-renders the stop as a journey.
- **Copy a stop, press ⇩, open Optional: badge *from a friend* AND credit *From "Europe
  2026"*.** Open the stop editor on it: both again. Both were absent before this pass.
- **A write that cannot land renders `Not saved. <reason>` with Retry and Export this copy**,
  the indicator does not read "Saved", and the edit is still on screen. That is the banner the
  exhausted-flush exit now reuses.
- **Dismiss a `booking_vs_plan` blocker, move the stop back, move it away again** — the
  conflict returns **live**, with *"you dismissed this…"* in its detail. That is §2.7's own
  sentence, driven as a user.

## 5. Defects fixed, across both rounds of this re-delivery

| # | What | Where | Proof |
|---|---|---|---|
| F-1 | `save()` had no compare-and-set; two tabs destroyed each other's edits and the loser said "Saved" | `client/src/store/store.ts` | `store.test.ts` ×5, `merge.test.ts` ×14, `qa/browser5.mjs` |
| F-2 | `importDoc` checked the in-memory library, not storage | `client/src/store/store.ts` | `store.test.ts` ×3, `qa/client1.mjs`, `qa/browser4.mjs` |
| F-6 | a friend's trip arrived unbadged, keeping their `ownerId` | `core/src/build/copyStop.ts`, `client/src/store/store.ts` | `copyStop.test.ts` ×20, `serialize.test.ts`, real Chromium |
| F-3 | `npm run typecheck` failed on a clean clone | `package.json` | run from a scratch clone of `master` |
| F-7 | `updateStop` accepted `id`, `placement` and `provenance` at runtime | `core/src/build/stops.ts` | `build.test.ts` ×5 |
| F-8 | the `closed` rule could not fire — 0 of 95 places carry hours | rule **deleted** | KD-5 |
| F-9 | `conflict.test.ts:158` asserted `notDeepEqual([Y,X],[X])`, which passes on a list that merely grew | `core/test/conflict.test.ts` | two tests, one per direction |
| F-10 | a dismissed conflict returned still dismissed when the data reverted | `core/src/conflict/resolve.ts` `syncResolutions` | `conflict.test.ts` ×3 |
| F-11 | `createTrip` accepted `2026-13-45` and `2026-02-30` | `core/src/model/ids.ts` `isIsoDate` | `build.test.ts` ×3, `serialize.test.ts` |
| F-12 | `fromJSON` was reported to accept unknown enums and non-numeric coordinates | **it does not** | `serialize.test.ts` ×14 — see §6 |
| F-13 | `canView` returned `true` on an expired share when `now` was `undefined` or `''` | `core/src/access/predicates.ts` | `access.test.ts` ×27 |
| F-15 | `rollUpCost` called with no target, so a EUR trip said "No conversion rate for EUR" | `client/src/store/derived.ts`, `cli.ts` | `boundaries.test.ts` greps every call site — see §6 |
| F-16 | `cli export` could overwrite the live planner | `cli.ts` | `test/cli.test.ts` ×6 |
| F-17 | `accepted_without_timestamp` was checked for stops and not bookings | `core/src/validate/validateTrip.ts` | `copyStop.test.ts` |
| F-18 | `geo_outlier` put raw `lat`/`lng` into `Conflict.params` and into a committed golden | `core/src/conflict/rules/geoOutlier.ts` | `conflict.test.ts` greps for float pairs |
| F-19 | the built bundle embedded a door PIN, refs and live ticket URLs | `tools/redact.mjs` | `test/redact.test.ts` ×10, real Chromium |
| F-4/F-5 | `impossible_transfer` and `geo_outlier` crying wolf | §2.12 `travelRole`, §2.13 `geoCheck` | KD-1, KD-2 |
| M-6 | §3's dependency-direction test did not exist | `test/boundaries.test.ts` | mutation-checked — see §6 |
| M-1/M-2 | source comments cited a BUILD-NOTES section that did not exist | §1 above, `test/disclosure.test.ts` | `npm test` |
| **R2-1** ⚠️ **incomplete — see R3-1** | `save()` was `load` → compare → `save`: two awaits with an interleaving point, so two tabs saving at the same moment both passed the compare and the second write destroyed the first — **both** displaying "Saved". The compare was moved **inside** `StoragePort.saveIfRevision`, atomically, and a store no longer races itself. **That closed the concurrent race and nothing else.** The token was `Trip.revision`, which `undo()` rewinds, so the guard could re-issue a revision it had already spent on a refusal and readmit the tab it had refused. The row above claimed R2-1 closed; it was closed *for the case it was filed under*. The fence is now a separate opaque `StorageVersion` — R3-1. | `client/src/ports/types.ts`, `client/src/ports/memory.ts`, `client/src/store/store.ts`, `apps/web/src/ports/storage.ts` | `store.test.ts` ×3 new (concurrent tabs, self-overlap, port contract) — each **verified to fail against the pre-fix code**; `qa/r2-race.mjs` in real Chromium: **0 of 3 rounds lost an edit** (was 2 of 3) |
| **R2-2** | a stop returned to the pool from a day belonging to no city was filed under the transit pseudo-city, which is never in `trip.cities` and so was never a key the pool panel could show: the stop was in the document, in the count, and rendered by nothing. `returnToPool` now resolves to a real trip city when the day has one; the panel renders an always-visible catch-all group for the rest; `validateTrip` reports `pool_stop_unknown_city` for a key that is neither. | `core/src/build/pool.ts`, `core/src/model/ids.ts`, `core/src/validate/validateTrip.ts`, `client/src/selectors/index.ts`, `apps/web/src/views/Panels.tsx` | `build.test.ts` ×4, `store.test.ts` ×2; `qa/r2-poolloss.mjs` in real Chromium: **"the stop is reachable again"** (was "in NO Optional panel, under any group") |

| **R3-1** | `Trip.revision` was doing two incompatible jobs: content counter **and** write fence. `undo()` restores a snapshot verbatim, revision included, and autosaves it — so a revision the compare-and-set had already spent refusing another tab came back around, and the refused tab's next keystroke walked straight through the guard. Both tabs then read "Saved" over different documents, which is R2-1's symptom sentence verbatim. **Split, per §2.2a:** `Trip.revision` is unchanged and stays content; the fence is a new opaque `StorageVersion` minted by storage inside the atomic write step, held in the record's *envelope* beside the document and never inside it. `revisionOf()` is deleted — nothing above the port derives a version from parsed bytes. `undo`/`redo` cannot move it because the reducer never names it. `undo` does **not** synthesise `revision + 1`; §2.2a supersedes that. | `client/src/ports/types.ts`, `client/src/ports/memory.ts`, `client/src/store/store.ts`, `client/src/store/reducer.ts`, `apps/web/src/ports/storage.ts` | `storage-version.test.ts` ×17 — **red-green verified**: reverting the port to revision 2's scheme (`version = epoch.revision`) fails "undo cannot readmit a refused write" with `'idle' !== 'conflict'`, the exact defect. `qa/r3-undo.mjs` all probes ok; `qa/r3-browser.mjs` probe 1 in real Chromium: fence `…3268…ca.1 → …ca.3` while `Trip.revision` went `1 → 0` on Ctrl-Z, tab B still refused |
| **R3-4** | the same root defect from the other side: a per-document counter cannot tell "this document, unchanged" from "a different document that happens to sit on the same number" after a delete and recreate under the same id (the export → delete → restore path `importDoc` permits). Closed **by construction**, with no ABA-specific code: the counter is storage-wide and never rewinds on `delete()`, and ~~an `epoch` minted with `crypto.randomUUID()` and persisted with the database covers the same ABA one level up~~ — **that half was wrong and R4-2 is the bill: the epoch was cached in the port's closure, so a tab surviving the wipe minted against a dead one. Superseded by R4-2's fresh-CSPRNG-per-mint below; the ABA fix itself stands.** | `client/src/ports/memory.ts`, `apps/web/src/ports/storage.ts` | `storage-version.test.ts`: zero repeats over 200 writes across 3 ids interleaved with `delete()`; ABA at the *same* `Trip.revision` refused; export→delete→restore-under-the-same-id refused through the store. Red-green verified. `qa/r3-cas2.mjs` probes 1–3 ok |
| **R3-2** | a 400 ms debounced autosave was still pending when the active document was replaced, closed or deleted; `attemptSave` read `state.doc` at fire time, so trip A's write executed against trip B and the edit was gone with **nothing on screen**. One click, no second tab. §4.2 rule 6: all six document-changing transitions (`closeTrip`, `openTrip`, `createTrip`, `adoptTrip`, `importDoc`, `deleteTrip` — a closed list, asserted as a ceiling) now `await flushForTransition()` first; a refused (`'conflict'`) or failed (`'error'`) flush **aborts the transition** and the banner names both recoveries; `deleteTrip` of the *active* trip is the one exception and cancels the timer without writing. Belt and braces: a scheduled save captures its trip id and is **dropped, not retargeted**, if `state.doc` moved. Page exit registers `visibilitychange`→`hidden` + `pagehide` (deduped) → `flush()` and `beforeunload` → `preventDefault()` while dirty. | `client/src/store/store.ts`, `client/src/store/pageExit.ts` (new), `apps/web/src/App.tsx` | `switch.test.ts` ×22, `page-exit.test.ts` ×8 — **red-green verified**: removing the flush calls and the trip-id capture fails **19 of 22**. `qa/r3-loss.mjs` all 4 probes ok (including the real-timer one); `qa/r3-browser.mjs` probe 2 in real Chromium: the edit typed inside the debounce window survives clicking "Cairn" |

| **R4-1** | "is there an unwritten edit" was `doc.revision !== savedRevision` — a *content counter* being asked whether an edit would be lost. `undo()` restores a snapshot verbatim, revision included, so a fresh, **different** edit landing on a number an earlier edit already used made the store report "nothing to write"; `flushForTransition` skipped the write, the switch completed, and the screen read "Saved" over a document storage did not hold. One click, no second tab. **`persistence.savedRevision` is deleted** — not corrected, deleted — and `persistence.savedDoc: Trip \| null` replaces it, absorbing the store's module-level `baseDoc` so exactly one pointer answers both "is there an unwritten edit" and "what is the merge's common ancestor". `dirty()` is now `!!state.doc && state.doc !== state.persistence.savedDoc` — reference identity, exact because `Trip` is immutable. `savedDoc` is assigned only from a port result (the exact document a successful `saveIfVersion` carried, or `load()`'s) and the reducer never names it. `flushForTransition`'s skip now needs **all three** of `status === 'idle'`, no pending debounce timer, and `doc === savedDoc`; `flush()` stays unconditional. §2.2b F1/F2, §4.2 rules 4 and 6a′. | `client/src/store/reducer.ts`, `client/src/store/store.ts` | `dirty.test.ts` ×15 (new), incl. the **inconclusive-not-pass** precondition and the **200-step seeded walk** asserting `isDirty() === (toJSON(doc) !== the port's bytes)` at every step — **red-green verified**: restoring the revision comparison and the two-conjunct skip fails 8 of them, the walk failing at step 9 with "the dirty predicate and the bytes disagree". `qa/r4-switch.mjs` all probes ok (was FAIL); `qa/r4-browser.mjs` §1 in real Chromium: Ctrl-Z + one ↓ reorder + the brand button, and the reorder **is** in IndexedDB (`stop-57,stop-58…` → `stop-58,stop-57…`) |
| **R4-2** | the `StorageVersion` was `` `${epoch}.${n}` `` with `epoch` read once at open and **remembered in the port's closure**. A tab alive across a site-data clear (or §1.1's 7-day eviction) kept minting against a dead epoch while the counter had genuinely reset to zero, and reproduced a token it had already issued — verified in Chromium, byte for byte. The `epoch`, the storage-wide counter and the `meta` object store are **deleted** (`DB_VERSION` 2 → 3, which drops `meta`), and every mint is **16 bytes of fresh `crypto.getRandomValues`, base64url-encoded, derived from nothing**. Not `crypto.randomUUID`: it is secure-context-only and `undefined` over plain HTTP from a LAN address, which is exactly how `tools/serve.mjs` would be used from a phone. **No `Math.random()`/`Date.now()` fallback** — a fence fails closed and the store shows `'error'`. The one-time upcast stamps pre-fence records with the same mint. The in-memory port stays deterministic (`packages/client` may not touch ambient randomness): `` `${instance}.${n}` `` from a process-wide instance counter, with an injectable `mintVersion` as the only way to model a collision. §2.2a rules 2/5, §2.2b F3. | `apps/web/src/ports/storage.ts`, `client/src/ports/memory.ts` | `storage-version.test.ts` ×5 new: 100 construct/write/discard cycles with **zero duplicates in the pooled 200 tokens**; a token from one instance refused by another; no `StorageVersion` literal in any test, golden or fixture; no `Math.random`/`Date.now`/`randomUUID` on the fence path; F3's closure-state scan (`ready` is the only closure variable and `saveIfVersion` does not read it). **Red-green verified** against the true pre-fix port from `98ec06a`: 4 fail. `qa/r4-epoch.mjs` in real Chromium: `V=OSL3-…`, `deleteDatabase`, restore → `V2=ZE4W…`, `V2 !== V`, the pre-wipe token **refused**, storage still holds the restorer's document, tab B reads *"Not saved — edited elsewhere"* |
| **R4-3** | the same F2 violation in the derived cache: `cache.revision === trip.revision && cache.tripId === trip.id`, so undo-then-a-different-edit served the pre-undo document's legs, costs, clusters and conflicts. Through `store.syncResolutions()` that does not merely render — it **writes the document**, retiring resolutions against conflicts the current document does not have. The key is now `(document identity, today)`; `revision` leaves the cache entirely, `tripId` is subsumed (two trips cannot be the same object), and `today` closes a smaller pre-existing hole where date-sensitive conflict rules went stale across midnight. `DayMap.tsx`'s effect dependency array carried `derived?.revision` — a dependency array is `===` suppressing work — and now depends on the cache object, per §4.2 rule 3's "depend on the cache object, not on a number inside it". `apps/web/src/store.ts`'s `useDerived` read `state.doc?.revision`; it reads `state.doc`. | `client/src/store/derived.ts`, `apps/web/src/views/DayMap.tsx`, `apps/web/src/store.ts` | `derived-cache.test.ts` ×4 (new) — **red-green verified**: restoring the revision key fails 3 of 4, including the `syncResolutions` one, which retires a live resolution. Plus the 200-step walk's ceiling (`getDerived()` deep-equals `computeDerived(doc, today)` at **every** step) and a grep test asserting no dependency array or memo key in `apps/web/src` contains a revision |
| **R2-11** | §2.14's invariant — a credited record never reads as the user's own plan unless a **member** accepted it — was stated and enforced nowhere. `copyStopInto`'s `ctx.actorUserId` was already non-nullable in the type and unchecked at runtime, and R2-11 went straight through it. Enforced now at the two places documents come from: `acceptCandidate`, `rejectCandidate` and `copyStopInto` **throw** (`TypeError`, via a shared `requireActor`) on `null`, `undefined` or `''`, checked before anything is copied so the input trip is unchanged and `revision` has not moved; and a non-member actor on an attributed record is `validateTrip`'s new `accepted_by_non_member` (`level:'error'`, `params` carrying the actor and the owner), written membership-shaped (`members(trip)`, which degenerates to `{ownerId}` in Phase 1) rather than as `=== ownerId`. **`displayStatus` is untouched** and still returns `'own'` on a faulted record, deliberately: it is a pure function of one `Provenance`, cannot see the trip, and must not learn to. | `core/src/build/candidates.ts`, `core/src/build/copyStop.ts`, `core/src/validate/validateTrip.ts`, `core/src/model/types.ts`, `client/src/store/actions.ts` | `copyStop.test.ts` ×6 new: the throw over the full ref matrix (`day`/`stop`/`booking` × `null`/`undefined`/`''`) with the unchanged-trip ceiling after each; the injected fault producing **exactly one** additional issue with the right code/level/ref/params; **zero additional issues on the unmodified reference trip**; and a `source:'user'`/`actorUserId:null` record staying outside the rule. `qa/r2-copy.mjs` §B now reports ok instead of two FAILs |

| **R5-1** | `flushForTransition()` decided whether a transition could proceed by sampling `persistence.status` **after** awaiting its own `save()` — a fact about the write that had just finished, not about the document about to be abandoned. An edit dispatched while that write was in flight left `state.doc` on a new document, `savedDoc` correctly on the old one, and the status on `'idle'`; the transition proceeded, `state.doc` became `null` or another trip, and `attemptSave`'s early returns dropped the re-armed write. `isDirty()` then read `false` because there was no document left to be dirty about. Five of six transitions lost it. **The decision now re-asserts `dirty()` after every write and loops**, cancelling the re-armed timer on each pass, bounded by `FLUSH_MAX_ATTEMPTS = 5`. Exhausting the bound is treated as a **refused flush** (rule 6b): the transition aborts, the trip stays open, the edit stays in memory and `isDirty()` is `true` — nothing is discarded, and the click can simply be repeated once the typing stops. The realistic case settles in two writes. Not a timer fix: with `autosave:false` the same edit was lost and now lands. | `client/src/store/store.ts`, `client/src/index.ts` (exports `FLUSH_MAX_ATTEMPTS` so the bound is assertable) | `flush-race.test.ts` ×9 (new) — asserted on **stored bytes**, never on `isDirty()` alone: all five affected transitions, the `autosave:false` control, `deleteTrip(otherId)`'s by-construction safety, a genuinely refused flush still aborting, and the bound terminating in exactly `FLUSH_MAX_ATTEMPTS` writes and then succeeding once typing stops. **Red-green verified**: against the pre-fix decision, 7 of 9 fail, `closeTrip` with `['edit ONE','edit TWO']` where `['edit ONE','edit TWO','edit THREE']` was expected. `qa/r5-browser.mjs` in real Chromium: **5 of 5 delays now keep the edit** (was 5 of 5 losing it) |
| **R5-2** | `accepted_by_non_member`'s guard was `if (!actor \|\| memberIds.has(actor)) return`, which added an unstated fourth conjunct — *the actor must be truthy* — to §2.9's three, and exempted `null`, `undefined` and `''`. A credited, `state:'accepted'` record accepted by **nobody** validated clean and rendered as the user's own plan. The guard is now `if (actor !== null && memberIds.has(actor)) return` over a normalised actor (`typeof === 'string' && !== ''`), so only a **member** short-circuits; `params.actorUserId` carries `''` for the absent case (§2.1: `params` is `Record<string, string \| number>`, and a `null` must not leak through as a non-string), with a message that reads *"…is marked accepted, but records nobody as having accepted it."* rather than *"accepted by null"*. §2.14's stated null-actor exemption is scoped by **attribution**, not by nullness, and is untouched: `source:'user'` records stay outside the rule. | `core/src/validate/validateTrip.ts` | `copyStop.test.ts` ×3 new: all three missing-actor shapes flagged exactly once each with the right level/ref/params and a message naming no `null`; a real non-member still flagged and the **owner** still not; and the **ceiling** — zero additional issues on the unmodified Europe 2026 reference trip (it carries 156 accepted records and **zero** attributed ones, asserted rather than assumed), with a one-record injected fault on that same document producing exactly one issue so the ceiling is not vacuous. **Red-green verified**: restoring the falsy short-circuit fails 2 of 3 with *"actorUserId=null was not flagged (0 issues)"*. `qa/r5-freshness.mjs` §5.3–§5.5 now report `ok` |
| **R5-5** | `accept`/`reject` were on core's public export surface taking `UserId \| null` with no `requireActor` check — §2.14's gate with a public bypass, and R5-2's construction path. **Option (b): dropped from `index.ts`.** Nothing in `packages/client`, `apps/web`, `cli.ts` or the tests ever called them (verified by grep, not assumed), so `surface.test.ts`'s justification — *"used by the client for optimistic UI"* — was simply false and is deleted with the entries. Option (a) was rejected on layering: `requireActor` lives in `build/candidates.ts` and `provenance.ts` is `model/`, so routing the primitives through it would invert the dependency direction for a symbol with no caller. The checked wrappers `acceptCandidate`/`rejectCandidate` are unchanged and are now the only public way to accept. | `core/src/index.ts`, `core/test/surface.test.ts` | `surface.test.ts` — a new test asserting both names are absent from the runtime export list while the wrappers remain, plus the existing set-equality and gap-size tests, which fail on their own if either is re-exported without being re-justified. The §2.10 gap drops 62 → 60 |

| **R3-3** | `save()` chains (`saving = saving.catch(() => {}).then(…)`) and its comment states why — *"One store never races ITSELF"*. `mergeWithStored()` had **two bare `saving = (async () => …)()` assignments**, one per branch, which *replace* the chain instead of extending it. An autosave still unsettled when the user pressed "Merge and save" therefore ran **alongside** the merge's write, from one store: the merge landed correctly, the orphaned autosave was then refused against its now-stale expectation, and the banner read *"Not saved — edited elsewhere"* with `isDirty() === false` over a document that was fully and correctly saved — not clearing until the next edit. No data was lost; the indicator lied in the safe direction. **Fixed by extracting the chaining expression into `chainOntoSaving(work)`** and routing all three call sites (`save()` and both merge branches) through it. Chosen over inlining the expression a third time because it makes the invariant structural: `saving = run` now appears **once** in the file, so a future write path cannot opt out of the chain by writing an assignment, and `qa/r3-merge.mjs`'s static probe (which greps for `saving = (async`) is measuring something real rather than a convention. Everything else in both branches is byte-for-byte preserved — the deleted-trip branch's `writeAndSettle(doc, doc, null, null)`, the merge branch's expectation of `stored.version` rather than a recomputed one, and both branches' `catch` → `status:'error'`. | `client/src/store/store.ts` | `merge-race.test.ts` ×2 (new) — a storage port that both **parks** `saveIfVersion` and **counts how many writes are inside it at once**, because "one store never races itself" is a fact about concurrency at the port and cannot be read off the store's status enum. **Red-green verified, test written first**: against unmodified `store.ts` both fail with `2 !== 1` — *"two writes were inside the storage port at once, from ONE store"* — one per branch. Assertions are on **stored bytes** (`day1` is this tab's latest edit **and** `day2` is the other tab's, so neither is dropped by the overlap), then on `status === 'idle'` and `lastMerge`. `qa/r3-merge.mjs` 4 ok / 0 FAIL, unedited; `qa/r3-cas.mjs` probe A 3 ok |

**Not fixed, and named as not fixed:** F-14 / the §2.10 export surface — enumerated rather
than narrowed, KD-19. **And R2-4 through R2-21 of round 2, apart from R2-11 above** — only
the routed findings were touched. `qa/r2-access.mjs` (R2-6, a malformed `expiresAt` still
fails open) and `qa/r2-constraints.mjs` (R2-18) still report their findings, unchanged. So do
`qa/r3-cas2.mjs` probes 5–7, `qa/r3-merge.mjs`, `qa/r3-pool.mjs`, `qa/r2-copy2.mjs`,
`qa/r2-import.mjs`, `qa/r2-resolutions.mjs` and `qa/r2-browser.mjs`'s PoolPanel credit-line
probe — **all of them were captured before and after the round-4 pass and the two outputs are
byte-identical apart from `qa/r2-copy.mjs`'s R2-11 lines**, which is the finding that was
routed.

**And R3-3 and R3-5 … R3-9, which the round-3 persistence pass did not touch** — only R3-1,
R3-4 and R3-2 were routed. `qa/r3-merge.mjs` still FAILs its static probe (R3-3:
`mergeWithStored` assigns `saving` instead of chaining onto it) and `qa/r3-cas.mjs` probe A
says the same; both were run against `HEAD` *before* this pass and report identically, so the
pass neither fixed nor worsened them. `qa/r3-cas2.mjs` probes 5, 6 and 7 likewise still FAIL,
unchanged. §6's "not a compare-and-swap at the storage layer" bullet is struck: it has been
untrue since `a746d75`.

## 6. Not verified, and why

- **F-15's rendering is still unverified, though the call sites are not.** The fix is one
  argument, and it was applied to `derived.ts` and **missed in `cli.ts`** — where
  `npm run cli -- day 2026-08-13` on a EUR trip printed *"no rate table for: USD, EUR"* right
  through the clean-clone check at the end of this round. `boundaries.test.ts` now greps
  every `rollUpCost` call outside core for a `target:`, which is the guard that would have
  caught it. What is still not tested is the rendered string in `DayTimeline`: nothing in
  this repo renders React outside a browser. **Treat the React half of F-15 as
  fixed-by-inspection.** The lesson is the one this whole section exists for — a one-line fix
  applied to the place you were looking at is not a fixed defect.
- **F-12 disagrees with the review and I could not reconcile it.** The review reports
  `fromJSON` accepting `category:'nuclear'`, `source:'nsa'`, `kind:'telepathic'`,
  `lat:'33.9425'` and `lat:1e999`. I ran all five against `master` and all five are rejected
  with a `TripParseError` carrying a JSON path, and `oneOf`/`numOf` have been there since the
  first delivery. `serialize.test.ts` now pins fourteen such cases so the question cannot
  come back unanswered — but I do not know what the review ran, and "the finding does not
  reproduce" is a weaker statement than "the finding was wrong".
- ~~**The merge under a real IndexedDB race.** `store.save()` does `load` → compare → `save`
  with no transaction around it … this is **not** a compare-and-swap at the storage layer.~~
  **Struck — untrue since `a746d75`.** The compare, the write and (since the round-3 pass) the
  minting of the new `StorageVersion` all happen inside one IndexedDB `readwrite` transaction,
  and inside one synchronous block in the memory port. What replaces this bullet, honestly:
  - **Two tabs against one real IndexedDB is verified** — `qa/r2-race.mjs`, 0 of 3 rounds lost
    an edit; `qa/r2-tabs.mjs`; `qa/r3-browser.mjs`. What is *not* verified is more than two
    real tabs, or two tabs across two devices, which is Phase 2's `SyncPort`.
  - **A passively stale tab still reads "Saved".** A tab that has not written since storage
    moved holds an older document and its indicator says "Saved", because nothing notifies it.
    No edit is at risk — its next write is refused — but the ROADMAP ceiling "no moment at
    which two stores both render Saved while holding different documents" is only true of
    stores that have *written*. `storage-version.test.ts` asserts it in that form and says so
    in a comment. Closing it properly needs cross-tab notification, which Phase 1 has not got.
  - **A trip switch now blocks on the in-flight write** (§4.2 rule 6a). In the app that write
    always completes, but there is **no spinner or disabled state** while it does — the button
    just takes as long as the write takes. Not a defect against the spec; worth a UI pass.
- **The page-exit guarantee is deliberately weaker than it sounds.** `visibilitychange`→
  `hidden` and `pagehide` call `store.flush()`, and `beforeunload` calls `preventDefault()`
  while dirty. **An unload handler cannot await an asynchronous IndexedDB write**, and
  `pagehide`/`beforeunload`/`unload` are unreliable on mobile. Nothing here claims an edit
  survives an arbitrary tab close, and `page-exit.test.ts` deliberately does not assert it.
  The listener registration and the flush call are tested with fake targets in plain Node; the
  Chromium leg (hide the tab, find the edit in IndexedDB) is **not run** — `qa/r3-browser.mjs`
  covers the in-app `closeTrip` case instead, which is the one with a real guarantee.
- **Map tiles.** This sandbox has no route to `tile.openstreetmap.org`; every tile request
  fails with `ERR_TUNNEL_CONNECTION_FAILED`. Leaflet mounts, pins and the polyline render and
  bounds are applied — nobody has seen a tile behind them.
- **Safari and iOS.** Everything was driven in Chromium. The storage-eviction and
  installed-web-app behaviour in §1.1 is unverified on a device.
- **Real IndexedDB under quota exhaustion.** Covered through the in-memory port's `failAll`;
  not provoked against a real browser quota.

**Added by the round-4 freshness pass:**

- **Browser-initiated eviction is still not reproducible here.** `qa/r4-epoch.mjs` fires
  `indexedDB.deleteDatabase('cairn')`, which is the same mechanism §1.1's 7-day eviction uses,
  with a trigger we can pull. Chromium cannot be made to evict on demand, and the criterion
  says so rather than pretending. What is verified is the whole sequence with `deleteDatabase`
  as the trigger.
- **The `meta` object store's deletion is verified on a database that had one.**
  `qa/r4-epoch.mjs` boots against whatever the profile holds and asserts `meta` is absent
  after the upgrade. A profile carrying a *populated* revision-2 `meta` (Jacob's actual
  browser) was not available to test against; the upgrade path is `deleteObjectStore` inside
  `onupgradeneeded`, which is not conditional on the contents.
- **`crypto.getRandomValues` over plain HTTP was reasoned about, not measured.** The design's
  claim — `randomUUID` is secure-context-only, `getRandomValues` is not — is what drove the
  choice, and `qa/r4-epoch.mjs` runs over `http://localhost:4173`, which browsers treat as a
  *secure* context. **The case that matters (`http://<LAN-ip>:4173` from a phone) was not
  run.** If the claim is wrong, the fence throws and the store shows `'error'` — it fails
  closed, which is the deliberate design — but it would fail closed *on every write*.
- ~~**`qa/r2-browser.mjs` still FAILs its PoolPanel credit-line probe** (§2.14 rule 7: the
  pool item renders the badge but not `attribution`). Pre-existing, unrouted, untouched by
  this pass, and unchanged before and after it.~~ **CLOSED by KD-26** in the SEND-BACK pass:
  `PoolPanel` and `StopEditor` both render the credit now, the shared `creditLabel` is the one
  implementation, and `test/views.test.ts` holds the whole class as a grep-shaped ceiling
  rather than four hand checks. Verified in Chromium — `qa/r8-views.mjs` §2.
- **`copyStopInto` from a genuinely foreign trip.** Exercised over two local trips, which is
  the Phase 1 path, and over a hand-built `ownerId:'user:marta'` document in
  `copyStop.test.ts`. There is no server and no second user, so nobody has copied a stop
  across an account boundary.
- **`node --test` on Node 24.** ROADMAP specifies Node 24; this environment is Node 22.22.2,
  where type stripping is already unflagged and all 231 tests run. `engines` says `>=22.18`.
- **The boundary and disclosure tests were mutation-checked**, which is the only reason I
  trust tests that passed the first time they ran: adding `node:fs`, `@cairn/tokens` and an
  `apps/web` import to `core/src/derive/geo.ts` produced all three expected violations, and
  the file was restored.

## 7. The read-only boundary

`europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo root are the live app on
Jacob's phone. Cairn reads them and never writes them.

**This was violated once during this round, by my own test, and it is worth recording.**
Writing `test/cli.test.ts` before the F-16 guard existed meant the first run of that test
executed `cli export ../europe-2026-itinerary.html` — and overwrote the live planner with
JSON. It was restored from git within the minute and the final tree is byte-identical, but
"the test ran before the fix" is exactly how a read-only boundary gets crossed by someone
who is trying to protect it. The test now snapshots the file, restores it if it changed, and
*then* fails loudly — so a future regression is noisy rather than expensive.

---

## 8. Objections to the design — non-blocking

### SEND-BACK pass — three objections, none blocking, all implemented as specified anyway

- **§2.10's 69 does not include the arithmetic §2.12's own consumer row needs.** The day view
  is specified to render *"arrives 15:50"*, and computing it needs `HH:MM + minutes`. Core has
  that (`timeVal`), and revision 5 took it off the surface in the same document that asked for
  the render. The result is four lines of clock parsing in `packages/client` — a second
  implementation of something, which is what sequencing rule 1 is about. **KD-24** carries the
  detail and the one-import fix if the architect would rather put `timeVal` back on the list.
  I did not widen §2.10, because widening it is a documentation change and not mine to make.
- **§6.6's derived credential rule cannot be made exception-free against a real bundle, and
  the section does not say what to do about that.** The rule catches everything the redactor
  removes, which on Jacob's own prose includes the English word `OPTIONAL` — and `OPTIONAL`
  is also a property name of the importer's public input type, so it is in the bundle for a
  reason that has nothing to do with him. **KD-27** ships the rule with two named, asserted,
  live-checked exceptions. The alternative — a second pattern class that can tell an English
  word from a booking reference — is the thing KD-17 already decided against.
- **`getDerived()` now writes.** §2.7 says `syncResolutions` is called "whenever the client
  recomputes the derived conflict set", and §2.2b F2 says it must not run against a stale one;
  together those put the call inside `getDerived`, which makes a read into something that can
  change the document, schedule a save, and notify subscribers. It converges in one pass and
  it is what the two sections jointly ask for, but a reader who expects `getDerived()` to be
  a pure read will be surprised, and one existing ROADMAP-F test had to be rebuilt around it
  (**KD-25**). If the architect would rather the call sat on `dispatch`/`undo`/`redo` instead,
  that is a smaller surprise for a slightly weaker guarantee, and it is a one-line move.

- **`TripSummaryRow` has no timestamp.** The library cannot say "last edited" and sorts by
  start date. §2.10 is explicit about the export surface so I did not add one, but a trip
  list without "recently opened" will feel wrong past a handful of trips.
- **`cities: ['transit']` is a pseudo-city in the data.** The view copes, but the import
  arguably ought to materialise a real `transit` city from `CITY_META` — the live planner has
  one, with a name and a flag. That changes golden files, so it is an architect call.
- **`PersistenceState.status` has no `'conflict'`.** ~~A refused stale write is reported as
  `'error'`~~ — **stale, resolved in revision 3: `'conflict'` exists and is what a refusal
  sets.**

### Round 4 — two readings I had to choose between, both flagged rather than settled

Neither blocked the work and neither is a redesign, but both are places where the design
admits two readings and I picked one. If the breaker disagrees with either, the disagreement
is with a sentence in ARCHITECTURE, not with the code.

- **`accepted_by_non_member` fires on a *set* actor who is not a member; a `null` actor on an
  attributed, accepted record does not fire it.** §2.9 says "whose `provenance.actorUserId`
  is not a member of the trip", and `null ∉ members(trip)`, so a literal reading would fire.
  §2.14 reads the other way: the null-actor half is what the **throw** at the call site is
  for, and `accepted_by_non_member` is described as "a **wrong** (non-member) actor". I took
  the second reading — the issue's `params` carries "both the actor and the owner", and there
  is no actor to carry when it is `null`. Consequence if it is wrong: a hand-edited or
  Phase 2-synced document with `{source:'friend', state:'accepted', actorUserId:null}` passes
  validation. It cannot be produced by any call in this codebase.
- **The rule is scoped to records with a non-null `attribution()`, not to
  `source !== 'user'`.** §2.9 states the scope as "a record with a non-null `attribution()`"
  and gives the reason ("that is exactly §2.14's subject — the credited copy"), so that is
  what is implemented. The practical difference: a `source:'system'` suggestion accepted by a
  non-member is **not** flagged. That follows from the design as written; it is worth an
  architect's eye anyway, because "a stranger accepted our suggestion on your behalf" is the
  same category of claim.

## 9. Why two tsconfigs

`tsconfig.json` covers core, client, the tests, `test/` and the CLI, and is deliberately
strict Node ESM (`module: NodeNext`, `erasableSyntaxOnly`, `verbatimModuleSyntax`) — that is
what lets `node --test` run the `.ts` files with no build step. `apps/web/tsconfig.json`
extends it and switches to bundler resolution with JSX. Merging them would mean weakening
the first to accommodate the second. `npm run typecheck` runs both.
