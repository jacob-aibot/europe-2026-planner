# Cairn skills

Third-party skills vendored into the repo, plus one written for this project. All MIT — see the
`LICENSE.*` files here.

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
| `brainstorming`, `writing-plans`, `executing-plans` | obra/superpowers | Design-then-plan-then-build. |
| `subagent-driven-development`, `dispatching-parallel-agents` | obra/superpowers | Parallel work across the pipeline agents. |
| `requesting-code-review`, `receiving-code-review` | obra/superpowers | |
| `using-git-worktrees`, `finishing-a-development-branch` | obra/superpowers | Note: the root `CLAUDE.md` says `master`, no feature branches. Where these disagree, `CLAUDE.md` wins. |
| `writing-skills` | obra/superpowers | For editing the skills in this directory. |
| `design-taste-frontend` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Anti-slop frontend. **Read its scope line**: it targets landing pages, portfolios and redesigns, and says explicitly it is *not* for dashboards, data tables or multi-step product UI — which is most of `apps/web`. Best fit is Cairn's public share pages. |
| `redesign-existing-projects` | Leonxlnx/taste-skill | Audit-and-upgrade an existing UI. The better of the two for product screens. |
| `taste` | [senlindesign/taste-skill](https://github.com/senlindesign/taste-skill) | Reverse-engineers a site's design tokens + the reasoning behind them. Intended use here: point it at the existing planner to seed `packages/tokens`. **Requires the Playwright MCP server** — it is inert until that is connected (`claude mcp list \| grep playwright`). Upstream `docs/` (10 MB of images) was not vendored. |
| `ui-ux-pro-max` | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Searchable local design database (styles, palettes, font pairings, UX guidelines, chart types, 22 stacks incl. React Native). A lookup table, not judgement. Its Python scripts are stdlib-only and local; its own test suite was not vendored. |

## Deliberately not installed

- **`using-superpowers`** (obra/superpowers) — its description demands a skill invocation "before ANY
  response including clarifying questions". That hijacks every turn in the repo, including trip-planner
  edits, and contradicts `CLAUDE.md`'s concision rule. The individual skills work without it; the
  `superpowers:`-prefixed cross-references inside them were rewritten to the bare names used here.
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

`brainstorming` ships an optional local visual companion that hotlinks a logo from `primeradiant.com`. Set
`SUPERPOWERS_DISABLE_TELEMETRY=1` to suppress it. Nothing else here makes a network call.
