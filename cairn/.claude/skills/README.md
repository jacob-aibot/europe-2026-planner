# Cairn skills

Third-party skills vendored into the repo, plus one written for this project. All MIT — see the
`LICENSE.*` files here.

**Adding one is an architect ruling, not a judgement call.** The current set is ruled by
`cairn/docs/ARCHITECTURE.md` §9 **A-55**, which evaluated eight candidates and says why each is in or
out. Read it before vendoring anything else; Jacob has trimmed this directory once already (below).

**Why they live under `cairn/` and not the repo root.** These are directory-scoped: they apply to Cairn
development, not to the Europe 2026 trip planner at the repo root. That planner is a live app Jacob edits
in short data-only passes ("add X to Aug 14"), and the root `CLAUDE.md` requires those to be terse and to
land on `master` without a confirmation round. A TDD/planning methodology firing on those turns would be
actively wrong. If you want a skill available everywhere, move it to `.claude/skills/` at the root — and
read its description first to see what it will do to a two-line data edit.

**Vendored, not installed as plugins, on purpose.** These are checked in, so the four pipeline agents
(`architect`, `builder`, `breaker`, `manager`) and every session — local, web, subagent — see the same
version. Updating means re-copying from upstream, deliberately.

| Skill | Upstream | What it is for |
|---|---|---|
| `cairn-constraints` | *this repo* | The Phase 1 engineering contract: zero-dep core, Node type-stripping limits, determinism, read-only root planner, provenance rules. Read before writing code under `cairn/`. |
| `test-driven-development` | [obra/superpowers](https://github.com/obra/superpowers) | RED-GREEN-REFACTOR. The enforcement mechanism for the golden-fixture and determinism rules in `ROADMAP.md`. |
| `systematic-debugging` | obra/superpowers | Root-cause before fix. |
| `verification-before-completion` | obra/superpowers | Evidence before "it works". Directly answers what the `manager` agent checks. |
| `emil-design-eng` | [emilkowalski/skills](https://github.com/emilkowalski/skills) (MIT) | UI polish, component feel, and the invisible details. **Construction-time craft only** — `cairn/docs/DESIGN.md` §1 outranks it. A-55. |
| `animate` | emilkowalski/skills (MIT) | Decides whether a thing should animate *before* picking a curve, duration, property and interruption. The source of `DESIGN.md` **P6**'s motion budget. A-55. |
| `prototype` | emilkowalski/skills (MIT) @ `d23d7f8` | Builds several **genuinely different** alternatives behind a picker and stops for the user to choose. **Vendored 2026-09-02 under Jacob's visual-direction ruling**, which names it by name. `PICKER.md` is copied verbatim and is not a design decision. |
| `review-animations` | emilkowalski/skills (MIT) @ `d23d7f8` | Reviews motion against ten non-negotiable standards; default is to flag, approval is earned. **Vendored 2026-09-02 under the same ruling** ("animation review before any motion is approved"). |
| `impeccable` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0) @ `c0f4952`, skill 4.1.3 | Design guidance + a **deterministic detector** (`scripts/detect.mjs`) that scans rendered URLs and source files for anti-patterns. **Vendored 2026-09-02 under Jacob's ruling**, which upgrades A-55's "selective use" to mandatory operational use. Pin in `impeccable/PINNED-REVISION.txt`. Its detector needs four npm parser modules and puppeteer; those are installed **outside the repo** and symlinked in for a scan, so Cairn still takes no dependency. **Its design hook is deliberately NOT installed** — `REFERENCE-BOARD.md` §9 says why. Advisory: it never outranks the reference board or Jacob's approval. |

## Deliberately not installed

- **`using-superpowers`** (obra/superpowers) — its description demands a skill invocation "before ANY
  response including clarifying questions". That hijacks every turn in the repo, including trip-planner
  edits, and contradicts `CLAUDE.md`'s concision rule. The individual skills work without it; the
  `superpowers:`-prefixed cross-references inside them were rewritten to the bare names used here.
- **The other eight `emilkowalski/skills`** *(was ten; `prototype` and `review-animations` were
  vendored on 2026-09-02 — see the table above)* — `improve-animations`,
  `find-animation-opportunities`, `animation-vocabulary`, `animate-expo`, `apple-design`, `write-swift`,
  `ask-sonner` and **`pick-ui-library`**. The last one is the load-bearing omission: Cairn's
  library choices are ruled in **A-55**, and a skill that recommends a UI library would be a second
  authority on the one question this project most needs a single answer to. The audit-shaped ones
  (`review-animations`, `improve-animations`) overlap the breaker stage and `DESIGN.md` §6, which is the
  same overlap Impeccable's scored rubric was refused for. `animate-expo`/`write-swift`/`apple-design`
  become relevant only if `apps/mobile` is built.
- **Impeccable** — *this entry is superseded.* It was **vendored on 2026-09-02**; see the table above.
  The original reasoning is kept below because the fences it describes still apply.
  Historically: **approved
  for vendoring by A-55 and deliberately not vendored in the same pass**, so its behaviour can be watched
  on its own. Its *content* is already here in resident form: `cairn/docs/VISUAL-TELLS.md` is a hand-picked
  subset of its detector rules, restated as prose. If it is vendored: **the skill payload only** — no
  hooks, no `settings.json` edit, no CLI, no browser extension, no npm dependency, and **not** its
  five-dimension scored audit rubric, which would be a second severity taxonomy competing with
  `QA-FINDINGS.md`.
- **`ui-ux-pro-max`** — see *What was removed* below. Jacob removed it himself; **A-55 REJECTs
  re-adoption** and only Jacob can reverse that. Its catalogue is 79 named UI styles (glassmorphism,
  claymorphism, neumorphism, bento grid, …), which is substantially the aesthetic `DESIGN.md` P8 and
  `VISUAL-TELLS.md` §2 are written *against*.
- **Mem-Palace / cross-conversation memory skills** — this repo already keeps its memory in git:
  `CLAUDE.md`, `docs/HISTORY.md`, `docs/BOOKINGS.md` and `cairn/docs/*`. A parallel uncommitted store would
  become a second source of truth that drifts from those. `cairn-constraints` is the committed substitute.

## Local modifications to the vendored copies

Two mechanical rewrites, so upstream diffs stay readable:

1. `superpowers:<skill>` cross-references → the bare skill names used here (these are project skills, not a
   plugin, so the qualified form would not resolve).
2. `docs/superpowers/plans/` and `docs/superpowers/specs/` → `cairn/docs/plans/` and `cairn/docs/specs/`.
   The root `docs/` holds the live trip planner's `BOOKINGS.md` and `HISTORY.md`; Cairn's planning output
   does not belong there. `.superpowers/` (the subagent ledger) is gitignored.
3. Two descriptions rewritten (bodies untouched): `taste`'s was 1,299 characters of trigger examples, paid
   for on **every** session in this directory; `design-taste-frontend`'s now states the scope limit its own
   body declares, so it stops firing on product UI it is not built for.
4. **The two Emil skills each carry a Cairn fence** immediately under the frontmatter (bodies otherwise
   byte-identical to upstream at `main`, fetched 2026-09-01): it names `DESIGN.md` §1 as outranking them,
   restates P6's motion budget as the binding numbers, forbids the skill from introducing a runtime
   dependency, and lists the sibling skills it cross-references that are **not** vendored.
5. **One cross-reference rewritten in `animate/SKILL.md`** — its *"stop and invoke `pick-ui-library`"* now
   points at `ARCHITECTURE.md` §9 A-55, which is where Cairn's library choices are actually ruled. The
   sentence's underlying point (do not hand-roll a modal) is kept, because it is the reason A-55 leaves the
   Radix / Base UI door open.

## What these cost

Descriptions load eagerly — every session here pays for all of them. Bodies load only on invocation.

**Measured at revision 38** (`wc -c`, this tree): `emil-design-eng` **28,182 B** and `animate` **12,805 B**
of body, ≈ **7k** and **3k** tokens, loaded **only on invocation**. Their two descriptions add ≈ **0.2k** to
the eager cost below. That is the whole price of A-55's two adoptions.

| | ≈ tokens |
|---|---|
| All 18 descriptions, every session | ~1.1k |
| `design-taste-frontend` body, when invoked | 22k |
| `subagent-driven-development` body | 8k |
| `writing-skills` / `taste` / `ui-ux-pro-max` / `brainstorming` bodies | 4–7k each |
| `test-driven-development`, `systematic-debugging` | ~2k each |
| `cairn-constraints`, `verification-before-completion` | ~1.5k each |

The three you want firing most often are also the three cheapest. That is not a coincidence — it is why
`design-taste-frontend` got its scope line promoted into its description.

---

## What was removed, and why

Four skill sets were vendored here in one commit; Jacob trimmed them the same day. Only the three
`obra/superpowers` skills that serve this pipeline were kept, plus the project-written `cairn-constraints`.

Dropped: `ui-ux-pro-max` (3.5 MB design lookup database), both `taste-skill` repos (one needs a Playwright
MCP server that is not connected; the other scopes itself to landing pages, explicitly not product UI),
and the `superpowers` skills covering planning, parallel agents, code review and git worktrees — the
four-agent pipeline in `.claude/agents/` already does that work, and `using-git-worktrees` /
`finishing-a-development-branch` contradict the root `CLAUDE.md` master-only rule outright.

4.2 MB to 136 KB. Re-vendor from upstream if a specific one earns its place.
