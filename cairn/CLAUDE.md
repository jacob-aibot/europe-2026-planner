# Cairn

A separate, in-progress product: many trips, many people, social sharing, mailbox ingestion, a live
location path, photos. Built by the four agents in `.claude/agents/` (architect → builder → breaker →
manager) from the contract in `cairn/docs/BRIEF.md`, `ARCHITECTURE.md` and `ROADMAP.md`.

See the root `CLAUDE.md` for the read-only boundary against the live planner, the branch rule, and the
conventions that apply here too — they are not repeated below.

## Skills

Cairn development skills live in `cairn/.claude/skills/` — deliberately scoped to this directory so a
TDD/planning methodology does not fire on a two-line trip-planner edit. See the README there before
adding, moving or trusting one.

## Document cost map

| Doc | Size | Read whole when | Otherwise |
|---|---|---|---|
| `BRIEF.md` | ~2.3k tok | always (it's the contract) | — |
| `ARCHITECTURE.md` | ~24k tok | no architecture yet; a broad design revision; you're the manager (the gate) | `cairn/tools/doc-section ARCHITECTURE <sections>` — see the table at the top of the doc for who needs what |
| `ROADMAP.md` | ~8.5k tok | you're the architect planning the next phase | `cairn/tools/doc-section ROADMAP "Phase N" "Sequencing rules"` (also matches by heading text, not just number — see the tool's own `--help`) |
| `BUILD-NOTES.md` | ~10k tok | you're the manager, or the divergence you're chasing isn't in §1 | `cairn/tools/doc-section BUILD-NOTES <sections>`; check the Status note at the top before trusting §4/§5's numbers |
| `QA-FINDINGS.md` | ~8.3k tok | you're the manager | the Status note at the top + the specific finding(s) you were routed |
| `REVIEW.md` | ~7.2k tok | you're the builder/breaker acting on its routing table | the Status note at the top tells you whether it's even current |
| `docs/HISTORY.md`, `cairn/docs/archive/*` | — | a finding or a comment cites it by name | never by default |
| `europe-2026-itinerary.html` | ~44k tok | you're auditing render paths end to end (say so) | `node cairn/tools/extract-legacy.mjs`, or grep — see `cairn-constraints` §1 |
| `CAIRN_VISUAL_ROADMAP.md` (+ its `.html` twin) | ~2k tok | you just made a phase-boundary decision or scope change (see below) | not a contract doc — skip it for a routine builder/breaker task |

## Delegation — when a change needs which stage

Not every change earns the full pipeline. Route by what the change actually touches, not by habit:

| Change | Route | Why |
|---|---|---|
| Doc/comment fix, single-line UI tweak, a typo | **builder only**, no test if behavior is unchanged | breaker + manager reads would cost 20× the fix |
| Isolated defect with a named `file:line` and a repro script already in `cairn/qa/` | **builder + that one repro script** | the adversarial work is already done; re-running the whole breaker pass re-derives what a finding already established |
| Anything touching `access/`, `redactText`, `copyStop`, `cli export`, provenance transitions (`acceptCandidate`/`rejectCandidate`), or a new export surface | **builder + breaker, mandatory** | every security defect this project has found so far lives in exactly these files (F-13, F-16, F-18, R2-3, R2-6) |
| A change to a core invariant, the `packages/core` export surface, or the reducer | **builder + breaker**; manager reviews at the next batch boundary, not immediately | cross-cutting blast radius, but not yet a phase gate |
| A design defect, a new capability, or an acceptance criterion that violates ROADMAP's "How a criterion is written" | **architect first** | sequencing rule 5 — a bad criterion is a design defect, not something to patch around in code |
| **Phase boundary — a SHIP/SEND BACK decision** | **full chain, no exceptions, no shortcuts from this table** | non-negotiable regardless of how small the last diff looks; `manager.md` is the gate and this table does not change what it requires |

When unsure which row applies, treat it as the more expensive route. This table optimizes the common case; it does not override `manager.md`'s judgment on any individual review.

## Keep the visual roadmap in sync

`cairn/docs/CAIRN_VISUAL_ROADMAP.md` and its `.html` twin are a plain-English status board for
Jacob — not part of the contract (`BRIEF.md`/`ARCHITECTURE.md`/`ROADMAP.md`), and nothing enforces
that they stay current automatically. **Update both files, in the same pass**, whenever:

- a phase-boundary decision is made (a manager SHIP/SEND BACK verdict);
- a builder/architect pass changes what's actually built vs. left, for a phase currently in
  progress (e.g. a routed fix lands, a new gap is found);
- the project's scope changes (a phase added, cut, or reordered; a new capability that isn't
  already in the journey list).

A routine single-finding builder pass doesn't need this — see the delegation table above. When in
doubt, a stale roadmap is worse than a skipped update on a trivial change, so err toward updating
it. Keep the same three-way distinction the doc already uses — **built** (code exists) vs.
**verified** (an adversarial round tried to break it) vs. **shippable** (a manager verdict of
SHIP) — rather than collapsing them into a single "done."

## Task sizing

One task = one routed finding, or one deliverable, touching as few files as the fix allows. A batch of
related findings can be worked as one builder pass, then handed to the breaker once — not finding by
finding. Never open a session that spans two phases; if a task looks like it needs both the architect and
the breaker, it's phase-boundary-class work (the table above), not a normal task — plan it as one from the
start rather than discovering it mid-session.

## Session hygiene

- **One task per session.** End the session when the task's verdict or deliverable is written.
- **`/clear` between pipeline stages**, not `/compact`. A builder's tool-call history is worthless to the
  breaker; the BUILD-NOTES report is the handoff, deliberately — that's why each stage writes one.
- **`/compact` only mid-stage**, if one agent's own work runs long. Never as a substitute for `/clear` at a
  stage boundary.
- Prefer `git diff --stat` and targeted reads over repository sweeps, especially for the manager reviewing
  a routine (non-gate) batch.
- Run `/context` when a session feels slow or forgetful — it shows where the window actually went.
- **Dispatch each pipeline stage as its own isolated `Agent()` call** rather than chaining architect,
  builder, and breaker inline in one long session — that gives each stage the fresh context `/clear` would,
  without depending on anyone remembering to run it.

### Resuming from a fresh session

To pick up Cairn cold, without re-deriving history: `git log -1` on `master` for the current commit, then
the Status note at the top of `QA-FINDINGS.md`, then the Status note at the top of `BUILD-NOTES.md`, then
grep `ROADMAP.md` for the current phase's increment to find its dependency/"still owed" line. That's the
whole checkpoint — no archive reading, no full `ARCHITECTURE.md` pass.
