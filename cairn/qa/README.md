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
