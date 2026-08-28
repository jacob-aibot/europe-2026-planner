# QA reproduction scripts

The scripts behind `cairn/docs/QA-FINDINGS.md`. They are **not** part of the product and are
not run by `npm test`. Each one is a standalone probe; run it from this directory.

```bash
cd cairn/qa
node accept.mjs        # every ROADMAP Phase 1 acceptance number, re-derived independently
node attack1.mjs       # zero-day / inverted / impossible-calendar trips; immutability; displayStatus matrix
node attack2.mjs       # validateTrip density, geo typos, out-of-range coords, pool round trip
node attack3.mjs       # geo_outlier scope; conflict ids under an Aug 18 edit
node attack5.mjs       # F-5: the Fisherman's Bastion typo vs geo_outlier / validateTrip coverage
node attack6.mjs       # legacy -> core coordinate parity for scheduled and pool stops
node attack7.mjs       # F-12: malformed / hostile documents, prototype pollution, unicode round trip
node attack8.mjs       # F-7: updateStop patch escape; rollUpCost target
node access.mjs        # the full 12-principal x 5-operation access matrix (F-13)
node client1.mjs       # F-2 (headless), ui leakage, undo/redo depth, save failure, quota
node confid.mjs        # F-9: the Aug 18 conflict-id criterion
node confid2.mjs       # F-10: dismissed-conflict resurrection, resolutions growth
node probe1.mjs        # F-4: the 12 blockers, listed
node prov.mjs          # F-6, F-7, F-17: provenance escape paths
node rev.mjs           # revision bumping and derived-cache keying
node rules.mjs         # F-8 and the rules that stay silent on the fixture
node --experimental-strip-types r18-readonce.mjs   # A-21/A-21a: the read-once census (round 18)
```

Browser probes need `npm run web:build && npm run serve` in one shell first, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node browser2.mjs   # badges, spine, Aug 8 map
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node browser3.mjs   # map refit, corrupt document
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node browser4.mjs   # F-2 in a real browser, two tabs
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node browser5.mjs   # F-1 two tabs, one trip; zero-day trip
```

A "FAIL" line in this directory means the probe found what it was looking for. Read the
finding in `../docs/QA-FINDINGS.md` before assuming a script is broken.

---

## Round 2 (2026-08-25, `master` @ `fcceb56`)

Written against the re-delivery. `cairn/docs/QA-FINDINGS.md` names the finding each one
backs. Headless probes run from `cairn/`:

```bash
node qa/r2-copy.mjs         # copyStopInto: every provenance escape path; credentials in notes (R2-3)
node qa/r2-copy2.mjs        # the copy through the client store: undo/redo, Place copy, browse read-only
node qa/r2-import.mjs       # importDoc F-2/F-6 re-check; storage failure, quota, corrupt documents
node qa/r2-resolutions.mjs  # R2-7: syncResolutions has no caller, so a dismissal still resurrects
node qa/r2-access.mjs       # R2-6: F-13 re-check, and the share's own dates failing open
node qa/r2-data.mjs         # real-trip shapes; travelRole x geoCheck x copy interactions (R2-9)
node qa/r2-constraints.mjs  # cairn-constraints: determinism, DOM, zero-dep, coordinates in params
node qa/r2-redact.mjs       # R2-4: the credential set derived from the trip, greped against dist/
```

`r2-redact.mjs` needs `npm run web:build` first. Browser probes need
`npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-browser.mjs    # Browse & copy, badges, credit line
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-poolloss.mjs   # R2-2: a pooled transit stop vanishes
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-tabs.mjs       # the revision guard's sequential case
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r2-race.mjs       # R2-1: two tabs at once, an edit lost
```

`r2-race.mjs` is timing-dependent by nature: it lost an edit in 2 of 3 rounds when filed.

---

## Round 3 (2026-08-26, `master` @ `a746d75`)

Re-verification of the R2-1 / R2-2 fix. `cairn/docs/QA-FINDINGS.md` names the finding each one
backs. Headless probes run from `cairn/`:

```bash
node qa/r3-cas.mjs      # the atomic saveIfRevision: 3-way race, self-race, in-flight trip switch,
                        # storage failure mid-chain, ABA, corrupt records, rapid-fire dispatches
node qa/r3-cas2.mjs     # R3-4/R3-5/R3-8/R3-9 — ABA in a user-shaped sequence, corrupt records x6,
                        # the catch-all's double render, the transcribed save indicator
node qa/r3-undo.mjs     # R3-1 (BLOCKER) — undo lowers the stored revision and reopens R2-1
node qa/r3-loss.mjs     # R3-2 (BLOCKER) — the 400 ms debounce vs closeTrip / openTrip
node qa/r3-merge.mjs    # R3-3 — mergeWithStored assigns `saving` instead of chaining onto it
node qa/r3-pool.mjs     # R2-2's fix: poolCityFor, pool_stop_unknown_city, the catch-all round trip
```

Browser probes need `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r3-browser.mjs   # R3-1 and R3-2 in real IndexedDB
```

`r3-browser.mjs` is **not** timing-dependent: both cases are deterministic sequences, not races.
R2-6, R2-11 and R2-18 were re-confirmed with the unmodified round-2 scripts (`r2-access.mjs`,
`r2-copy.mjs`, `r2-constraints.mjs`) and are unchanged by `a746d75`.

Note: `r3-pool.mjs` was corrected in this round — it was calling `addStop(trip, dayId, …)` and
`setDayMeta(trip, id, patch, ctx)`, and the real signatures are `addStop(trip, placement, init,
ctx)` and `setDayMeta(trip, id, patch)`. It aborted at section 2 before the fix.

---

## Round 4 (2026-08-26, `master` @ `3a124a2`) — the phase-gate re-verification

Written against the §2.2a `StorageVersion` / flush-before-switch delivery. Headless probes
run from `cairn/`:

```bash
node qa/r4-switch.mjs   # R4-1 (BLOCKER) §1-3; 3 and 4 concurrent tabs; a trip deleted under
                        # another tab; mergeWithStored vs a switch; importDoc onto a live id;
                        # §10 falsifies ARCHITECTURE §2.2a rule 1's "equal revision implies
                        # identical content" in six lines
```

Browser probes need `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-browser.mjs  # R4-1 in real IndexedDB, and
                                                                  # the visibilitychange/pagehide
                                                                  # leg BUILD-NOTES §6 never ran
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r4-epoch.mjs    # R4-2 (BLOCKER) — a token from
                                                                  # a destroyed database accepted
                                                                  # by its replacement
```

Neither is timing-dependent: both are deterministic sequences, not races. `r4-browser.mjs` §1
does depend on the second edit landing inside the 400 ms debounce that follows the undo, which
is why it uses `DayTimeline`'s ↑/↓ reorder button (one click, one dispatch) rather than the
rename dialog.

R3-3, R2-6, R2-11 and R2-18 were re-confirmed with the unmodified scripts (`r3-merge.mjs`,
`r2-access.mjs`, `r2-copy.mjs`, `r2-constraints.mjs`) and are unchanged by `3a124a2`.
`r3-cas2.mjs` probe **3** now passes — R3-5 is closed as a side effect of the fence redesign,
which the builder's report did not claim.

---

## Round 5 (2026-08-26, `master` @ `c3c79b3`) — verification of the §2.2b freshness rule

Written against the R4-1 / R4-2 / R2-11 delivery. Headless probe runs from `cairn/`:

```bash
node qa/r5-freshness.mjs   # §1 the dirty oracle over mergeWithStored / createTrip / importDoc /
                           #    deleteTrip / syncResolutions — the transitions dirty.test.ts's
                           #    200-step walk never visits
                           # §2 every way to fool flushForTransition's three-conjunct skip,
                           #    including R5-3 (the not-dirty 'conflict' trap)
                           # §3 the token mint: 200 port instances, 300k CSPRNG mints, opacity,
                           #    and the no-token-literal ceiling
                           # §4 the derived cache's (doc identity, today) key
                           # §5 the R2-11 ruling — requireActor, accepted_by_non_member, and
                           #    R5-2's null / undefined / '' actor (the classification finding)
                           # §6 R5-1 (BLOCKER) — an edit dispatched during a transition's own
                           #    flush, across all six transitions by name
```

Browser probe needs `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r5-browser.mjs   # R5-1 through the shipped UI
```

`r5-browser.mjs` is **not** a race in the flaky sense — it sweeps the delay between the "Cairn"
click and the ↓ click across 0/1/2/4/8 ms and reproduced at all five when filed. It is timing-
*shaped* by nature (the window is the length of one real IndexedDB write), so `r5-freshness.mjs`
§6 is the deterministic form and is what a fix should be verified against first.

R4-1 and R4-2 were re-verified with the unmodified `qa/r4-browser.mjs` (4/4 ok) and
`qa/r4-epoch.mjs` (6/6 ok). R3-3, R3-6…R3-9, R2-6, R2-7, R2-9, R2-11 and R2-18 were re-run with
the unmodified round-2/3 scripts and are unchanged by `c3c79b3`.

**Two round-2 probes no longer run at all** and were left alone rather than quietly repaired:
`qa/r2-copy2.mjs:86` and `qa/r2-import.mjs:51` both do `JSON.parse(await storage.load(id))`, and
`StoragePort.load()` has returned `{doc, version}` since `3a124a2` (ARCHITECTURE §2.2a rule 4).
They have not executed since round 2; anyone re-running them needs `.doc` first.

---

## Round 6 (2026-08-26, `master` @ `5f92145`)

Independent verification of the R5-1 / R5-2 / R5-5 fix pass. Headless, from `cairn/`:

```bash
node qa/r6-flush.mjs   # the R5-1 drain loop, attacked: mid-flush edits on the same and on
                       # another trip, the bound exhausted with a REAL scheduler, a refusal
                       # arriving mid-loop, all six transitions propagating false, R3-3 x the
                       # loop, deleteTrip(active) racing a parked flush
