# Cairn — QA findings, Phase 1 **rounds 2, 3, 4, 5 and 6**

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
