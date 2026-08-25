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
