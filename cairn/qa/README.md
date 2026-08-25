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