node qa/r6-actor.mjs   # accepted_by_non_member over ten actor shapes x four ref kinds, the
                       # §2.14 exemptions, the reference-trip ceiling re-derived, and R5-5's
                       # export surface
```

Both are **oracles, not confirmations**: against the pre-fix code (`flushForTransition` reverted
to `d97feed`'s single pass, `if (!actor || …)` restored, `accept`/`reject` re-exported, all in a
scratch copy) they report 12 FAIL and 17 FAIL respectively, versus 3 and 5 at `5f92145`. The
FAILs that remain at `5f92145` are R6-1/R6-2 (`r6-flush.mjs` §3), R3-3's static probe
(`r6-flush.mjs` §6, a known-open finding restated) and `r6-actor.mjs`'s params-fidelity note on
non-string actors, which is an observation rather than a filed defect — see QA-FINDINGS round 6.

`qa/r5-freshness.mjs` still crashes at `:602` on `core.accept`, which is the R5-5 fix taking
effect. It was **not** patched, deliberately, same ruling as `r2-copy2.mjs` / `r2-import.mjs`
above; §1–§5 still run and were used this round.

---

## Round 7 (2026-08-26, `master` @ `32a3839`)

Independent verification of the R3-3 fix (`chainOntoSaving`). Headless, from `cairn/`:

```bash
node qa/r7-chain.mjs      # the chain, attacked: a THREE-way pile-up (autosave + flush() +
                          # mergeWithStored) measured at the port; a genuine third writer
                          # landing mid-queue; a link that really rejects (the `.catch(() => {})`
                          # claim); the merge branch rejecting; R5-1's drain loop x the chain;
                          # merge LATENCY and what is on screen for it; the button pressed twice;
                          # the deleted-trip branch; a stalled chain; deleteTrip off the chain;
                          # and the structural claim (one saveIfVersion call site, three
                          # writeAndSettle, all inside chainOntoSaving)
node qa/r7-r6recheck.mjs  # R6-1/R6-2's SEVERITY re-derived independently of r6-flush.mjs:
                          # the bound-exhausted abort, then all three backstops — the next
                          # keystroke, registerPageExit (visibilitychange AND pagehide), and
                          # beforeunload's preventDefault
```

Browser probe needs `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r7-browser.mjs   # R3-3 end to end through
                                                                  # the shipped UI, and R7-1's
                                                                  # reachability swept at
                                                                  # 0/30/80/150 ms
