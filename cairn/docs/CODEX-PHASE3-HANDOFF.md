# Codex → Phase 3 handoff

Prepared 2026-09-14; coordination status updated 2026-09-16 from the user's Claude report.
This is a status and integration handoff, not approval to bypass an entry gate.

## Checkout and availability

- Git root: `<local checkout path removed>`
- Cairn root: `<local checkout path removed>`
- Base HEAD: `9333eb6e875b7ef774a0882f2e0f1b909dfeea87`
- The Codex implementation is in tracked modifications plus untracked source/assets in this working
  tree. It has not been committed or pushed. A GitHub checkout does not contain these edits, and
  `git diff` alone would omit new files. Do not replace a newer Claude checkout with this older tree.
- Compare against Claude's current branch before integrating; preserve both sets of work. The
  existing user requirement is visual approval before commit/push, which has not been satisfied.

## Implemented locally

`apps/web/src/views/CitySelector.tsx` is shared by the upcoming form in `Library.tsx` and
`PastTripForm.tsx`. It loads the gazetteer lazily after two characters, suppresses stale results,
supports keyboard selection and ordered removal, and saves matched values via `cityPickFromRow`.
An explicit unmatched fallback remains. The gazetteer consumer allowlist and Vite JSON-import
handling are part of the local integration.

World, Croatia preview, local profile and first-run Trips/You are also implemented. These are
working prototypes, not final aesthetic approval. The user finds visual fidelity and navigation
smoothness incomplete. No Motion/Ionic integration has been added. Device-local identity is not
an account and home city is not travel history.

## Picker gate remains open

Do not mark I-30 complete merely because CitySelector exists or the normal browser flow passes.
The checked-in roadmap at this base requires additional explicit gate evidence:

1. Render the exact source and resolving CC BY 4.0 link with hits, misses and "keep typing".
   **Known gap:** current CitySelector clears `source` below two characters and renders attribution
   only inside the open results panel; it does not satisfy the keep-typing requirement.
2. Rendered fault checks N1 (missing attribution), N2 (missing link), N3 (changed source fixture)
   must demonstrate the expected failures. These are not established by the ordinary acceptance script.
3. Prove the consumer allowlist fault N4 fails for an unauthorized loader consumer.
4. Verify the specified Geneva save/reload and Switzerland pick chain. Current browser evidence
   exercises Split/Croatia; do not silently substitute that for the named formal criterion.
5. Reconcile scope and integration with the latest architect/breaker ruling. This work also opens
   Library/App/form files under the user's broader first-run request; it is not an isolated I-30 commit.

Use the latest Claude checkout's requirements if they supersede this base. Do not hard-code a
source string to satisfy keep-typing or weaken the lazy-loading boundary to hide the gap.

## Evidence available

`artifacts/visual-direction/implementation-review.md` records scoped verification and screenshot
paths. Browser exercises live under `.impeccable/review/`: `first-run-acceptance.mjs`,
`first-run-failures.mjs`, `past-save-retry.mjs`, `immersive-check.mjs`,
`immersive-resilience.mjs`, `production-phone-check.mjs`. Their runtime paths are local to this
machine and require adaptation elsewhere. Tests passing here do not constitute Claude's independent
breaker sign-off or physical Safari testing.

## Phase 3 coordination

The user's quoted architect decision permits owner/viewer creation only, retaining editor/commenter
definitions and tests without creation paths. Preserve that decision in Claude's current branch;
this handoff does not redefine authorization or sync semantics.

The user's September 16 report from Claude states the directed scope gate closed with A-98,
and the prose ruling adds no Phase 3 or I-30 gate. This supersedes the earlier request to resolve
the round-72 scope-gate major. A-98 is not present in this older checkout; this status is attributed
to Claude's report rather than independently verified here. Reconcile against Claude's current branch.

Phase 3 design can continue according to the quoted ruling. The reported remaining I-30 blockers
are transfer/integration of Codex's code and the user's explicit disposition of the `.tsx` fence.
The local picker acceptance gap listed above is still present and must not be labelled complete.
Separate permission for functional picker integration from final visual approval: the latter
remains outstanding. Do not infer commit/push authorization from this status update.
No infrastructure purchase or final visual polish is needed to exchange and review this code.
