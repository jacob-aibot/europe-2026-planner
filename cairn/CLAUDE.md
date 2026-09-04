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

**Two rows re-measured at QA round 48 (2026-09-04)** — `QA-FINDINGS` 293k → **300k** with round 48
and `CAIRN_VISUAL_ROADMAP` 49k → **50k** with its newest block; the other four did not move
(`BUILD-NOTES` is 196k, one k above the row below, from I-13d's group-5 addendum).
**Two rows re-measured at revision 48 (2026-09-04)** — `ARCHITECTURE` 361k → **364k** with §4.2's **A-67
Part 7a** (§4 alone 69k → **71k**) and `ROADMAP` 130k → **132k** with I-13d's group 5 and the revision-48
ledger entry; the other four did not move.
**Two rows re-measured at I-13d (2026-09-04)** — `BUILD-NOTES` 193k → **195k** with I-13d's addendum
and `CAIRN_VISUAL_ROADMAP` 47k → **49k** with its newest block; the other four did not move.
**Two rows re-measured at revision 47 (2026-09-04)** — `ARCHITECTURE` 350k → **361k** with §4.2's **A-67**
(§4 alone went 59k → **69k**; §10 36k → **37k** with A-66's Part 10) and `ROADMAP` 126k → **130k** with
**I-13d**; the other four did not move. **Three rows were re-measured at QA round 47 (2026-09-04)** — `QA-FINDINGS` 287k → **293k** with round 47, `BUILD-NOTES` 192k → **193k** with I-13c group 3's addendum, and `CAIRN_VISUAL_ROADMAP` 46k → **47k**. **Every row below was re-measured at revision 46 (2026-09-04)** — the **third** re-measure in one day, and
four rows moved again since the second (`ARCHITECTURE` 340k → **350k** with A-65/A-66, `ROADMAP` 123k →
**126k** with I-13c's third group, `BUILD-NOTES` 189k → **192k** with the round-46 fix pass's addendum, and
`CAIRN_VISUAL_ROADMAP` 42k → **46k**; `QA-FINDINGS` did not move and is still 287k). Revision 45's own
re-measure was the second in that day, and all four large rows had moved between the first and it
(`ARCHITECTURE` 338k → 340k with A-62 Part 8 residue 4, `ROADMAP` 121k → 123k with I-13c, `QA-FINDINGS`
280k → 287k with QA round 46, `BUILD-NOTES` 183k → 189k with I-13b's addendum). The revision before that
moved them further in the same day
(`ARCHITECTURE` 327k → 338k when A-62/A-63/A-64 landed, `ROADMAP` 117k → 121k with I-13b, `QA-FINDINGS`
271k → 280k with QA round 45, `BUILD-NOTES` 179k → 183k), and the one before that found the same thing over three days
(`BUILD-NOTES` 156k → 179k, `QA-FINDINGS` 242k → 271k, `REVIEW` 45k → 52k, `CAIRN_VISUAL_ROADMAP`
34k → 42k), which is the drift rate this table has to be re-measured against, not the one-off correction it
was created for. The old figures (`ARCHITECTURE` 24k, `ROADMAP` 8.5k, `QA-FINDINGS` 8.3k) dated from before a
year of rulings landed in them, and a table that under-reports cost by an order of magnitude causes the
exact failure `cairn-constraints` §10 exists to prevent: an agent budgets for 8k, spends 106k, and does its
worst work in what is left. **Re-measure when you land a revision** —
`node -e "console.log(Math.round(require('fs').statSync('cairn/docs/X.md').size/4000)+'k')"` — and treat a
row you did not verify as a lower bound.

**Nothing in this column is a reading list.** Four of these documents are now large enough that reading one
whole is a decision to spend a quarter of a context window; `doc-section` exists so you do not have to.

| Doc | Size | Read whole when | Otherwise |
|---|---|---|---|
| `BRIEF.md` | ~3k tok | always (it's the contract) | — |
| **`docs/design/references/cairn-visual-reference-board.png`** | **an image** | **before ANY visual decision, every time.** It is the visual authority and it outranks every text description of itself, including `REFERENCE-BOARD.md` | there is no cheaper substitute. Open it |
| `docs/design/REFERENCE-BOARD.md` | ~9k tok | **with the PNG open**, before any visual work — reference weighting, extracted qualities, anti-patterns, the approval gate, the tooling pins | §0 (the rule) + §4 (anti-patterns) + §7 (measured values) if you are only writing CSS |
| `docs/design/DIRECTIONS.md` | ~5k tok | you are picking up the visual-direction work, or Jacob has selected one | §3 alone names the three directions and their axes |
| `DESIGN.md` | ~14k tok | **you're building or reviewing any web surface** — but **read its revision-3 banner first: §1 and §5.1–§5.5 are VOID** and the visual authority moved to the board | `cairn/tools/doc-section DESIGN 3 6` gives the responsive contract + the rendered acceptance standard — the two parts that survive intact |
| `VISUAL-TELLS.md` | ~2k tok | once before writing CSS, once at rendered verification | **advisory, never a contract.** A hit is a question; it does not outrank `DESIGN.md` or a shipped ruling |
| `PRODUCT-VISION.md` | ~10k tok | you're the architect and the question is *why this order* | Appendix A is Jacob's words verbatim — quote it, don't paraphrase it |
| `ARCHITECTURE.md` | **~364k tok** | **never.** Not even for a broad design revision — read sections | `cairn/tools/doc-section ARCHITECTURE <sections>`; run it bare to list every section with its size, and see the table at the top of the doc for who needs what. §2 is 124k, §8 is **82k** (revision 41: A-59/A-60 joined §8.4; revision 42: A-60 gained Part 6; revision 44: A-38 Part 5's checkable line restated), **§4 is 71k** — revision 47 put **A-67** (the store's generation guard) at the end of §4.2, 59k → 69k, and revision 48 gave it **Part 7a**, 69k → 71k; it is the one entry in §4 that is *not* about the map, so a builder of I-13d reads A-67 (Part 7 **with** Part 7a) and needs none of §4.4; **§10 (photos) is 37k and self-contained** — revision 40 built it, revision 43 added A-61, revision 44 added **A-62/A-63/A-64** (16k → 25k), revision 45 added A-62 Part 8's fourth residue (25k → 27k), revision 46 added **A-65/A-66** (27k → 36k), revision 47 added A-66's **Part 10** (36k → 37k) |
| `ROADMAP.md` | **~132k tok** | **never** | `cairn/tools/doc-section ROADMAP "Phase N" "Sequencing rules"` (matches heading text as well as number — see the tool's `--help`). Phase 2 alone is ~85k; grep for your increment |
| `BUILD-NOTES.md` | **~196k tok** | **never** | `cairn/tools/doc-section BUILD-NOTES <sections>`; check the Status note at the top before trusting §4/§5's numbers |
| `QA-FINDINGS.md` | **~300k tok** | **never** — it is the largest document in the repo | the Status note at the top + the specific finding(s) you were routed |
| `REVIEW.md` | ~52k tok | you're the builder/breaker acting on its routing table — and then only the current verdict | the Status note at the top tells you whether it's even current; the verdict table names which entries are closed |
| `docs/HISTORY.md`, `cairn/docs/archive/*` | — | a finding or a comment cites it by name | never by default |
| `europe-2026-itinerary.html` | ~44k tok | you're auditing render paths end to end (say so) | `node cairn/tools/extract-legacy.mjs`, or grep — see `cairn-constraints` §1 |
| `CAIRN_VISUAL_ROADMAP.md` (+ its `.html` twin) | ~50k tok | never — read the **newest block only**, which supersedes the ones below it | not a contract doc; skip it for a routine builder/breaker task, and see below for when to *update* it |

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