```

`r7-chain.mjs` is an **oracle, not a confirmation**: against the parent commit `584c218` (in a
scratch `git worktree`, never in `cairn/`) it reports **10 FAIL**; at `32a3839` it reports **3**,
and all three of those also FAIL at `584c218`, so nothing it still reports is a regression.
`r7-r6recheck.mjs` reports **0 FAIL** — a FAIL there would mean R6-1/R6-2 are worse than MINOR.
`r7-browser.mjs` is timing-*shaped* but not flaky: §2 sweeps four inter-click gaps and the
second press fails to land at all four.

**Probe rot found this round and deliberately not patched** (same ruling as rounds 5 and 6):

- `qa/r6-flush.mjs` §6's static check is `/^\s*saving = (?!saving)/gm`, which now matches
  `chainOntoSaving`'s own `saving = run;` and falsely reports R3-3 open. `qa/r3-merge.mjs`'s
  check (`/^\s*saving = \(async/`) is the correct one. One of `r6-flush.mjs`'s three FAILs is
  stale; R6-1/R6-2 account for the other two.
- `qa/r2-constraints.mjs`'s zero-dep check counts `packages/client`'s workspace-internal
  `{"@cairn/core": "*"}` as a runtime dependency. The root workspace declares none at all.
  Only R2-18 is a real FAIL in that probe.
- `qa/r5-freshness.mjs:602`, `qa/r2-copy2.mjs:86`, `qa/r2-import.mjs:51` remain rotten.

---

## Round 8 (2026-08-27, `master` @ `0a58c81`) — the gate-breaker pass over the SEND-BACK work

Narrow: the diff `5bdd0dc..0a58c81` only (B-1…B-7, A-1…A-4). R2–R7 were **not** re-run.
Headless, from `cairn/`:

```bash
node qa/r8-geo.mjs      # A-1 (§2.13 revision 5) falsified twice — R8-2, the copied PLACE
                        # rule 4 drags in mints a geo_outlier BLOCKER on the real fixture;
                        # R8-3, accepting a copied stop REPLACES the adjacent-day anchor and
                        # mints a blocker on a user-authored stop. §3 is the half A-1 did
                        # deliver: copy-of-a-copy place chains, credit direction, exemption.
node qa/r8-persist.mjs  # §1 R8-4 — mergeWithStored's OFF-CHAIN load() lets an in-flight merge
                        #    resurrect a trip the delete link just removed (A-2)
                        # §2 the delete orderings A-2 did close (confirmations)
                        # §3 R8-1 — undo restores a PRE-RETIREMENT snapshot, so a dismissed
                        #    blocker comes back dismissed (§2.7, opened by B-2's own fix)
                        # §4 B-4/A-3 — the bound exhausted for real, all three obligations,
                        #    plus the two exits that must not re-arm (confirmations)
                        # §5 B-6's R7-1 merge guard and R7-2 unhandled rejection (confirmations)
```

`r8-geo.mjs` reports **2 FAIL** and `r8-persist.mjs` **2 FAIL**, and in both cases every other
section is a confirmation that must stay at 0. Neither is timing-dependent: `r8-persist.mjs`
§1 forces the interleaving with a port whose `load()` takes 60 ms, which is an ordinary
IndexedDB read, not a race window.

Browser probes need `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r8-views.mjs  # the builder's own probe,
                                                                # re-run unmodified: 0 FAIL
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r8-undo.mjs   # R8-1 as a user: four clicks
                                                                # and Ctrl+Z, 1 FAIL
```

`r8-undo.mjs` is `r8-views.mjs` §4 with the last leg replaced by the app's own Ctrl+Z. It is a
deterministic click sequence, not a race.

**Probe rot re-confirmed and again not patched** (same ruling as rounds 5–7): `qa/r6-flush.mjs`
samples `status` 200 ms after the abort, and `r8-persist.mjs` §4 shows the re-armed write lands
and clears the banner inside that window — the assertion is stale, the product is right.
`qa/r5-freshness.mjs:602` still crashes on `core.accept`.

---

## Round 9 (2026-08-27, `master` @ `773f8ea`) — the A-5 / A-5a / A-6 gate verification

Narrow: four items only — R8-1 across undo *with the A-5a veto present*, KD-36's second
dismissal across further edits, the same case across a storage round-trip/reseed, and A-6's
copy-borne `Place`. R2–R8 were **not** re-litigated; R8-3 and R8-4 were deliberately not
investigated. Headless, from `cairn/`:

```bash
node qa/r9-ledger.mjs   # §1 R8-1 with the veto: six undo/redo cycles, undo PAST the
                        #    conflictId's creation, the stale-mark leak, and a retirement
                        #    that happens while a live row for the same id is present
                        # §2 KD-36 case 1: ten further edits, edits on the conflict's OWN
                        #    subject day, an id-moving edit and back, undo/redo after the
                        #    second dismissal, and a THIRD dismissal (3 rows, one id)
                        # §3 KD-36 case 2: five close/reopen round trips, an A -> B -> A trip
                        #    switch, and the `mergeWithStored` reseed path
                        # §4 R9-1's root cause isolated: the same live row put back by
                        #    `redo()` vs by `dispatch()`, one difference — releaseRetirement
node qa/r9-geo.mjs      # §1 two copied stops from TWO source trips, incl. `samePlace` reuse
                        # §2 accepting one of two copies, then both
                        # §3 user-authored -> copy-only and back (`every`, not `some`)
                        # §4 R9-2 — reject (fine) vs remove (mints a blocker on the orphan)
                        # §5 R9-2 on the REAL fixture through the store: Browse, Copy, ×
```

`r9-ledger.mjs` reports **4 FAIL**, all one root cause (R9-1). `r9-geo.mjs` reports **3 FAIL**,
all one root cause (R9-2); everything else in both files is a confirmation that must stay at 0.
Neither is timing-dependent — both are deterministic call sequences.

Browser probe needs `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r9-redo.mjs   # R9-1 as a user: seven
                                                                # actions, and the redone
                                                                # dismissal is stillborn
```

`r9-redo.mjs` is `r8-undo.mjs` continued by three more actions (a second "Not a problem",
Ctrl+Z, Ctrl+Shift+Z). Deterministic, not a race; 2 FAIL, both R9-1.

Round-8 probes re-run **unmodified** this round and unchanged by `773f8ea`: `qa/r8-geo.mjs`
**1 FAIL** (R8-3, out of scope — R8-2 closes), `qa/r8-persist.mjs` **1 FAIL** (R8-4, out of
scope — R8-1 closes), `qa/r8-undo.mjs` in Chromium **0 FAIL**. `npm run test:tap` 412/0.

---

## Round 10 (2026-08-27, `master` @ `9ced6e7`) — the A-5b / A-6a gate re-verification

Narrow: two items only — A-5b (`redo` releases the retirement ledger) and A-6a (`removeStop`
prunes the one `Place` a copied stop orphans). R8-3, R8-4 and the round 2–7 open list were
**not** re-run. Headless, from `cairn/`:

```bash
node qa/r10-redo.mjs       # A-5b past retirement-ledger.test.ts: empty future, unrelated
                           #   redo, undo of an `unresolveConflict`, two interleaved
                           #   conflicts, the 50-entry history limit, an A->B->A switch, a
                           #   merge reseed, and the A-5b invariant after every step
                           #   3 FAIL — all R10-1 (MINOR), all pre-existing at 9ba5aec
node qa/r10-prune.mjs      # A-6a past geoCheck.test.ts: the four clauses one at a time
                           #   (pool, accepted, rejected, copy-of-a-copy, duplicate stop id,
                           #   purity, one revision bump), the anti-sweep guards, dangling
                           #   references, undo/redo, the real fixture at scale
                           #   1 FAIL — §5, R10-2 (MAJOR): the `updateStop` door
node qa/r10-mergeundo.mjs  # R10-3 (BLOCKER) — one Ctrl+Z after a merge writes a pre-merge
                           #   snapshot over storage and destroys the other tab's edit
                           #   2 FAIL
```

Everything else in both `r10-*` probes is a confirmation that must stay at 0. None are
timing-dependent: all are deterministic call sequences.

Browser probe needs `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r10-editdoor.mjs  # R10-2 as a user: six
                                                                    # actions, and the
                                                                    # copy-borne Place is
                                                                    # orphaned in IndexedDB
```

Round-9 probes re-run **unmodified** at `9ced6e7`: `qa/r9-geo.mjs` **ALL OK** (was 3 FAIL,
R9-2 closed), `qa/r9-redo.mjs` in Chromium **0 FAIL** (was 2, R9-1's user-visible repro
closed), `qa/r9-ledger.mjs` **2 FAIL** (was 4; the two that remain are §1.2c/d = R10-1, a
sequence A-5b clause 2 declines by construction). `npm run test:tap` 420/0.

## Round 11 — after the R10-3 / R10-2 fixes (`c6c6e2b`)

```bash
node qa/r11-recheck.mjs     # §1 R10-3 past the builder's test: a non-empty `future` at merge
                            #   time, ten undos after a merge, and typing THROUGH the merge
                            #   write
                            #   2 FAIL — §1.3b/§1.3c, R11-1 (BLOCKER, pre-existing race):
                            #   `stillOurs` discards the merged document and the un-merged
                            #   local one is autosaved over storage. No undo involved.
                            # §2 R10-2 past it: place -> none, a re-point to a DIFFERENT
                            #   place, a pooled copy, moveStop/reorderStop, the pool-side
                            #   over-prune guard, the reducer action
                            #   0 FAIL
```

All three round-10 probes re-run **unmodified** at `c6c6e2b`: `qa/r10-mergeundo.mjs` **0 FAIL**
(was 2, R10-3 closed), `qa/r10-prune.mjs` **ALL OK** (was 1 FAIL, R10-2 closed),
`qa/r10-editdoor.mjs` in Chromium **0 FAIL** (was 1). `npm run test:tap` 426/0.

---

## Phase 2, I-0 — probe repair and the measured baseline (`master`, after `a55634f`)

Sixteen probes were dead or stale. **None was deleted**; each carries the reason for its repair
at the call site, and BUILD-NOTES' current status note has the one-line-per-probe table.

Seven had *crashed* and had not executed past their first bad line for several rounds:
`attack3.mjs` (`updateStop({placement})` now throws), `attack8.mjs` / `confid.mjs` (both
targeted an `impossible_transfer` §2.12 took to zero), `prov.mjs` (`importDoc` of a foreign
document now throws by design), `r2-copy2.mjs` / `r2-import.mjs` (`load()` returns
`{doc, version}`; `save()` became `saveIfVersion()`), and `r5-freshness.mjs` (`core.accept`,
un-exported by R5-5).

Nine asserted a contract the architecture had **deliberately changed** — a deleted issue code
(`stop_far_from_city`), a retracted ROADMAP revision-1 criterion, a renamed `params` key
(`stopName` → `name`), a dropped rule (`closed`), and three closed findings (R3-3, R7-3, R2-7)
whose fixes the probes were still reporting as open.

Two new probes:

```bash
node qa/baseline.mjs        # the six Phase 2 baseline numbers, derived by RUNNING:
                            #   detectConflicts at FIXTURE_TODAY = 2 blockers / 4 warn / 11 notes
                            #   geoCheck clean          = 0/112 stops, 0/94 places
                            #   geoCheck under +1 deg   = 112/112 stops, 92/94 places
```

The browser probe needs `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/p2-pasttrip.mjs
                            # I-4 end to end: record a past trip, the persisted document,
                            # the lifecycle chips, exit criterion 3 on screen, and the
                            # injected fault with the browser's Date pinned mid-trip
```

**FAILs that are still real open findings and were left alone:** `r10-redo` 3 / `r9-ledger` 2
(R10-1) · `r7-r6recheck` 3 / `r6-flush` 1 (R6-1/R6-2) · `r8-geo` 1 (R8-3) · `r8-persist` 1
(R8-4) · `r6-actor` 5 · `r3-cas2` 3 / `r3-pool` 3 · `r5-freshness` 4 · `r2-constraints` 1 (its
zero-dep false positive **is** repaired; the determinism-grep one is a genuine gap) ·
`r2-import` 1 (**new** — `fromJSON` rejects an absent `ownerId` that §2.14 rule 1 permits).

---

## Round 12 (2026-08-27, `master` @ `5a3c723`) — the Phase 2 **2a** breaker pass

Narrow: the diff `8df2ae6..5a3c723` only — `lifecycle()`, `Trip.datePrecision`, `Rule.class` +
the `detect.ts` feasibility gate, `PastTripForm.tsx` (incl. KD-38's city assignment), and the
`fromJSON`/`importDoc` absent-`ownerId` fix (KD-40). Phase 1's open list was **not**
re-litigated. Headless, from `cairn/`:

```bash
node --experimental-strip-types qa/p2b-gate.mjs
        # §1  the gate: the ten classes vs §8.2's table; a wholly-past trip (integrity
        #     identical by id AND count, feasibility gone); a STRADDLING trip with a real
        #     city on every day; `subjectDate` over all seven ref shapes incl. the pool /
        #     place / trip / unknown-id fallbacks; ruling 1's asymmetry on the subjects
        #     themselves; ruling 3 (`today` omitted / undefined / `''`); the un-padded
        #     `today` the gate accepts and `lifecycle` rejects; the `rule_error` claim
        #     (P2-4); the gate x the retirement ledger (P2-1); the Phase 1 ceiling
        # §2  datePrecision: an independent grep walk of the ceiling; 11 malformed values;
        #     absent -> 'exact' through fromJSON AND migrateDoc; round-trip parity both
        #     ways; undo/redo x 50; mergeTrips (P2-3); setTripMeta (P2-7); the summary row
        #     the Library renders (P2-6)
        # §3  the form's document rebuilt through its own three dispatches; the city-key
        #     slug (P2-2); the "a year" path at 365 days
        # §4  ownerId: absent / null / non-string x 8 / a real foreign owner / `''` /
        #     one space / the deleted-key bypass (P2-8)
```

The browser probe needs `npm run web:build && node tools/serve.mjs` in one shell, then:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/p2b-past.mjs
        # §1 a straddling trip recorded through the real form with a real city on every day
        # §2 "a year" precision — 365 days and 366 dispatches behind one click, timed by
        #    POLLING IndexedDB rather than sleeping, then one Ctrl+Z (P2-5)
        # §3 a trip to Japan named in Japanese — both cities become key "-" (P2-2)
        # §4 the Library's range label vs the open trip's (P2-6)
```

`p2b-gate.mjs` reports **19 FAIL** and `p2b-past.mjs` **6 FAIL**, all by design; everything
else in both files is a confirmation that must stay at 0. Neither is timing-dependent — both
are deterministic call/click sequences.

Re-run **unmodified** this round and unchanged by `5a3c723`: `qa/baseline.mjs` 0 FAIL,
`qa/accept.mjs` 28/0, `qa/r2-import.mjs` 0 FAIL, `qa/prov.mjs` 0 FAIL, `qa/p2-pasttrip.mjs`
in Chromium 0 FAIL (30 assertions), `qa/r2-constraints.mjs` 1 FAIL (R2-18, known).
`npm run test:tap` 479/0, `npm run typecheck` clean, `npm run web:build` clean.

---

## Round 13 (2026-08-27, `master` @ `4dd50d1`) — the I-3a / I-4a breaker pass

Narrow: the diff `23f37b9..4dd50d1` only — §2.7 **A-9** (retirement vs the clock,
`syncResolutions(trip, at)`, `detectUngated`, the deleted `delta < 0`), §2.2 **A-10** (`CityKey`
is a minted opaque id, the three new `validateTrip` codes, the slug deletion in the two web
forms), and the follow-ups **KD-42** (the 71 export count) and **KD-44** (`geoOutlier`'s
city-label fallback). Phase 1's open list, P2-5 and P2-8 were **not** re-litigated.

```bash
node --experimental-strip-types qa/r13-gate-citykey.mjs
        # §1  R13-1 — `unbooked_ticketed`'s SURVIVING `delta > 60` guard is a second
        #     clock-driven suppression and `detectUngated` applies it, so one clock step
        #     BACKWARDS across the 60-day boundary permanently retires a live dismissal.
        #     Core (§1.2) and through the real store + storage port (§1.3).
        # §2  the gate crossed in both directions, alone and combined with real edits; a
        #     genuine fix still retires at any clock, in core and into storage   (0 FAIL)
        # §3  R13-2 — A-9 assertion 4's substituted test: the `setTripMeta({endDate})` is
        #     inert, and the literal A-9(4) is unachievable for `missing_lodging`
        # §4  R13-3 — a crashed rule retires every dismissal it owned; plus the five content
        #     routes into a crash that `fromJSON` refuses (why it stays MINOR)
        # §5  `detectUngated` off `index.ts`, unnamed by client/web/cli, absent from the
        #     built bundle, no deep module-path import anywhere              (0 FAIL)
        # §6  A-10: 22 adversarial names -> 22 distinct keys; the three new codes; an
        #     explicit `key:''`; `fromJSON`/`migrateDoc`/`importDoc` silence on a collapsed
        #     pre-A-10 document; the reference trip's keys and its 11 issues   (0 FAIL)
        # §7  KD-42 re-derived both ways (71 / 71) — and R13-4, the stale `70` left in
        #     `detect.ts:192` by the same pass that corrected the docs
        # §8  R13-5 — KD-44's phrase composed into the sentence a person reads, at both
        #     label sites
        # §9  the ceilings, by running: 2/4/11 at FIXTURE_TODAY; un-gated 17 vs gated 5 on
        #     the completed trip; `ctx.today` in exactly one rule file          (0 FAIL)
        # §10 R13-6 — A-10 x `copyStopInto`: a cross-trip copy imports the SOURCE trip's
        #     minted CityKey on the copied `Place`, so the recipient's document reports
        #     `unknown_city_key` (error). Control: the same copy under the pre-A-10 slug
        #     is clean.
```

**16 FAIL by design**; everything else in the file is a confirmation that must stay at 0.
Not timing-dependent — deterministic call sequences only, no races and no sleeps.

The two **byte-identity** claims were re-derived rather than trusted, and the recipe is not in
the probe because it needs a second checkout:

```bash
git worktree add /tmp/pre 23f37b9        # the commit before I-3a/I-4a
# run the same dump script against both trees and diff — conflicts + issues + summary +
# cities on the reference trip at FIXTURE_TODAY, 2026-08-10, -08-14, -08-27, 2027-01-01,
# 2019-01-01 and with no clock: 52229 bytes, identical.
cd /tmp/pre/cairn && npm run golden      # pre-change code
diff -r /tmp/pre/cairn/fixtures/golden cairn/fixtures/golden   # identical
cd cairn && npm run golden && npm run sample && git status --porcelain   # empty
```

Re-run this round: `qa/p2b-gate.mjs` **5 FAIL** (exactly the five the builder disclosed — P2-5,
P2-8 ×2, the §1.7 un-padded-`today` crash, the §2.1 `summary.ts` ceiling), `qa/confid2.mjs`
**0 FAIL**, `qa/r2-constraints.mjs` **1 FAIL** (R2-18, known). `npm run test:tap` 515/0,
`npm run typecheck` clean, `npm run web:build` clean, `npm run cli -- trip|conflicts` run.

Browser probe, needing `npm run web:build && node tools/serve.mjs` in one shell:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/p2b-past.mjs   # 3 FAIL, all probe rot
```

The builder disclosed that he had **not** re-run this one, so I did. Its §3 confirms A-10 end to
end in a real browser — 東京 and 京都 get two distinct minted keys (`city_5f59852c43dc`,
`city_f545e99a1ba1`), day 1 carries the first, 0 validation issues. Its 3 FAILs are **R13-8**:
§1c and §2d still assert `primaryCity === 'tokyo'` (the deleted slug's output) and §3d still
expects the app to *report* a collapse that no longer happens. Left unpatched, same ruling as
rounds 5–10 — a probe that measures a deleted expression is a finding, not a repair job for the
breaker.

---

## Round 14 (2026-08-27, `master` @ `fb3ff34`) — the A-11 / A-12 / A-13 / A-14 breaker pass

Narrow: the diff `4dd50d1..fb3ff34` only — `Rule.horizonDays` + `beyondHorizon` (**A-11**),
`detectUngatedChecked` + `syncResolutions`' crash refusal (**A-12**), the substituted A-9(4)
test and its `endDate`-fallback tripwire (**A-13**), and `copyStopInto` rule 4's three-step
re-filing + the new `model/cityName.ts` (**A-14**). R13-4, R13-5, P2-5, P2-8 and the Phase 1
open list were **not** re-litigated.

```bash
node --experimental-strip-types qa/r14-horizon-copy.mjs
        # §1  A-11 past its own six-clock sweep: 434 clocks x 10 documents; the 60-day
        #     boundary in both sets; injected rules at horizon 0 / -1 / NaN / Infinity / 1e9,
        #     an INTEGRITY class, a horizon-free rule beside a horizoned one, mixed-date and
        #     empty subject sets; §1.4's pre-vs-post differential and §1.5, the horizon
        #     leaking 73 days out on a duplicate-stop-id document      (R14-1, 2 FAIL)
        # §2  KD-48 re-derived from the FIXTURE by hand, not from the rule: ten, and the
        #     three named cases are among them                                     (0 FAIL)
        # §3  A-12 vs 1/2/4/ten simultaneous crashes, a CLOCK-DEPENDENT crash over a
        #     genuinely-fixed dismissal, 25 crash/recover rounds, and the real store
        #                                                                          (0 FAIL)
        # §4  A-13's tripwire: shape, 5/5 rule coverage, and forced RED in a scratch
        #     worktree by a real rule increment (a ticketed pool stop)              (0 FAIL)
        # §5  A-14: assertions 1-5; the three-same-named-cities tie-break x5; R14-2, the
        #     WITHIN-trip copy A-14 says is unchanged (§5.2, §5.7, §5.10 through the store);
        #     R14-3, the aliased inline PlaceLink (§5.3); eight Unicode folding cases;
        #     double-hop copies; KD-47's disclosed gap; the reworked
        #     `lisbonWithCopiedPlaceStop` fixture measured against the one it replaced; and
        #     §5.9 R14-4 (BLOCKER) — the copied PLACE's note and links cross the trip
        #     boundary unredacted           (R14-2 x5, R14-3 x2, R14-4 x6)
        # §6  cross-cutting: copy -> horizoned conflict -> unrelated crash -> retirement
        # §7  the ceilings re-derived by running: 71 exports, conflicts at five clocks,
        #     validateTrip, goldens + sample, KD numbering, test/disclosure.test.ts  (0 FAIL)
```

**15 FAIL by design** with both worktrees present, **14** without (the missing one is §1.4's
differential; §1.5 carries R14-1's other half and needs no second checkout) — R14-1 ×2, R14-2 ×5,
R14-3 ×2, R14-4 ×6. Every other line in the file is a confirmation that must stay at 0. Not
timing-dependent — deterministic call sequences only, no races and no sleeps.

Two sections need a second checkout and print `skip` without one, because both are differentials
against other commits rather than assertions about this one:

```bash
git worktree add /tmp/r14-pre 78b490f   # the commit BEFORE A-11/A-12/A-13 — §1.4's oracle
git worktree add /tmp/r14-tw  fb3ff34   # a scratch tree §4 patches and restores, for the
                                        # tripwire's RED state. It edits
                                        # unbookedTicketed.ts in THAT tree only and puts the
                                        # file back in a `finally`; nothing under cairn/ is
                                        # ever written.
```

Re-run **unmodified** this round and unchanged by `fb3ff34`: `qa/r2-copy.mjs` **0 FAIL** and
`qa/prov.mjs` **0 FAIL** — neither had been run at a commit carrying *both* builder passes (the
A-14 builder ran them in a detached worktree holding only his five files) — and
`qa/r2-constraints.mjs` **1 FAIL** (R2-18, known). `npm run test:tap` 554/0, `npm run typecheck`
clean, `npm run web:build` clean. `qa/r13-gate-citykey.mjs` was **not** re-run: the orchestrating
session had already re-run it at 0 FAIL and §1/§3/§4/§10 of this file attack the same rulings from
angles that probe does not cover.

Note for whoever reads §5.9 first: `qa/r2-copy.mjs` §H does **not** fail on R14-4. It only
inspects the copied *stop*'s note, ticket and links — the copied `Place` is not in its scope,
which is how the un-fixed half of R2-3 stayed invisible for eleven rounds.

---

## Round 15 (2026-08-28, `claude/i4a-r14-issues-f0bkgc` @ `bd195bd`) — the A-15 / A-16 / A-17 breaker pass

Narrow: the diff `3409420..bd195bd` only — `placeForCopy` and `refileCityKey`'s new step 2 in
`build/copyStop.ts` (**A-15**, **A-16**), the `PlaceLink` clone (**R14-3**), the `Rule.horizonDays`
comment (**A-17**), and the two test files. Round 14's own open list was re-derived only where
this diff claims to close it; R13-4, R13-5, P2-5, P2-8 and the Phase 1 list were **not**
re-litigated.

```bash
node --experimental-strip-types qa/r15-place-copy.mjs
        # §1  A-15 measured against what a `Place` carries at RUNTIME, not against the type:
        #     §1.1 the one surviving spread (`{...w}` over `hours.weekly`) and §1.2 a
        #     non-string `hours.note`, both live because `fromJSON` casts `hours` unvalidated
        #                                                              (R15-1, 7 FAIL)
        #     §1.3 the six `place.hours` shapes fromJSON accepts and copyStopInto now THROWS
        #     on — all six copy cleanly at 3409420                      (R15-2, 2 FAIL)
        #     §1.4 what the ruling's table DOES deliver, and §1.5 over-redaction measured
        #     across eleven notes                                                 (0 FAIL)
        # §2  §2.1 `Stop.cost.note` and `Stop.arrival.label` cross verbatim while §6.6's
        #     sample path redacts both; §2.2 the reference trip's exposure, measured
        #                                                              (R15-3, 5 FAIL)
        # §3  A-16: assertions 1-5, the stale source in both directions, the coincidental
        #     cross-document key, same-`.id`-different-object, determinism   (0 FAIL);
        #     §3.2 the step-1-before-step-2 ordering nothing can fail on (R15-4, 1 FAIL);
        #     §3.3 the trip-id collision, checked in store.ts rather than reasoned about;
        #     §3.4 the pool placement's raw cityKey                      (R15-6, 1 FAIL)
        # §4  R14-3 from BOTH directions, plus every other alias copyStopInto still has
        #                                                                          (0 FAIL)
        # §5  A-17's directional test measured for what it can actually detect
        #                                                              (R15-5, 1 FAIL)
        # §6  the ceilings, the read-only boundary, and the pre-vs-post differential (0 FAIL)
```

**17 FAIL by design** — R15-1 ×7, R15-2 ×2, R15-3 ×5, R15-4 ×1, R15-5 ×1, R15-6 ×1. Every other
line in the file is a confirmation that must stay at 0. Deterministic call sequences only, no
races and no sleeps.

§6.3 is a differential and prints `skip` without a second checkout:

```bash
git worktree add /tmp/r15-pre 3409420   # the commit BEFORE A-15/A-16/A-17 were built
```

Three of this round's findings are about **tests that cannot fail**, and none of them can be
expressed as an assertion inside this probe — a probe cannot mutate the product code it is
importing. Each was established by editing `copyStop.ts`, `detect.ts` or `unbookedTicketed.ts` in
a throwaway `git worktree add /tmp/r15-mut bd195bd`, running `node --test`, and discarding the
tree. Nothing under `cairn/` was ever written. The three mutations, so the next round does not
re-derive them:

```bash
# R15-4 — move refileCityKey's step 2 above step 1:      568/568 pass, r14 probe ALL OK
# R15-4 rider — `name: redactText(p.name)` in placeForCopy: 568/568 pass
# R15-5 — beyondHorizon's `subjects.every(...)` -> `.some(...)`: 568/568 pass
#         (the same mutation on §8.2's `suppressedAsPast` turns 3 tests red, which is the
#          contrast that makes R15-5 a finding rather than a general observation)
```

Re-run **unmodified** this round: `qa/r14-horizon-copy.mjs` **0 FAIL** with both worktrees
present (A-15/A-16/A-17/R14-3 close every line it had red), `qa/r2-copy.mjs` **0 FAIL**,
`qa/prov.mjs` **0 FAIL**, `qa/r2-constraints.mjs` **1 FAIL** (R2-18, known). `npm run test:tap`
568/0, `npm run typecheck` clean.

Note for whoever reads §1.1 first: `qa/r14-horizon-copy.mjs` §5.9 does **not** fail on R15-1. It
inspects the copied place's `note` and `links` — the two fields R14-4 named — and never
populates `hours`, which is how the third carrier survived the ruling written to close the first
two.

**Round 16 maintained this file to 0 FAIL.** All six R15 findings close; three lines could not be
closed by product code and were re-expressed rather than deleted (A-19 assertion 7 forbids the
builder editing anything under `qa/`, so this was QA's job):

- **§3.4** asserted against a document A-19 now refuses to return. It is a `throws` assertion
  now, against A-19's real contract, with `TRANSIT_CITY_KEY` and a key the target *does* have
  measured beside it so the line proves a refusal and not a blanket ban.
- **§3.2 (R15-4)** and **§5.1 (R15-5)** were literal `ok(..., false, …)` — statements about a gap
  in the *shipped suite*, not measurements of the product, so no product change could ever turn
  them green. Both now point at the test that closed them. **Round 16 re-derived both by
  mutation** rather than trusting the builder: see the round-16 section below.

---

## Round 16 (2026-08-28, `claude/i4a-r14-issues-f0bkgc` @ `bff7a81`) — the A-18 / A-19 breaker pass

Narrow: the diff `b3a0c89..bff7a81` only — `build/copyStop.ts` (`redacted`, `costForCopy`,
`arrivalForCopy`, `weeklyForCopy`, `hoursForCopy`, A-19's three parts), `model/types.ts` (the new
`place_hours_malformed` code), `validate/validateTrip.ts` (`wellFormedHours`) and the two test
files. Nothing else was re-litigated.

```bash
node --experimental-strip-types qa/r16-copy-depth.mjs
        # §1  A-18 past r15 §2.1's repro: §1.1 the `display` predicate at six edges;
        #     §1.2 an unclassified key on ALL FOUR records the ruling enumerates —
        #     `CostEstimate`, `Money`, `MoveOverride` and **`Link`**       (R16-1, 1 FAIL)
        #     §1.3 the strings that still cross verbatim, checked against
        #     tools/redact.mjs's STRUCTURAL_KEYS rather than against the ruling's prose;
        #     §1.4 the open/close judgment call vs all 240 clock times in a day  (0 FAIL)
        # §2  `Place.hours`: 34 shapes through the live fromJSON route, including nested
        #     objects, array-likes, `__proto__` as a data key and 1e999 as a `day`
        #                                                                        (0 FAIL)
        #     §2.3 the new `place_hours_malformed` vs what the copy actually did
        #                                                                 (R16-2, 1 FAIL)
        # §3  A-19's eight assertions re-derived, plus the id factory behind the refusal
        #     and a placement whose `kind` is out of the union             (0 FAIL)
        # §4  `place_hours_malformed` as shipped: ceiling, determinism, Ref, wiring (0 FAIL)
        # §5  ceilings, BUILD-NOTES' two greppable claims (comments stripped, or they
        #     report their own docstring), and a byte-identity differential vs b3a0c89
        #                                                                        (0 FAIL)
```

**2 FAIL by design** — R16-1 ×1, R16-2 ×1. Every other line is a confirmation that must stay at 0.
Deterministic call sequences only, no races and no sleeps.

§5.3 is a differential and prints `skip` without a second checkout:

```bash
git worktree add /tmp/r16-pre b3a0c89   # the commit BEFORE A-18/A-19 were built
```

Ten mutations, all made in a throwaway `git worktree add /tmp/r16-mut bff7a81` and discarded —
nothing under `cairn/` was ever written. The counts are what a future round should reproduce:

```bash
# reintroduce the cost/arrival spread                     3 red
# `{...w}` back on hours.weekly                           2 red
# alias the caller's placement into addStop               2 red
# delete A-19's pool-city check                           1 red
# carry the source hint verbatim                          2 red
# skip `redacted` on cost.note / on arrival.label       1 red each
# `display: c.display` (drop the predicate)               2 red
# refileCityKey step 2 above step 1                       1 red  <- R15-4 CLOSES
# beyondHorizon `subjects.every` -> `.some`               1 red  <- R15-5 CLOSES (full suite)
# spread `links` back to `{ ...l }`                       0 red  <- R16-1
# restore `redactText(p.note) as string` in placeForCopy   0 red  <- R16-1's rider
```

Re-run **unmodified** this round: `qa/r14-horizon-copy.mjs` **ALL OK** with both worktrees
present, `qa/r2-copy.mjs` **0 FAIL**, `qa/prov.mjs` **0 FAIL**, `qa/r2-constraints.mjs` **1 FAIL**
(R2-18, known). `npm run test:tap` 583/0, `npm run typecheck` clean, `npm run web:build` clean,
`npm run golden` + `npm run sample` byte-identical (sample sha `40955ca0b182`).

Note for whoever reads §1.2 first: `r16` does **not** re-run round 15's credential repro. That
lives in `qa/r15-place-copy.mjs` §1.1/§1.2/§2.1 and now passes there; re-running it here would
have spent a run re-confirming a number the builder already reported and I had no reason to doubt.

---

## Round 17 (2026-08-28, `master` @ `909b4a3`) — the A-20 breaker pass

Narrow: the diff `69f551c..909b4a3` under `packages/` only — the new `model/openingHours.ts`,
`serialize/fromJSON.ts` (`clock`, `parseOpeningHours`, `clockOrNull`), `serialize/toJSON.ts`
(`weeklyOut`, `hours`), `validate/validateTrip.ts` (`wellFormedHours` deleted), `build/copyStop.ts`
(`weeklyForCopy`), `model/types.ts` and the two test files. Nothing else was re-litigated.

```bash
node --experimental-strip-types qa/r17-hours-parser.mjs
        # §1  A-20's contract sentence — `isOpeningHours(v)` is true EXACTLY when `fromJSON`
        #     accepts `v` — over 53 shapes against fromJSON's OBJECT arm: unicode digits,
        #     a trailing newline, a NUL, an RTL override, boxed primitives, Proxies,
        #     Object.create(null), inherited-only fields, sparse arrays, accessors  (0 FAIL)
        #     §1.2 the ruling's own two normalisation claims, checked literally;
        #     §1.3 a legitimate `hours` is not collateral damage                    (0 FAIL)
        # §2  Part 5(a) re-derived: the accepted set brute-forces to exactly 11 000 and
        #     redactText alters none of them; and the invariant is TIED to redactText by a
        #     red test, with one pattern list shared with tools/redact.mjs          (0 FAIL)
        # §3  R15-2's closure against 41 hostile CAST-BUILT `hours`                 (0 FAIL)
        #     §3.2 an entry whose open/close are ACCESSORS: validated on one read,
        #     copied from another                                            (R17-1, 2 FAIL)
        # §4  the ratification chain end to end over 26 shapes: validateTrip warns ->
        #     toJSON re-emits -> fromJSON refuses at the exact path              (0 FAIL)
        # §5  statements about the SHIPPED SUITE, mutation-verified in a scratch worktree:
        #     §5.1 toJSON's `hours` rebuild is unpinned                      (R17-2, 1 FAIL)
        #     §5.2 clockOrNull's refusal is unpinned, pre-existing            (R17-3, 1 FAIL)
        # §6  ceilings, A-20 assertions 5 and 6, and the read-only boundary        (0 FAIL)
```

**4 FAIL by design** — R17-1 ×2, R17-2 ×1, R17-3 ×1. Every other line is a confirmation that must
stay at 0. Deterministic call sequences only, no races and no sleeps. No second checkout needed.

Seventeen mutations, all made in a throwaway `git worktree add /tmp/r17-mut 909b4a3` (and one in
`/tmp/r17-pre 69f551c`) and discarded — nothing under `cairn/` was ever written. The counts are
what a future round should reproduce:

```bash
# isClockTime without its `$` anchor                        1 red
# isWeeklyEntry without Number.isFinite(day)                3 red
# isWeeklyEntry weakened to the old `typeof e.open string`  4 red
# isOpeningHours without the `note` typeof check            2 red
# isOpeningHours without Array.isArray(v)                   0 red  <- unreachable population
# isWeeklyEntry without Array.isArray(v)                    0 red  <- unreachable population
# parseOpeningHours: `str` instead of `clock`               2 red
# parseOpeningHours: `{...e}` back on a parsed entry        2 red
# parsePlace: the raw cast restored                         5 red
# parseOpeningHours: `hours: null` accepted as absent       2 red
# parseOpeningHours: an `undefined` slot refused            1 red
# weeklyForCopy without isWeeklyEntry                       1 red
# weeklyForCopy without its redaction line                  0 red  <- provably dead, per A-20 5(a)
# validateTrip: the place_hours_malformed push deleted      2 red
# a REDACTION_PATTERN that alters a clock time              6 red  <- 5(a) and 5(b) both fire
# toJSON: `hours: p.hours` restored                         0 red  <- R17-2
# clockOrNull: the HH:MM refusal deleted                    0 red  <- R17-3 (0 red at 69f551c too)
# `{ ...l }` back on links                                  1 red  <- R16-1 CLOSES  (0 at bff7a81)
# `redactText(p.note) as string` in placeForCopy            1 red  <- rider CLOSES  (0 at bff7a81)
```

Re-run **unmodified** this round: `qa/r14-horizon-copy.mjs` **ALL OK**, `qa/r2-copy.mjs` **0 FAIL**,
`qa/prov.mjs` **0 FAIL**, `qa/r2-constraints.mjs` **1 FAIL** (R2-18, known). `npm run test:tap`
593/0, `npm run typecheck` clean, `npm run web:build` clean, `npm run golden` + `npm run sample`
byte-identical (sample sha `40955ca0b182`).

**`qa/r15-place-copy.mjs` and `qa/r16-copy-depth.mjs` are both back at 0 FAIL and both now run to
completion.** A-20 said in writing that it would turn two probes red on purpose and that
re-expressing them is QA's job; both aborted with an uncaught `TripParseError` before this pass
(`r15` at §1.2, `r16` at §1.4 line 253). Every affected line is now two-sided in the form
`packages/core/test/copyStop.test.ts` models — the parser refuses (or, for an extra key, **drops**)
with a JSON path, and `copyStopInto` still never throws on the cast-built equivalent:

- **`r15` §1.1** asserted the hostile entry *survived* the parser; it now asserts the parser keeps
  the entry and drops the unenumerated key, with the copy measured on a cast-built source.
- **`r15` §1.2 / §1.3** now assert the refusal and its exact path (`$.places[0].hours.note`, and
  the six R15-2 shapes), then the cast-built copy.
- **`r16` §1.4(b), §2.1, §2.2** the same; §2.1 measures all 35 shapes on both sides rather than
  skipping the refused ones, which would have silently emptied the section.
- **`r16` §2.3** is R16-2's own assertion, unchanged in wording and now **green** — one predicate,
  three importers, and `wellFormedHours` gone.
- **`r16` §1.2's R16-1 line** was a literal `ok(…, false, …)` about the shipped suite, so it now
  points at the fixture that closed it, mutation-verified above.

Note for whoever reads §3.2 first: R17-1 needs an **accessor property** on a `weekly` entry. No JSON
document can carry one, and every shipped caller of `fromJSON` passes text (`importDoc(text)`,
`cli`, and `StoredDoc.doc`, which is `type TripDoc = string`) — so the population is an in-process
writer, the same one `place_hours_malformed` exists for. That is the whole reason it is MINOR.

---

## Round 18 (2026-08-28, `master` @ `1d091a6`) — the A-21 / A-21a breaker pass

Narrow: the diff `10fe04c..1d091a6` under `packages/` only — `build/copyStop.ts` (file-wide),
`model/openingHours.ts` (`isWeeklyEntry` → `readWeeklyEntry`), `serialize/toJSON.ts` (`hours()`)
and the three test files — plus the three round-17 findings a builder closed in the same pass.
Nothing else was re-litigated.

```bash
node --experimental-strip-types qa/r18-readonce.mjs
        # §1  a mechanical read-count CENSUS: every field of every caller-supplied record
        #     `copyStopInto` touches, over five control-flow paths, each wrapped in a
        #     counting getter that returns a STABLE value          (census summary, 1 FAIL)
        # §2  A-21a's read-count table re-derived path by path              (0 FAIL)
        #     §2.2 its stated bound attacked from three directions: duplicate row yes,
        #          crash no, false-positive merge no, new leak no            (0 FAIL)
        #     §2.3 where the bound stops holding, one level down      (R18-5, 2 FAIL)
        # §3  the sites the census finds that neither ruling names:
        #     §3.1 `source.trip` ×5 — the credit names the wrong person (R18-1, 2 FAIL)
        #     §3.2 `src.id` ×2 — tested by `find`, emitted as origin    (R18-2, 1 FAIL)
        #     §3.3 `srcPlace.at` ×2 in the inline branch               (R18-3, 2 FAIL)
        #     §3.4 `samePlace` reads the RECIPIENT's `a.at` ×3         (R18-4, 1 FAIL)
        #     §3.5 the ctx fields whose second read is inert today      (recorded, 0 FAIL)
        # §4  where A-21's claim DOES hold — Parts 1, 4 and 4(c) and A-21a's
        #     own two fixtures, all re-derived                                  (0 FAIL)
        # §5  ceilings, `cairn-constraints` and the read-only boundary          (0 FAIL)
```

**9 FAIL by design** — R18-1 ×2, R18-2 ×1, R18-3 ×2, R18-4 ×1, R18-5 ×2, plus the §1.1 census
summary. Every other line is a confirmation that must stay at 0. Deterministic call sequences only,
no races and no sleeps. No second checkout needed.

**The census in §1.1 is the reusable part.** A-21's own residue paragraph says the rule is checked
behaviourally rather than by a grep, and that *"the day `copyStop.ts` grows a new helper, the
reviewer's question is: does any field of a source record appear twice in this function?"* — one
pass over a 500-line file, by hand. §1.1 is that question asked mechanically: it wraps every own
enumerable field of the source stop, its `PlaceLink`, the source `Place`, the `placement` and the
two argument objects in counting getters that return **stable** values, so it measures the shipped
control flow and injects no fault at all. Run it on any future pass that touches this file; the
only maintenance it needs is the `BLESSED` set, which is the two carve-outs the rulings write down.

Thirteen mutations, all made in a throwaway `git worktree add … 1d091a6` and discarded — nothing
under `cairn/` was ever written. Baseline 608/608 before and after each, restore verified. **Every
one is red; none survives**, which is the opposite of round 17's result and is the strongest thing
in the builder's two passes:

```bash
# A-21's own six
# re-read `e.open` in weeklyForCopy                          1 red
# re-read `c.display` in costForCopy                         1 red
# re-read `o.weekly` in isOpeningHours                       1 red
# re-read `o.weekly` in hoursForCopy                         1 red
# re-read `p.at` in placeForCopy                             1 red
# restore `place = src.place` as the ternary fallthrough     2 red
# A-21a's seventh
# restore `original.at` in the step-3 branch                 1 red
# the Part 1 reversion the ruling is written against
# readWeeklyEntry -> a bool the caller re-derives from       2 red
# the builder's five
# re-read `placement.cityKey` in Part 4(c)                   1 red
# re-read `o.weekly` in toJSON's hours()                     1 red
# revert toJSON's `hours` rebuild                            1 red  <- R17-2 CLOSES (0 at 909b4a3)
# delete clockOrNull's HH:MM refusal                         1 red  <- R17-3 CLOSES (0 at 909b4a3
#                                                                      AND at 69f551c)
# drop Number.isFinite from readWeeklyEntry                  3 red
```

Re-run **unmodified** this round: `qa/r14-horizon-copy.mjs` **ALL OK**, `qa/r15-place-copy.mjs`
**ALL OK**, `qa/r2-copy.mjs` **0 FAIL**, `qa/prov.mjs` **0 FAIL**, `qa/r2-constraints.mjs` **1
FAIL** (R2-18, known). `npm run test:tap` 608/0, `npm run typecheck` clean, `npm run web:build`
clean, `npm run golden` + `npm run sample` byte-identical (sample sha `40955ca0b182`),
`Object.keys(core).length` 71 with `index.ts` byte-unchanged across the whole diff.

**`qa/r16-copy-depth.mjs` and `qa/r17-hours-parser.mjs` are both at 0 FAIL and both run to
completion.** A-21 named the lines it would turn red and said re-expressing them is QA's job, not
the builder's; this round did it:

- **`r16` §1.4's source-grep** tested `/isWeeklyEntry\(w\)/` and `/redacted\(e\.open\) !== e\.open/`.
  A-21 renamed both halves; the equivalents are `/readWeeklyEntry\(w\)/` and
  `/redacted\(open\) !== open/` and the assertion's *subject* — the structural half is asked once,
  elsewhere, and the redaction half is a copy-boundary policy — is unchanged and still true. A
  second line now asserts, against **comment-stripped** source, that the old boolean predicate was
  **deleted** rather than shipped alongside the new one.
- **`r16` §3.5** recorded, as *"confirmed, not filed"*, that an out-of-union placement `kind` fell
  past A-19's city check and wrote `{kind:'pool', cityKey: undefined}`. A-21 Part 4(c) merges the
  check and the rebuild into one branch on the discriminant, so the call is now **refused**. The
  ruling does not name this; the builder reported it. The line is re-expressed two-sided (the
  refusal, and the target byte-identical behind it) with the residual coercion — an out-of-union
  `kind` carrying a key the target *has* still lands in the pool — recorded beside it.
- **`r17` §3.2's second assertion** (`warned || restores`) is **withdrawn by A-21 Part 6** as
  unsatisfiable by any implementation that does not re-read, and is replaced by Part 6's own
  four-part invariant, measured rather than argued: neither traversal throws at any of 7 flip
  points and the export stays parseable JSON; **each traversal reads each field exactly once**
  (`validateTrip` 1/1, `toJSON` 1/1, `copyStopInto` 1/1 — which is the checkable form of
  *"internally consistent"*); the two-traversal disagreement is **recorded and not asserted**; and
  the harm is bounded to the caller's own document, which is the half that must not be withdrawn.
- **`r17` §5.1 and §5.2** were literal `ok(…, false, …)` statements about the shipped suite's own
  coverage gaps — R17-2 and R17-3 — which no product change can turn green. Both now assert the
  closure by naming the fixture, and both are re-derived by mutation at `1d091a6` rather than taken
  from BUILD-NOTES. §5.2 also gains **R17-4**'s closure, re-derived: `importDoc(text: string)`,
  `type TripDoc = string`, `cli.ts`'s `readFileSync(…, 'utf8')`.

Note for whoever reads `r18-readonce.mjs` §3 first: every finding needs an **accessor property on a
caller-supplied value**. `JSON.parse` produces own data properties and never accessors,
`TripDoc = string`, and `apps/web`'s only `copyStopInto` call site builds
`{ trip: browsing, stopId: stop.id }` as an object literal from a parsed document. The population
is an in-process caller past the type system — the same one `place_hours_malformed` was ratified
for. That is the whole reason all five are MINOR and none is a BLOCKER.

---

## Round 20 (2026-08-28, `master` @ `3d1be3b`) — the A-24 / R19-1 / R19-2 / KD-50 breaker pass

Narrow: the diff `63a14d7..3d1be3b` under `packages/` — `build/copyStop.ts`,
`test/copyStop.test.ts` (85 → 88) and `test/readOnce.test.ts` (10 rows → 14, 5 `ALLOWED` → 7,
fixture 14/15 → 15/15 `Stop` fields) — plus `docs/BUILD-NOTES.md`'s **KD-50**. Seventh consecutive
round on `copyStop.ts`'s read-once / credential-boundary class.

```bash
node --experimental-strip-types qa/r20-census-reach.mjs
        # §1  R20-1 — A-24's amended maintenance rule ("the fixture populating every
        #     field of both records is part of this contract") is UNENFORCED. Nothing
        #     ties `readOnce.test.ts`'s fixture to `keyof Stop` / `keyof Place`, and
        #     `copyStop.test.ts`'s STOP_FIELDS assertion filters `ticket` OUT, so it
        #     pins a different fixture to a different list.                     (1 FAIL)
        # §2  R20-2 — the same gap one record UP, created by A-24 Part 1 itself: the
        #     two new `Trip` roots carry 17 of `Trip`'s 18 keys. `meta` is ABSENT and
        #     `homeBase` is `null`, so `Trip.meta` may be multi-read invisibly and the
        #     `homeBase.at` subtree (a named home coordinate) is never entered.  (2 FAIL)
        #     ...and the closing line proves the FIX costs no eighth `ALLOWED` entry:
        #     ten further document shapes, both fields populated, still green.  (0 FAIL)
        # §3  R20-3 — `copyStop.ts:357` reads a TARGET `City.order` twice in
        #     `refileCityKey`'s step-4 fold (compared, then recorded), so A-16's
        #     tie-break is decided on a number the winning record does not carry.
        #     With three same-named target cities the `Place` is mis-filed.      (2 FAIL)
        # §4  KD-50 — the builder's two disclosed consequences, CHECKED: the message,
        #     the id draws (2 / 1 / 0-written), the target byte-identical behind the
        #     refusal, and the refuse-then-retry. Safe, with one cosmetic residue —
        #     the three refusals no longer share a message family.               (1 FAIL)
        # §5  R20-4 — A-24 Part 1's residue paragraph names TWO invisible multi-reads;
        #     a fully-opened census finds FIVE, and two of the three it does not name
        #     produce a divergent record rather than only a count.                (1 FAIL)
        # §6  R20-5 — `qa/r14-horizon-copy.mjs` §7 pins `kds.length === 49`; this pass
        #     minted KD-50, so a probe that was ALL OK at `215aeee` is 1 FAIL, while
        #     BUILD-NOTES says "nothing in this pass went unrun".                 (1 FAIL)
        # §7  Ceilings, `cairn-constraints`, and the attack list that did NOT break —
        #     including all 143 reference-trip stops copied into a fresh trip with 0
        #     throws and 0 credential/ticket crossings.                           (0 FAIL)
```

**8 FAIL by design.** Every other line is a confirmation that must stay at 0. Deterministic call
sequences only, no races and no sleeps. No second checkout needed.

**`qa/r19-census-gaps.mjs` is re-expressed and now ALL OK.** It was 12 FAIL by design at
`215aeee` and 8 FAIL unedited at `3d1be3b`; the builder correctly reported that all 8 were
measured against **QA's own local copy of the pre-A-24 census** and refused to touch a file
A-19 assertion 7 assigns to QA. Round 20 brought it current:

- `a23Source` → `a24Source` (gains `ticket` and a `pool` option) plus a new `a24Minimal`;
- the matrix **10 rows → 14**, with rows 1–10 unchanged in construction and numbering so the
  cross-check against `readOnce.test.ts` stays row-by-row;
- `censusTrip` / `TRIP_SKELETON` copied from A-24 Part 1, so the two `Trip` documents are roots
  rather than members of `opaque`;
- `ALLOWED` **5 → 7** (`tgtTrip.id`, `tgtTrip.revision`);
- §1, §2, §4 and §5 re-expressed from *"here is the gap"* to *"here is the closure"*, each with
  this file's own flipping accessors rather than the builder's tests.

**Nothing in those 8 was a genuine gap once the probe was current** — every one closed on
re-expression. Round 20's own findings are in `r20-census-reach.mjs`, not here.

Every mutation below was made in a throwaway `git worktree add … 3d1be3b` and discarded — nothing
under `cairn/` was ever written by one, and the worktree was removed. Baseline `readOnce.test.ts`
2/2, `copyStop.test.ts` 88/88 and `npm run test:tap` 618/0 before and after each. `RO` is
`readOnce.test.ts`, `CS` is `copyStop.test.ts`, `ALL` is `npm run test:tap`:

```bash
# A-24's own acceptance check, both directions
# `git show 63a14d7:…/copyStop.ts` under the SHIPPED test  RO red: `srcTrip.id ×2` on 11 of 14
#                                                            rows; rows 6/7/8 correctly show 1
# as shipped                                               RO 2/2 green, all 7 ALLOWED at max
# the two ALLOWED entries A-24 added, both directions
# `tgtTrip.id`       max: 2 -> 1                           RO red (BOTH assertions)
# `tgtTrip.id`       max: 2 -> 3                           RO red (assertion 2 only)
# `tgtTrip.revision` max: 2 -> 1                           RO red (BOTH assertions)
# `tgtTrip.revision` max: 2 -> 3                           RO red (assertion 2 only)
# R20-1 — the maintenance rule, in four steps
# 1. add `voucher?: { code: string }` to `Stop`            typecheck red at ONE site:
#    (written by makeStop only when truthy)                  copyStop.test.ts:1256 TS2741
# 2. satisfy it as a builder would (STOP_FIELDS +          typecheck clean, ALL 618/618 green,
#    STOP_FIELDS_THAT_CROSS)                                 RO fixture never touched
# 3. plant R19-5's shape on the new field                  RO 2/2 GREEN  <- R20-1
# R20-2 — the `Trip` roots' own fixture
# double-read `Trip.meta` on BOTH documents                RO green  CS green  ALL 618/618
# R18-5's hybrid shape on `sourceTrip.homeBase.at`         RO green  CS green  ALL 618/618
# ...the SAME two plants with the fixture populating       RO RED: `srcTrip.homeBase ×3`,
#    `homeBase` and `meta`                                   `srcTrip.homeBase.at ×2`,
#                                                            `srcTrip.meta ×2`   <- the fix
# an eighth multi-read in the product code — 22 shapes     none found, 0 throws
```

Re-run **unmodified** this round: `qa/r15-place-copy.mjs` **ALL OK**, `qa/r16-copy-depth.mjs`
**ALL OK**, `qa/r17-hours-parser.mjs` **ALL OK**, `qa/r18-readonce.mjs` **ALL OK**,
`qa/r2-copy.mjs` **0 FAIL**, `qa/prov.mjs` **0 FAIL**, `qa/accept.mjs` **28 pass / 0 fail**,
`qa/r2-constraints.mjs` **1 FAIL** (R2-18, known), `qa/r2-redact.mjs` unchanged (its two known
non-credential words, KD-27). **`qa/r14-horizon-copy.mjs` is 1 FAIL** — that is **R20-5**, new
this pass, and the one-character ceiling re-expression is deliberately *not* done here: this
round's brief lists the `qa/` files it may edit and `r14-horizon-copy.mjs` is not among them.
`npm run test:tap` 618/0, `npm run typecheck` clean, `npm run web:build` clean, `npm run golden`
+ `npm run sample` byte-identical (sample sha `40955ca0b182`), `Object.keys(core).length` 71,
reference trip 2/4/11 and 11 `validateTrip` issues.

Note for whoever reads `r20-census-reach.mjs` §2 or §3 first: both need an **accessor property on
a caller-supplied value**, the same population bound as every read-once finding since round 16,
which is why they are MINOR. **§1, §5 and §6 do not** — they are gaps in a guard and in a
disclosure, each demonstrated by planting something the guard or the report should have caught and
measuring that it did not.

---

## Round 19 (2026-08-28, `master` @ `215aeee`) — the A-22 / A-23 breaker pass

> **Superseded in round 20.** `qa/r19-census-gaps.mjs` no longer matches the block below: it was
> re-expressed at `3d1be3b` onto the shipped A-24 census (14 rows, `censusTrip`, 7 `ALLOWED`
> entries) and is now **ALL OK**, with §1/§2/§4/§5 asserting the *closure* of R19-1…R19-5 rather
> than the gap. The section below is kept as the record of what the probe measured at `215aeee`.

Narrow: the diff `993d8fc..215aeee` under `packages/` only — `build/copyStop.ts`,
`test/copyStop.test.ts` (80 → 85) and the new **`test/readOnce.test.ts`** (A-23's standing
census, +2). Nothing else was re-litigated.

```bash
node --experimental-strip-types qa/r19-census-gaps.mjs
        # §1  R19-1 — `source.trip.id` is read TWICE on the SHIPPED tree: read 1 is the
        #     credit (`origin.sourceTripId`), read 2 is A-16 step 2's `source.id ===
        #     target.id`. A-22 Part 1 hoisted the CONTAINER and left the FIELD.  (2 FAIL)
        #     §1.2 the harm, measured: step 2 fires on a city-key COINCIDENCE and a
        #          Vienna `Place` lands filed under the recipient's PRAGUE city;
        #          `validateTrip` 0 issues; a `Place` carries no provenance (A-6)
        # §2  R19-2 — the recipient's own `Day.id` read twice across `copyStopInto` ->
        #     `addStop`: the guard passes, `withDay` then throws `no such day`  (2 FAIL)
        # §3  R19-3 — A-23's `opaque` set holds both whole `Trip`s, so no field of either
        #     document's own record can ever reach the offender list; and the ruling's
        #     stated reason ("the document skeleton rather than values that cross") is
        #     FALSE for `Trip.id`/`Trip.ownerId`, which cross into `origin`     (2 FAIL)
        #     §3.1 first cross-checks QA's copy of the census against the shipped
        #          `readOnce.test.ts` — A-23 says a divergence is itself a finding (0 FAIL)
        # §4  R19-4 — the matrix's reach: row 5 does NOT deliver `placeForCopy`'s
        #     `at === null` (the reuse branch short-circuits it), and A-16 step 2, a
        #     POOLED source stop and the absent-optional-field arms are unreached (4 FAIL)
        # §5  R19-5 — `Stop.ticket` is invisible: the census enumerates the fixture's
        #     keys and A-23's fixture list omits the one field §6.6 calls a
        #     credential                                                        (2 FAIL)
        # §6  R19-6 — A-23's printed `srcPlace.at.lat ×3` is ×4, re-derived; cosmetic,
        #     which is what this line CONFIRMS                                  (0 FAIL)
        # §7  what A-23 does catch (20 mutations), ceilings, `cairn-constraints`,
        #     the read-only boundary                                            (0 FAIL)
```

**12 FAIL by design.** Every other line is a confirmation that must stay at 0. Deterministic
call sequences only, no races and no sleeps. No second checkout needed.

**`qa/r18-readonce.mjs` is now ALL OK** — R18-1…R18-5 are all closed, and the two lines A-22
handed QA to re-express are re-expressed (A-19 assertion 7: the builder edits nothing under
`qa/`):

- **§2.3**'s first assertion was `latReads === 1`. A-22 Part 2 makes the correct claim
  `latReads === 2` **and** `lngReads === 2`, **constant in N** — one read by the reuse probe, one
  by `placeForCopy`, never a count the recipient's document controls. Re-expressed, plus a second
  line asserting `lat` and `lng` are now read the *same* number of times as each other, which is
  what kills the hybrid coordinate. Measured 2/2 at N = 0, 1 and 3.
- **§3.5**'s three *"recorded, not filed"* lines measured a second read A-22 Part 1(b) removed.
  Re-expressed as read-count assertions of **1** on `ctx.actorUserId`, `ctx.today` and — a fourth
  line, new — `ctx.ids`, each still checked byte-identical beside the count.

Every mutation below was made in a throwaway `git worktree add … 215aeee` and discarded —
nothing under `cairn/` was ever written. Baseline `readOnce.test.ts` 2/2 and `copyStop.test.ts`
85/85 before and after each, restore verified. The counts are what a future round should
reproduce; `RO` is `readOnce.test.ts`, `CS` is `copyStop.test.ts`:

```bash
# A-22's own five, reverted
# restore `sourceStopId: src.id`                       RO red  CS red
# restore `friendUserId: source.trip.ownerId`          RO red  CS red
# restore the inline `srcPlace.at` double read         RO red  CS red
# restore `samePlace`'s `a.at` reads                   RO red  CS red
# un-clone the reuse probe's `at`                      RO red  CS red
# A-22 Part 1(b) — the trio A-23 exists for
# restore `ids: ctx.ids` in addStop's opts             RO red  CS GREEN
# restore `now: ctx.today` in addStop's opts           RO red  CS GREEN
# restore `actorUserId: ctx.actorUserId`               RO red  CS GREEN
# twelve INVENTED sites, in functions no ruling names
# re-read `c.note` in costForCopy                      RO red  CS GREEN
# re-read `a.label` in arrivalForCopy                  RO red  CS GREEN
# re-read `p.note` in placeForCopy                     RO red  CS GREEN
# re-read `o.note` in hoursForCopy                     RO red  CS GREEN
# re-read `l.href` in the Stop.links map               RO red  CS GREEN
# call readWeeklyEntry twice in weeklyForCopy          RO red  CS red
# spread `flags` from `src.flags`                      RO red  CS GREEN
# re-read `src.provenance.confidence`                  RO red  CS GREEN
# re-read `h.dayId` in the hint block                  RO red  CS GREEN
# re-read `a.name` in samePlace (recipient's row)      RO red  CS GREEN
# re-read `a.lo` in the cost.amounts map               RO red  CS GREEN
# re-read `srcPlace.placeId` in the find predicate     RO red  CS GREEN
# seven planted OUTSIDE A-23's five roots — six are the findings, the
# seventh is the control that localises R19-5
# double-read `sourceTrip.ownerId`                     RO GREEN  CS GREEN  (426/426 green)
# double-read `sourceTrip.id`                          RO GREEN  CS GREEN  <- R19-1's shape
# double-read a target `City.name` in refileCityKey    RO GREEN  CS GREEN
# emit `src.ticket` only when `kind === 'bundled'`     RO GREEN  CS GREEN  <- R19-5
# emit `src.ticket` unconditionally                    RO GREEN  CS red    <- localises R19-5
# double-read `original.cityKey` on the A-16 step-2
#   path only                                          RO GREEN  CS GREEN  <- R19-4
# double-read `src.place` when the source stop is in
#   the source's POOL                                  RO GREEN  CS GREEN  <- R19-4
# the ALLOWED table, both directions, all five entries
# any entry `max: 2 -> 1`                              RO red (BOTH assertions)
# any entry `max: 2 -> 3`                              RO red (assertion 2 only)
# un-clone the probe WITH scenario 3 deleted           RO red (assertion 2)
# the matrix's own reach
# delete `placeForCopy`'s `at === null` guard          RO GREEN as shipped;
#   ...with row 5's target place RENAMED               RO red  <- R19-4, two-sided
# revert copyStop.ts to 993d8fc under the shipped test RO red, 57 offender lines,
#   including `srcPlace.at.lat ×4`  <- R19-6, ×3 in the ruling is low by one
```

Re-run **unmodified** this round: `qa/r14-horizon-copy.mjs` **ALL OK**, `qa/r15-place-copy.mjs`
**ALL OK**, `qa/r16-copy-depth.mjs` **ALL OK**, `qa/r17-hours-parser.mjs` **ALL OK**,
`qa/r2-copy.mjs` **0 FAIL**, `qa/prov.mjs` **0 FAIL**, `qa/r2-constraints.mjs` **1 FAIL**
(R2-18, known). `npm run test:tap` 615/0 (with `readOnce.test.ts` confirmed inside it at
`ok 502`/`ok 503`, not just standalone), `npm run typecheck` clean, `npm run web:build` clean,
`npm run golden` + `npm run sample` byte-identical (sample sha `40955ca0b182`),
`Object.keys(core).length` 71 with `index.ts` byte-unchanged across the whole diff.

Note for whoever reads `r19-census-gaps.mjs` §1 or §2 first: R19-1 and R19-2 need an **accessor
property on a caller-supplied value**, the same population bound as every read-once finding since
round 16, which is why they are MINOR. **R19-3, R19-4 and R19-5 do not** — they are gaps in the
guard rather than defects in the guarded code, and each is demonstrated by planting a defect the
guard should have caught and measuring that it did not.
