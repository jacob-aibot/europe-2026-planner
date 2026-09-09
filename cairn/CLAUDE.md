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

**Every row re-measured at revision 67/70 (2026-09-09)** — `ARCHITECTURE` 530k → **536k** with §8.4's
**A-86**, its amendment banner on **A-85** and its pointer banner on **A-59 Part 5** (§8 alone 130k →
**136k**; §2, §4 and §10 did not move) and `ROADMAP` 218k → **224k** with **I-25**, the two corrections in
place to **I-24** (Part 1's one spelling, the range-check criterion's scoping), *How a criterion is written*
rule **8**, and the revision-70 ledger entry (Phase 2 alone 158k → **162k** as `doc-section` reports it).
**A-86 is ~5k and it is now the entry point to the pick family — read it before A-85, A-85 before A-84, and
A-84 before A-83 Part 8, never Part 8 alone.** **A builder of `I-25` reads A-86 whole and A-59 Parts 3, 4
and 5, and nothing else** — not A-85, not A-84, not A-83, not §2 whole, §4 or §10, and no part of
A-76…A-81. `I-22b`'s and `I-23`'s reads are unchanged. This revision is a **QA consequence** — round 63
ran every door that can reach a `City`, could not break A-85 Part 2, and broke the *sentence describing it*
twice (a rule written two ways, a count written over two populations) while finding that `I-24` Part 4's
`Array.isArray` rider traded a loud failure for a silent under-count — and **`I-25` is routed builder +
breaker, with its round being the one `2b54c67` already owes rather than a second one**. **The standing
sequence is `I-25` → `I-22b` → `I-23`**, and `I-24` is built. **Two rows moved with QA round 63's commit
rather than with this revision, and are recorded here because `cairn/CLAUDE.md` is not a file a breaker
edits**: `QA-FINDINGS` 387k → **392k** and `BUILD-NOTES` 281k → **287k** (the I-24 addendum's own note says
281k; 287k is what the command returns, and the command is the source). `CAIRN_VISUAL_ROADMAP` 71k →
**72k** with this revision's block (and its `.html` twin in the same pass, which measures **86k** and is not
a document any agent reads — it is Jacob's). `REVIEW` is unmoved at **52k**.
**Every row re-measured at revision 66/69 (2026-09-09)** — `ARCHITECTURE` 523k → **530k** with §8.4's
**A-85**, its four amendment banners on **A-84** and its two pointer banners on **A-39 Part 11** and
**A-33 Part 2** (§8 alone 124k → **130k**; §2, §4 and §10 did not move) and `ROADMAP` 211k → **218k** with
**I-24**, the corrections in place to `I-22a` (the covering-table number and criterion N6), three to
`I-23`, *How a criterion is written* rule **7**, **Sequencing rule 9**, and the revision-69 ledger entry (Phase 2 alone 154k →
**158k** as `doc-section` reports it). **A-85 is ~5k and it is now the entry point to the pick family —
read it before A-84, and A-84 before A-83 Part 8, never Part 8 alone.** **A builder of `I-24` reads A-85
whole, then A-84 Parts 3, 4 and 7 and A-33 Part 2 with their revision-66 banners, and nothing else** — not
A-83, not A-84 Parts 1, 2, 5, 6, 9 or 10, not §2 whole, §4 or §10, and no part of A-76…A-81. `I-22b`'s and
`I-23`'s reads are unchanged. This revision is a **QA consequence** — round 62 could not break A-84's
staleness rule over all 7,342 shipped rows and found the same class one field over twice (a pick stale at
birth from the shortest call a picker writes; a census column whose denominator does not exist) — and
**`I-24` is routed builder + breaker, MANDATORY**. **The standing sequence is `I-22b` → `I-24` → `I-23`**,
and `I-23` now depends on `I-24` because one of its own criteria is unachievable before it.
**Three rows moved with QA round 62's commit rather than with this revision, and are recorded here because
`cairn/CLAUDE.md` is not a file a breaker edits**: `QA-FINDINGS` 382k → **387k**, `BUILD-NOTES` 275k →
**281k** with `I-22a`'s addendum, and `CAIRN_VISUAL_ROADMAP` 70k → **71k**. `REVIEW` is unmoved at **52k**.
**Every row re-measured at revision 65/68 (2026-09-09)** — `ARCHITECTURE` 514k → **523k** with §8.4's
**A-84** and the amendment banners it puts on A-83, A-82 and A-29 (§8 alone 115k → **124k**; §2, §4 and
§10 did not move) and `ROADMAP` 203k → **211k** with **I-22a**, **I-22b**, `I-22`'s banner, `I-23`'s two
new parts and the revision-68 ledger entry (Phase 2 alone 147k → **154k** as `doc-section` reports it).
**A-84 is ~7k and it is now the entry point to the pick family — read it before A-83 Part 8, never Part 8
alone.** **A builder of `I-22a` reads A-84 whole, then A-83 Part 8 and A-29 Parts 3–4 with their
revision-65 banners; a builder of `I-22b` reads A-84 Part 7 item 2 and A-82 Part 7 and nothing else; a
builder of `I-23` reads A-83 Parts 1–7 and 10–11 plus A-84 Parts 5 and 6, then A-82 Parts 2, 3, 4, 9 and
10.** None of the three opens §2 whole, §4 or §10, and none reads any part of A-76…A-81. This revision is
a **QA consequence** — round 61 measured that A-83 Part 8's picked arm never looks a gazetteer row up, so
a drawable but wrong country code outranked the coordinate and a shipped door reached it — and `I-22a` is
routed **builder + breaker, mandatory** while `I-22b` is builder-only.
**One row moved with round 61's own commit rather than with this revision, and is recorded here because
the breaker measured it and `cairn/CLAUDE.md` is not a file a breaker edits**: `QA-FINDINGS` 376k →
**382k**. `BUILD-NOTES` re-measures at **275k** (the round-61 note says 276k; the difference is rounding),
`CAIRN_VISUAL_ROADMAP` at **70k**, and `REVIEW` is unmoved at **52k**.
**Every row re-measured at revision 64/67 (2026-09-09)** — `ARCHITECTURE` 498k → **514k** with §8.4's
**A-83** and the amendment banners it puts on A-82, A-56 and A-29 (§8 alone 101k → **115k**; §2, §4 and
§10 did not move) and `ROADMAP` 196k → **203k** with the rewritten **I-22**, the new **I-23**, `I-21`'s
banner and the revision-67 ledger entry (Phase 2 alone 141k → **147k** as `doc-section` reports it).
**A-83 is ~13k and it is the entry point to the gazetteer family — it names every clause of A-82 that no
longer holds.** **A builder of `I-22` reads A-83 Parts 8 and 9, then A-29 Parts 2–4, A-82 Part 7 and
A-56's revision-64 banner; a builder of `I-23` reads A-83 Parts 1–7 and 10–11, then A-82 Parts 2, 3, 4, 9
and 10.** Neither opens §2 whole, §4 or §10, and neither reads any part of A-76…A-81. This revision is a
**QA consequence** — round 60 measured `I-21`'s travel hit rate at **21.5 %** against a 100 % control, and
the filter was on the wrong axis — and both increments are routed **builder + breaker, mandatory**.
**Three rows moved with earlier commits rather than with this revision, and are recorded here because the
command now returns a different figure from the one last written down**: `QA-FINDINGS` 370k → **376k**
with round 60, `BUILD-NOTES` 264k → **270k**, and `CAIRN_VISUAL_ROADMAP` 68k → **70k**. `REVIEW` is
unmoved at **52k**.
**Every row re-measured at revision 63/66 (2026-09-09)** — `ARCHITECTURE` 486k → **498k** with §8.4's
**A-82** and its three pointer banners (§8 alone 92k → **101k**; §2 is **174k**, which is A-82's one §2.10
paragraph inside rounding; §4 and §10 did not move) and `ROADMAP` 190k → **196k** with **I-21**, **I-22**
and the revision-66 ledger entry (Phase 2 alone 136k → **141k** as `doc-section` reports it). **A-82 is ~11k and, with §8.4 clause 1's
first four paragraphs, A-26 Part 2 and A-29 Part 3, is the whole read for a builder of `I-21`** — that
builder opens neither §2 whole, §4 nor §10, and **reads no part of A-76…A-81**, which is a closed and
unrelated arc. **This is the first revision in eight that is not a QA consequence**: it is a new capability
(a bundled offline city gazetteer, so a hand-entered past trip gets a real coordinate and therefore a real
country), and `I-21` is routed **builder + breaker, mandatory**. **Two rows moved with earlier commits, not
with this revision, and are recorded here because they had not been re-measured since**: `BUILD-NOTES` 259k
→ **264k** and `QA-FINDINGS` 369k → **370k**. `CAIRN_VISUAL_ROADMAP` re-measures at **68k** and `REVIEW` is
unmoved at **52k**.
**Every row re-measured at revision 62/65 (2026-09-09)** — `ARCHITECTURE` 480k → **486k** with §2.1's
**A-81** and A-80's four amendment banners (§2 alone 168k → **175k**; §4, §8 and §10 did not move) and
`ROADMAP` 186k → **190k** with **I-20** and the revision-65 ledger entry (Phase 2 alone 133k → **136k**).
**A-81 is ~5k, and A-81 whole plus A-80 Parts 2, 4, 7, 9 and 10 is the read for a builder of `I-20`** — that
builder opens neither §4, §8 nor §10 and **reads no part of A-76…A-79**. **A-81 Part 8 closes this arc**:
after `I-20`, a finding on the type-level door census is dispatched only if it names an export that exists
in `packages/core/src` today. **Three rows moved with QA round 59's commit (`b6156ec`) and I-19's build,
not with this revision, and are recorded here because the breaker measured but did not update this map**:
`QA-FINDINGS` 362k → **369k** (the breaker's note says 370k; `wc -c/4000` says 369k, and the difference is
rounding), `BUILD-NOTES` 251k → **259k** with I-19's addendum, and `CAIRN_VISUAL_ROADMAP` is **67k**
(the breaker's note says 68k). `REVIEW` is unmoved at **52k**.
**Every row re-measured at revision 61/64 (2026-09-08)** — `ARCHITECTURE` 469k → **480k** with §2.1's
**A-80** and A-79's six amendment banners (§2 alone 159k → **168k**; §4, §8 and §10 did not move) and
`ROADMAP` 182k → **186k** with **I-19** and the revision-64 ledger entry (Phase 2 alone 130k → **133k**).
**A-80 is ~9k, and A-80 whole plus A-79 Parts 3, 5, 10 and 11 is the read for a builder of `I-19`** — that
builder opens neither §4, §8 nor §10, and **reads no part of A-76, A-77 or A-78**, because every part of
A-79 that `I-19` touches carries A-80's amendment banner in place. **Two rows moved with QA round 58's
commit (`0429d80`), not with this revision, and are recorded here because the breaker measured but did not
update this map**: `QA-FINDINGS` 356k → **362k** and `CAIRN_VISUAL_ROADMAP` 66k → **67k**. `BUILD-NOTES`
did not move and is **251k**; `REVIEW` is unmoved at **52k**.
**Every row re-measured at revision 60/63 (2026-09-08)** — `ARCHITECTURE` 459k → **469k** with §2.1's
**A-79** and A-78's five amendment banners (§2 alone 151k → **159k**; §4, §8 and §10 did not move) and
`ROADMAP` 178k → **182k** with **I-18** and the revision-63 ledger entry (Phase 2 alone 127k → **130k**).
**A-79 is ~8k, and A-78 Parts 1, 2, 7, 9 and 10 plus A-79 whole is the read for a builder of `I-18`** —
that builder opens neither §4, §8 nor §10, **does not read A-76 or A-77** (only the one A-77 sentence A-79
Part 1 quotes), and **does not read A-78 Parts 3–6 or 8**, which `I-17` already shipped and which A-79 does
not touch. **Two rows moved with QA round 57's commit (`3381dc7`), not with this revision, and are recorded
here because the breaker measured but did not update this map**: `QA-FINDINGS` 350k → **356k** and
`BUILD-NOTES` 244k → **251k**. `CAIRN_VISUAL_ROADMAP` re-measures at **66k** and `REVIEW` is unmoved at
**52k**.
**Every row re-measured at revision 59/62 (2026-09-08)** — `ARCHITECTURE` 449k → **459k** with §2.1's
**A-78** and A-77's four amendment banners (§2 alone 141k → **151k**; §4, §8 and §10 did not move) and
`ROADMAP` 174k → **178k** with **I-17** and the revision-62 ledger entry (Phase 2 alone 125k → **127k**).
**A-78 is ~10k, and A-77 Part 6 plus A-78 whole is the read for a builder of `I-17`** — that builder opens
neither §4, §8 nor §10, and **does not read A-76 at all**. **Two rows moved with QA round 56's commit
(`680930c`), not with this revision, and are recorded here because the breaker measured but did not update
this map**: `QA-FINDINGS` 344k → **350k** and `BUILD-NOTES` 237k → **244k** (the breaker's note says 243k;
244k is what the command returns, and the command is the source). `CAIRN_VISUAL_ROADMAP` re-measures at
**65k** and `REVIEW` is unmoved at **52k**.
**Every row re-measured at revision 58/61 (2026-09-08)** — `ARCHITECTURE` 439k → **449k** with §2.1's
**A-77** (§2 alone 133k → **141k**; §8 91k → **92k** with the one note beside §2.9's A-20; §4 and §10 did
not move) and `ROADMAP` 171k → **174k** with **I-16** and the revision-61 ledger entry (Phase 2 alone 122k →
**125k**). **A-77 is ~9k and, with A-76 Part 3 in front of it, is the whole read for a builder of `I-16`**
— that builder opens neither §4, §8 nor §10, and **does not read A-76 Parts 4–6, which A-77 supersedes**.
**Two rows moved with QA round 55's commit (`1d23b2c`), not with this revision, and are recorded here
because the breaker measured but did not update this map**: `QA-FINDINGS` 337k → **344k** (the breaker's own
note says ~347k; 344k is what the command returns, and the command is the source) and `BUILD-NOTES` 233k →
**237k**. `CAIRN_VISUAL_ROADMAP` re-measures at **64k** (one k above its row below, which is rounding
rather than movement) and `REVIEW` is unmoved at **52k**.
**Every row re-measured at revision 57/60 (2026-09-08)** — `ARCHITECTURE` 432k → **439k** with §2.1's
**A-76** (§2 alone 128k → **133k**; §8 90k → **91k** with A-74 Part 7's amendment banner and A-27 Part 6
residue 1's Vatican correction; §4 and §10 did not move) and `ROADMAP` 167k → **171k** with **I-15**, the
revision-60 ledger entry and four corrected exit criteria (Phase 2 alone 119k → **122k**). **A-76 is ~7k
and Parts 3–7 are the whole read for a builder of `I-15`** — it is self-contained, quotes what it needs
from §2.9/§2.14/§4.2, and that builder opens neither §8 nor §10 nor the rest of §2. **Three rows moved with
QA round 54's commit (`7dad457`), not with this revision, and are recorded here because they had not been
re-measured since**: `QA-FINDINGS` 329k → **337k**, `BUILD-NOTES` 231k → **233k**, `CAIRN_VISUAL_ROADMAP`
60k → **62k**; the visual roadmap moved again to **63k** with this revision's block (and its `.html` twin
in the same pass). `REVIEW` did not move and is **52k**.
**One row re-measured at revision 59 (2026-09-08)** — `ROADMAP` 165k → **167k** with the revision-59 ledger
entry and the rewritten **I-11** *Dependencies / blockers* bullet, which now opens with a **READY** line
(Phase 2 alone 118k → **119k**). No increment was added and no code changed; the revision is a status
correction. The other five were re-measured and did not move (`ARCHITECTURE` 432k, `QA-FINDINGS` 329k,
`BUILD-NOTES` 231k, `CAIRN_VISUAL_ROADMAP` 60k, `REVIEW` 52k) — **`ARCHITECTURE.md` is untouched by
revision 59**.
**Every row re-measured at revision 56/58 (2026-09-04)** — `ARCHITECTURE` 428k → **432k** with §2.2's
**A-75** (§2 alone 125k → **128k**; §4, §8 and §10 did not move) and `ROADMAP` 163k → **165k** with **I-9c**,
the revision-58 ledger entry and two corrections to I-11's *Dependencies / blockers* and the sequencing line
(Phase 2 alone 116k → **118k**). **A-75 is ~5k and is the whole read for a builder of I-9c** — it is
self-contained and quotes what it needs from A-10, so that builder opens neither §2.9 nor §4 nor §8.
**Three rows moved with QA round 53's commit (`e77cded`), not with this revision, and are recorded here
because they had not been re-measured since**: `QA-FINDINGS` 318k → **329k**, `BUILD-NOTES` 224k → **231k**,
`CAIRN_VISUAL_ROADMAP` 58k → **60k**. `REVIEW` did not move and is **52k**.
**Two rows re-measured at revision 55/57 (2026-09-04)** — `ARCHITECTURE` 424k → **428k** with §8.3's
**A-74** (§8 alone 88k → **90k**; §2, §4 and §10 did not move, and §2.9's A-45 gains no banner because A-74
cites it rather than amending it) and `ROADMAP` 162k → **163k** with **I-9b** and the revision-57 ledger
entry (Phase 2 alone is still **116k**; I-9b is the smallest increment in the document — one test).
**A-74 is ~3k, and Parts 5–6 are the whole read for a builder of I-9b**; it needs none of §2, §4 or §10,
and **Part 4 is the two-paragraph read for anyone tempted to add a validation code for a field the parser
already refuses**. The other four did not move (`QA-FINDINGS` 318k, `BUILD-NOTES` 224k,
`CAIRN_VISUAL_ROADMAP` 58k, `REVIEW` 52k).
**Three rows re-measured at revision 54/56 (2026-09-04)** — `ARCHITECTURE` 416k → **424k** with §8.3's
**A-72** and **A-73** (§8 alone 82k → **88k**; §2 123k → **125k** and §10 unmoved at 40k, each gaining one
pointer banner), `ROADMAP` 159k → **162k** with **I-9a**, I-9's withdrawn verification bullet and the
revision-56 ledger entry (Phase 2 alone is now **116k**), and `BUILD-NOTES` 217k → **224k** with I-9's own
addendum (KD-96…KD-97) — that last row moved with commit `0e556a0`, not with this revision, and is recorded
here because it had not been re-measured since. **A-72 and A-73 together are ~6k and are what a builder of
I-9a reads whole**, plus §8.3 itself; they need none of §2, §4 or §10. The other three did not move
(`QA-FINDINGS` 318k, `CAIRN_VISUAL_ROADMAP` 58k, `REVIEW` 52k).
**Two rows re-measured at revision 55 (2026-09-04)** — `ROADMAP` 156k → **159k** with the revision-55 ledger
entry, **I-10**'s deferral banner and trigger, the rewritten **I-11** *Dependencies / blockers* sub-bullets,
the narrowed 2c cell and one more *Explicitly not in Phase 2* line (Phase 2 alone is now **114k**). **One
row re-measured and unmoved**: `CAIRN_VISUAL_ROADMAP` is still **58k** with revision 55's block, and **its
I-13f claim is now corrected in that block rather than left standing**. The other four did not move
(`ARCHITECTURE` is 416k and **is untouched by revision 55** — the deferral is a scheduling decision, not a
design change — `QA-FINDINGS` 318k, `BUILD-NOTES` 217k, `REVIEW` 52k).
**One row re-measured at revision 54 (2026-09-04)** — `ROADMAP` 153k → **156k** with the revision-54 ledger
entry and the rewritten **I-11** *Dependencies / blockers* bullet, which is now the authoritative
built/not-built list for Phase 2's gate (Phase 2 alone is now **111k**). The other five did not move
(`ARCHITECTURE` is 416k, `QA-FINDINGS` 318k, `BUILD-NOTES` 217k, `CAIRN_VISUAL_ROADMAP` 58k — **and its two
newest blocks are known-wrong about `I-13f`, see ROADMAP I-11** — `REVIEW` 52k).
**Three rows re-measured at revision 53 (2026-09-04)** — `ARCHITECTURE` 411k → **416k** with revision 53's
five in-place corrections to §4.2's **A-70** and **A-71** (QA round 51's R51-1/2/3/4/6) and the **count
rule** that replaces *"publish the command beside the number"* (§4 alone 109k → **114k**; §10 did not move
and is 40k; **A-71 is now ~10k and carries an amendment banner**), `ROADMAP` 152k → **153k** with the
revision-53 ledger entry and **How a criterion is written** rule 6, and `CAIRN_VISUAL_ROADMAP` 57k →
**58k** with its newest block. The other three did not move (`QA-FINDINGS` is 318k, `BUILD-NOTES` 217k —
measured 217k against the 216k row below, which is rounding rather than movement — `REVIEW` 52k).
**Three rows re-measured at QA round 51 (2026-09-04)** — `QA-FINDINGS` 313k → **318k** with round 51,
`CAIRN_VISUAL_ROADMAP` 55k → **57k** with its newest block, and `BUILD-NOTES` 209k → **216k** with
I-13i's addendum (KD-91…KD-95); the other three did not move (`ARCHITECTURE` is 411k, `ROADMAP` 152k,
`REVIEW` 52k).
**Two rows re-measured at revision 52 (2026-09-04)** — `ARCHITECTURE` 399k → **411k** with §4.2's **A-71**
(§4 alone 102k → **109k**) and §10's **A-66 Part 11** (§10 38k → **40k**), plus A-70 Part 7 item 3's
corrected counts; and `ROADMAP` 147k → **152k** with **I-13i** and the revision-52 ledger entry (Phase 2
alone is now **109k**). **A-71 is ~8k and A-66 Part 11 is ~2k, and the two together are what a builder of
I-13i reads whole.** The other four did not move (`QA-FINDINGS` is 313k, `BUILD-NOTES` 209k — one k above
the row below, from round 50's fix pass — `CAIRN_VISUAL_ROADMAP` 55k, `REVIEW` 52k).
**Three rows re-measured at QA round 50 (2026-09-04)** — `QA-FINDINGS` 305k → **313k** with round 50,
`CAIRN_VISUAL_ROADMAP` 53k → **55k** with its newest block, and `BUILD-NOTES` 205k → **208k** with
I-13h's addendum; the other three did not move (`ARCHITECTURE` is 399k, `ROADMAP` 147k, `REVIEW` 52k).
**Three rows re-measured at revision 51 (2026-09-04)** — `ARCHITECTURE` 389k → **399k** with §4.2's
**A-70** and A-69's in-place corrections (§4 alone 93k → **102k**; §10 37k → **38k** with A-65 T1's scope
sentence; **A-70 is ~7k and is the entry a builder of I-13h reads whole**), `ROADMAP` 142k → **147k** with
**I-13h**, I-13g's four in-place corrections and the revision-51 ledger entry (Phase 2 alone is now
**105k**), and `BUILD-NOTES` 199k → **205k** with I-13g's addendum (KD-83…KD-86); the other three did not
move (`QA-FINDINGS` is 305k, `CAIRN_VISUAL_ROADMAP` 53k, `REVIEW` 52k).
**Three rows re-measured at revision 50 (2026-09-04)** — `ARCHITECTURE` 376k → **389k** with §4.2's **A-69**
(§4 alone 82k → **93k**; A-69 is ~12k and is the entry a builder of I-13g reads whole), `ROADMAP` 137k →
**142k** with **I-13g** and the revision-50 ledger entry (Phase 2 alone is now **100k**), and
`CAIRN_VISUAL_ROADMAP` 52k → **53k** with revision 50's block; the other three did not move
(`QA-FINDINGS` is 305k, `BUILD-NOTES` 199k, `REVIEW` 52k).
**Two rows re-measured at revision 49 (2026-09-04)** — `ARCHITECTURE` 364k → **376k** with §4.2's **A-68**
(§4 alone 71k → **82k**; A-68 is ~11k and is the entry a builder of I-13e reads whole) and `ROADMAP`
132k → **137k** with **I-13e**, **I-13f** and the revision-49 ledger entry (Phase 2 alone is now **97k**);
the other four did not move (`CAIRN_VISUAL_ROADMAP` is **51k** with revision 49's block, one k above the
row below).
**Two rows re-measured at QA round 49 (2026-09-04)** — `QA-FINDINGS` 300k → **305k** with round 49
and `CAIRN_VISUAL_ROADMAP` 50k → **52k** with its newest block; the other four did not move
(`ARCHITECTURE` is 376k, `ROADMAP` 137k, `BUILD-NOTES` 199k — one k above the row below, from
I-13e's addendum).
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
| `ARCHITECTURE.md` | **~536k tok** | **never.** Not even for a broad design revision — read sections | `cairn/tools/doc-section ARCHITECTURE <sections>`; run it bare to list every section with its size, and see the table at the top of the doc for who needs what. §2 is **175k**, §8 is **136k**. **Revision 67 put A-86 at the END of §8.4 and it is now the entry point to the pick family — read A-86, then A-85, then A-84, then A-83 Part 8, never Part 8 alone** (QA round 63: every door that can reach a `City` was *run* and A-85 Part 2's distinction **held**. What broke is the sentence describing it — a rule written two ways, `'centre' in c` **and** `!== undefined`, so the increment shipped the *choice*; and a count written over two populations, *"the reference trip reports zero"* where the `Place` arm uses the same code for a **missing** coordinate and the trip reports one. A-86 names **`c.centre !== undefined`**, rules an **inherited** `centre` honoured as written and refuses `hasOwnProperty` at that door, scopes the range-check criterion to **`ref.kind === 'trip'`** with both numbers stated, gives `TravelStats` **`unreadableCityLists`** because `I-24` Part 4's `Array.isArray` guard turned a loud failure into a silent under-count, and records the unbounded stored count as a residue with its trigger rather than inventing a cap. **No version constant moves; §2.10 stays at 88.**) **A-86 is ~5k and, with A-59 Parts 3, 4 and 5, is the whole read for a builder of ROADMAP `I-25`.** §8 was **130k** before — **revision 66 put A-85 at the END of §8.4 and it is READ FIRST, before A-84 Parts 3, 4 and 7 and A-33 Part 2, each of which carries its amendment banner** (QA round 62: A-84's exact-float staleness rule held over all **7,342** shipped rows — 0 refused, 0 stale, 0 mis-attributed, `-0` cannot flip liveness, no core path quantises a coordinate — and the door census was *run*. What broke is A-84's **reach**: `CityInit.centre` and `CityInit.pick` are independent optionals, so `createTrip({cities:[{name, pick}]})` — the exact call the picker UI makes — stored a well-formed pick on a city with **no centre**, stale at birth and attributing nothing forever; and `TravelStats.seen.places` was a **lower bound published as a count**, because no stored row carries a total place count. A-85 rules: **an absent `centre` beside a pick means the point the pick names** (an explicit `centre`, `null` included, is honoured verbatim — the erase case is A-84's and stands); **`TripSummaryRow` gains `placeCount`, `SUMMARY_VERSION` 7 → 8, `ROW_KEYS` 14 → 15**, which is A-33 Part 2's architect ruling and is made there; the existing **`lat_lng_out_of_range`** gains `City.centre` and `pick.centre` with no new code; the covering table is **40**, not 35, and the law is restated over **both** version constants; and a criterion may assert **where a rule lives** and never which words a file does not contain.) **A-85 is ~5k and, with A-84 Parts 3, 4 and 7 and A-33 Part 2, is the whole read for a builder of ROADMAP `I-24`.** §8 was **124k** before — **revision 63 put A-82 at the END of §8.4 and it is SELF-CONTAINED: it is read with §8.4 clause 1's first four paragraphs, A-26 Part 2 and A-29 Part 3, and with NOTHING from §2.1's A-76…A-81 arc** (the bundled offline city gazetteer — `ne_10m_populated_places` at the same pinned `v5.1.2` tag as the country index, emitted by `tools/gen-gazetteer.mjs` into `packages/core/src/geo/gazetteer.gen.ts`. Two measurements decide it: the shipped `COUNTRY_INDEX` **contradicts the gazetteer on 98 named border towns** — Maastricht→`BE`, Niagara Falls→`CA`, Lugano→`IT` — so a row ships only where `countryOf(row.centre)` agrees or is `null`, the 98 are refused **by name in a golden**, and **A-29 is untouched, `countrySource` gains no value and `SUMMARY_VERSION` does not move**; and the micro-state fear is already discharged — the settlement points for `VA`, `MC`, `SM`, `AD`, `SG`, `HK` and `MT` all resolve correctly, because R54-5's `{IT:476, VA:4}` is an **area** statement over a 480-cell sweep, not a statement about the city. It also rules the **fold** as a five-step ordered algorithm with an explicit substitution table, and that it is **not** `normalizeCityName` and may not be implemented in terms of it; prefix and token-prefix matching with **no fuzzy, no substring, no non-Latin in v1**; a **total** ranking order; **a pick is the user's own** so no badge and no field on `City`, while an **auto-match with no human choosing is FORBIDDEN**; and the data behind a **second declared entry point `@cairn/core/gazetteer`**, lazily imported, because unlike `COUNTRY_INDEX` the gazetteer is **not on the write path**. §2.10 moves **86 → 87**.) **A-82 is ~11k and is the whole read for a builder of ROADMAP `I-21`.** **revision 62 put A-81 at the END of §2.1, directly under A-80, and it is READ FIRST, before A-80 Parts 2, 4, 7, 9 and 10, each of which carries its amendment banner** (QA round 59: A-80's descent held — 35 census rows correct, the `abstract new` arm correct against five variations it was never measured on — and what broke is **where the leaf test is asked**: `IsDoor` was asked once, of the whole type, *above* the distribution, so a door that **is** a union member was invisible at every depth; `CarriesOne`'s three arms were ordered and exclusive, so a callable-and-constructable type never reached the third; and `ILLEGAL_SHAPE_CENSUS` had no walk at all. A-81 adopts the breaker's own measured fix — **the leaf test inside the distribution, all three arms asked independently** — gives the illegal census reach by **tagging the one walk** rather than copying it, **deletes `NonNullable<T[K]>`** as redundant by construction, adds five census rows and refuses the general two-fixtures-per-constructor rule. **Its Part 8 CLOSES this class to adversarial search by Jacob's direction**: after `I-20`, a finding here is dispatched only if it names an export that exists in `packages/core/src` today, and the one trigger that reopens it is an unopenable document in the wild. **Part 8 claims no completeness — that was the failure this arc kept repeating.**) **A-81 is ~5k and, with A-80 Parts 2, 4, 7, 9 and 10, is the whole read for a builder of ROADMAP `I-20`** — A-76…A-79 are not read at all. **Revision 61 put A-80 at the END of §2.1, directly under A-79, and it is READ FIRST, before any of A-79 Parts 3, 4, 5, 9, 10 or 11, each of which carries its amendment banner** (QA round 58: A-79's *subject*, its refusal of an arm-per-carrier, its `NON_DOORS` liveness and its 12-hop bound all held. What broke is A-79's **closure claim** — it said a sixth finding could *only* be an overload set, a >12-hop nesting or a cast, and there was a fourth way: **`Carries` descended through exactly two type constructors**, a bare object type's own keys and a call signature's return type, while the model is written in **106 optional properties**, **six discriminated unions of object types** and `X | null` throughout. Nine carrier shapes with no cast, no `any`, one call signature and the door two hops down were invisible; three of them wrote unopenable documents. A-80 adopts the breaker's measured two-line repair — `Members` walks `NonNullable<T[K]>`, and `Carries` **distributes** over unions instead of bracket-guarding them — refines it with an `abstract new` arm that closes the construct signature **as a carrier**, corrects two drifts in A-79's own evidence (the census names **eleven**, not ten; `Map<string, door>` was caught by accident), narrows A-79 Part 9's async claim, and **withdraws the numbered-exceptions closure format** in favour of a **coverage claim over TypeScript's own type constructors, checked by a standing `DESCENT_CENSUS`**). **It is ~9k and, with A-79 Parts 3, 5, 10 and 11, is the whole read for a builder of ROADMAP `I-19`** — **A-76, A-77 and A-78 are not read at all**, and *"anyone adding a build function"* now reads **A-79 Part 4's normal form as amended by A-80 Part 7**. **Revision 60 put A-79 at the END of §2.1, directly under A-78, and it is read *with* A-78 and never instead of it** (QA round 57: A-78's *subject* — the whole-tree census — held under every scope attack there is, so Part 10's *"no enclosing scope left to widen to"* stands. What broke is its **PREDICATE**: `IsDoor` matched only a module member that is itself a callable function value, so a `Trip`-producing **class method, static method, object-literal method, `Record` arrow, getter, higher-order return or overload set** was invisible inside a censused file — and `conflict/rules/overlap.ts`'s `export const overlap: Rule = { … }` is that shape in ten shipped files. A-79 refuses an arm-per-carrier and asks **one recursive structural question** instead — *is a `Trip`-producing callable reachable from this export, through a property or a call signature's return type, at any depth?* — which closes a `Map` of doors, a class returned from a factory and a function with a door hung off it, **none of which it was told about**; states the **normal form** (*a door is a module-level exported function with a single call signature*, because the census is name-keyed and an unnamed door could not be guarded even if it were found); makes `NON_DOORS` hold only **live** excuses so eviction reddens the compiler and R57-2's substitution attack dies; and restates **Invariant R** over collection arrays and insertion as well as records). **It is ~8k and, with A-78 Parts 1, 2, 7, 9 and 10, is the whole read for a builder of ROADMAP `I-18`** — **A-76 and A-77 are not read at all**, **A-78 Parts 3–6 and 8 are not read** (`I-17` shipped them and A-79 does not touch them), and *"anyone adding a build function"* now reads **A-78 Parts 1–2 and A-79 Parts 3–4**. **Revision 59 put A-78 at the END of §2.1, directly under A-77, and it is read *with* A-77 and never instead of it** (QA round 56: A-77's *mechanism* held under every attack — the finding is that its door CENSUS still enumerated door **files**, so a `Trip`-returning export in `derive/lifecycle.ts` was invisible to both halves, and its classifier matched an *exact* `Trip` return type, so `Trip | null` and `Promise<Trip>` were not doors. A-78 makes the census read `packages/core/src` **whole** — one list of module paths checked against a recursive directory read, plus a runtime check that a door's name is unique in the package — widens the classifier to the three legal return shapes, **refuses a `Trip` inside a wrapper by rule**, states **Invariant R** (*records are replaced, never rewritten*), and carries four riders: `isIsoDate` deleted at both trip doors, `TripMetaPatch` joining the patch-allowlist family, `provenance` leaving `DayMetaPatch`, and A-77 Part 9's cost sentence corrected to the measured bound). **It is ~10k and, with A-77 Part 6, is the whole read for a builder of ROADMAP `I-17`** — **A-76 is not read at all**, and *"anyone adding a build function"* now reads **A-78 Parts 1–2**. **Revision 58 put A-77 at the END of §2.1, directly under A-76, and it is read *with* A-76 and never instead of it** (QA round 55: A-76's mechanism is right and its **table** was short — sixteen door × field cases still wrote an unopenable document and two of its exemption reasons were false, so the enumeration is **deleted**: a door returns through `commit(where, before, after)`, which finds the records the door wrote by object identity and hands each to `fromJSON`'s own parser; the trip's scalars become a parseable unit, `assertStorable` returns what it validated, and the door census becomes one the **compiler** computes). **It is ~9k and, with A-76 Part 3, is the whole read for a builder of ROADMAP `I-16`** — **A-76 Parts 4, 5 and 6 are superseded and are not read**, and *"anyone adding a build function"* now reads **A-77 Part 6**, not a table. **Revision 57 put A-76 at the END of §2.1, under A-32** (a build door hands the record it wrote to `fromJSON`'s own per-record parser rather than keeping a second opinion about what the record class may hold; three redundant per-field guards are deleted, two are kept, and a standing census over `packages/core/src/build/` closes the door set); **it is ~7k, self-contained, and Parts 3–7 are the whole read for a builder of ROADMAP `I-15`**, and ~~anyone adding a build function, a field to a record class, or an enum to the model reads its Part 5 table first~~ **(revision 58: there is no table — read A-77)** — it also amends §8.3 **A-74 Part 7** (that residue's trigger has fired and its stated answer, *"another door guard in `build/`"*, is superseded) and corrects §8.4 **A-27 Part 6 residue 1**'s Vatican sentence in place. **Revision 56 put A-75 in §2.2, directly under A-10** (the merge banner names records by the product's noun for the class plus the record's own name, across all ten of `describeMerge`'s record classes, and `describeMerge` never takes a `Trip`); **it is ~5k, self-contained, and the whole read for a builder of ROADMAP `I-9c` — that builder opens neither §2.9 nor §4 nor §8** — and **anyone adding a record array to `Trip` reads its Part 4 beside §10.1's "add it to `mergeTrips`" rule** — **revision 54 put A-72 and A-73 in §8.3, the first rulings to land there** (`SCHEMA_VERSION` → 3 because `participants` is records, and `duplicate_participant_id` has one home in `validateTrip`); **they are ~6k together and are the whole read for a builder of ROADMAP `I-9a`**, and they add one pointer banner each to §2.9's A-20 and §10's A-57 Part 5, neither of which moves. **Revision 55 added A-74 under them** (~3k, 88k → 90k): a participant `kind` outside its enum can never reach `validateTrip` because the parser has always refused it, so **no new `Issue` code** — and its Part 4 states the general rule (*an enum-constrained field earns a `validateTrip` code only if some producer of a `Trip` other than the parser can mint a bad value; a cast is not a producer*), which is the read before adding any validation code for a field the parser already refuses. §8 was 82k before (revision 41: A-59/A-60 joined §8.4; revision 42: A-60 gained Part 6; revision 44: A-38 Part 5's checkable line restated), **§4 is 114k** — revision 47 put **A-67** (the store's generation guard) at the end of §4.2, 59k → 69k, revision 48 gave it **Part 7a**, 69k → 71k, revision 49 put **A-68** (~11k) directly under it, 71k → 82k, revision 50 put **A-69** (~12k, the settling boundary that ends the enumeration) under *that*, 82k → 93k, revision 51 put **A-70** (~7k, the predicate that asks the slot rather than the field) under *that*, 93k → 102k, and revision 52 put **A-71** (~8k, the brand that stops a `catch` blaming the data for a broken view) under *that*, 102k → **109k**, and revision 53 corrected five of A-70's and A-71's own sentences in place after QA round 51 confirmed the mechanism ships (109k → **114k**; **A-71 is now ~10k and both entries carry amendment banners that are read first**, and **A-70 Part 7 item 3 is the *count rule*: a contract document states design counts and never the value a grep returns over source — read it before writing any number into `ARCHITECTURE.md` or `ROADMAP.md`**); they are the five entries in §4 that are *not* about the map, and **A-71 is read alone** — it is not part of the generation-guard family — so a builder of I-13i reads **A-71 whole** plus §10 A-66 Part 11, and needs none of §4.4; **§10 (photos) is 40k and self-contained** — revision 40 built it, revision 43 added A-61, revision 44 added **A-62/A-63/A-64** (16k → 25k), revision 45 added A-62 Part 8's fourth residue (25k → 27k), revision 46 added **A-65/A-66** (27k → 36k), revision 47 added A-66's **Part 10** (36k → 37k), revision 51 added A-65 T1's scope sentence (37k → 38k) and revision 52 added A-66's **Part 11** (~2k, 38k → **40k**) |
| `ROADMAP.md` | **~224k tok** | **never** | `cairn/tools/doc-section ROADMAP "Phase N" "Sequencing rules"` (matches heading text as well as number — see the tool's `--help`). Phase 2 alone is **~162k**; grep for your increment. **Revision 70 (2026-09-09): QA round 63 sent `I-24` back with 0 blockers, 1 MAJOR and 8 MINORs; the four builder-routed findings are fixed at `2b54c67` and **`I-25`** is queued as the code consequence of `ARCHITECTURE.md` revision 67's §8.4 **A-86** (`TravelStats` gains `unreadableCityLists`; two `createTrip.ts` comments stop offering a spelling the ruling no longer offers; two residues written where they are read). **The sequence is `I-25` → `I-22b` → `I-23`**, and `I-25`'s adversarial round is **the one `2b54c67` already owes, not a second one**. `I-24`'s entry is corrected **in place** in two places (Part 1's one spelling — R63-7; the range-check criterion's scoping and both numbers — R63-8) and carries a banner saying so. *How a criterion is written* gains **rule 8**. **`I-24` is BUILT and NOT yet adversarially verified, and nothing in this arc has a manager SHIP verdict.** **Revision 69 (2026-09-09): QA round 62 sent `I-22a` back to the architect with 0 blockers and 2 MAJORs, both of them A-84's reach rather than its mechanism — so **`I-24`** is queued as the code consequence of `ARCHITECTURE.md` revision 66's §8.4 **A-85** (a pick lands on the point it names; `TripSummaryRow` gains `placeCount` and `SUMMARY_VERSION` goes 7 → 8; `lat_lng_out_of_range` gains two subjects; the covering table 40 → 45), routed **builder + breaker, MANDATORY**. **The sequence is `I-22b` → `I-24` → `I-23`**: `I-23` now lists `I-24` as a blocker, because its own parent-translation criterion drives `cityPickFromRow` through `createTrip` and is unachievable before `I-24` Part 1. `I-22a`'s entry is corrected **in place** in two places (the covering table is **40**, not 35 — R62-3; criterion **N6** is rewritten — R62-4), and `I-23` in three (the `I-24` blocker, the export count **88** not 87, and a new ceiling that no shipped row sits at `{0,0}`). *How a criterion is written* gains **rule 7**. **No `.tsx` and no `apps/web` file in any queued increment** — the visual direction is unresolved and the picker is not built here.** **Revision 68 (2026-09-09): QA round 61 measured that `I-22`'s picked arm never looks a gazetteer row up — a drawable but WRONG country code outranked the coordinate, and `setTripMeta` reached it with no hand-editing — so **`I-22a`** is queued as the code consequence of `ARCHITECTURE.md` revision 65's §8.4 **A-84** (the pick becomes a record read whole, invalidated when the city's centre moves, refused whole by the parser; `SCHEMA_VERSION` 4 → 5, `SUMMARY_VERSION` 6 → 7, §2.10 87 → 88), routed **builder + breaker, MANDATORY**. **`I-22b`** is queued beside it — two files, `MapBounds.centre` becomes nullable so the day map stops opening on the Gulf of Guinea — and is **builder-only**. `I-22`'s entry is left as history under an amendment banner; **`I-22a` is the one to build**, and `I-23` gains parts 3a and 3b (the parent translation and the tri-state `indexSays`) rather than a separate ticket.** **Revision 66 (2026-09-09): a NEW CAPABILITY, not a QA consequence — `I-21`, the bundled offline city gazetteer, is queued as the whole code consequence of `ARCHITECTURE.md` revision 63's §8.4 **A-82**, and `I-22` (`City.centre: LatLng | null` plus the field that would restore the 98 refused border towns) is queued behind it and NOT routed. `I-21` is routed **builder + breaker, MANDATORY** — a new capability touching the `packages/core` export surface — and it **changes no record shape at all**: a generator, two `geo/` modules, one export, a `cli.ts cities` command, two goldens and a budget test. **No `.tsx` and no `apps/web` file of any kind**, including the `boundaries.test.ts` `allowBare` entry, which belongs to whichever increment adds the first web consumer.** **Revision 65 (2026-09-09): `I-19` is built (`386c459`) and QA round 59 sent it back — one placement error wearing three shapes (the leaf test asked above the distribution, not inside it) — so **`I-20`** is queued as the code consequence of `ARCHITECTURE.md` revision 62's §2.1 **A-81**, and it is the **LAST** increment in this arc. `I-19`'s entry is left as built-and-short; **`I-20` is the one to build**, R59-7 rides inside it as one comment line, and it is routed **builder-only** on A-81 Part 8's authority. **`I-20` touches `storable.test.ts` and `BUILD-NOTES.md`, nothing else** — no `src`, no `tsconfig.json`, no `qa/`. Its one stop-and-report condition: `ILLEGAL_SHAPE_CENSUS` must be green over the unmodified tree.** **Revision 64 (2026-09-08): `I-18` is built (`77ef3ba`) and QA round 58 sent it back — this time it falsified the previous ruling's own *closure claim*, so **`I-19`** is queued as the code consequence of `ARCHITECTURE.md` revision 61's §2.1 **A-80** (the recursive predicate is repaired to descend unions and optional properties; a construct-signature arm closes R58-2; a new `DESCENT_CENSUS` makes the coverage claim compiler-checked instead of prose; `"noErrorTruncation": true` in `tsconfig.json`). `I-18`'s entry is deliberately left as built-and-short rather than rewritten; **`I-19` is the one to build**, and R58-3/R58-4 ride inside it as one line each. **`I-19` touches no `src` file at all** — `storable.test.ts`, `tsconfig.json` and `BUILD-NOTES.md`, nothing else.** **Revision 63 (2026-09-08): `I-17` is built (`c677162`) and QA round 57 sent it back — the census's SUBJECT held against every scope attack and its PREDICATE did not, so **`I-18`** is queued as the code consequence of `ARCHITECTURE.md` revision 60's §2.1 **A-79** (one recursive structural predicate replaces the declaration-form predicate; `NON_DOORS` holds only live excuses; Invariant R is restated over collection arrays). `I-17`'s entry is deliberately left as built-and-short rather than rewritten; **`I-18` is the one to build**, and R57-4/5/6 ride inside it rather than as separate tickets — **R57-4's answer is to DELETE the published test count in `BUILD-NOTES.md` §2, not to re-measure it a fourth time** (§4.2 A-70 Part 7 item 3), which leaves two `qa/` probes red on purpose for the **breaker** to re-cut in round 58.** **Revision 62 (2026-09-08): `I-16` is built (`97f1fc1`) and QA round 56 sent it back — the mechanism HELD and the door **census** did not, so **`I-17`** is queued as the code consequence of `ARCHITECTURE.md` revision 59's §2.1 **A-78** (the census reads `packages/core/src` whole; four riders ride along: `isIsoDate` deleted at both trip doors, `TripMetaPatch` joining the patch-allowlist family, `provenance` leaving `DayMetaPatch`, Invariant R written down). `I-16`'s entry is deliberately left as built-and-short rather than rewritten; **`I-17` is the one to build**, and R56-4/R56-6 are separate small builder fixes to `commit.ts` and `days.ts` that are not part of it.** **Revision 61 (2026-09-08): `I-15` is built (`6687118`) and QA round 55 sent it back — R54-1 is narrowed, not closed — so **`I-16`** is queued as the code consequence of `ARCHITECTURE.md` revision 58's §2.1 **A-77**. `I-15`'s entry is deliberately left as built-and-short rather than rewritten; **`I-16` is the one to build**, and R55-4's builder half changed with the ruling (do **not** widen the `export function` regex — the collector is replaced). **Revision 59 (2026-09-08) re-measured I-11's whole dependency chain against `git log` on `master` and the answer is READY: every required increment is built and on `master` — `I-9` (`0e556a0`), `I-12a` item 5 (`4b02206`) and `I-13a` (`9c16984`) were the last three and all three are discharged; `I-9c` is queued and unbuilt and blocks nothing; `I-10` and `I-13f` stay deferred with triggers. Before ordering Phase 2's gate, grep `I-11 — The phase gate` and read its *Dependencies / blockers* bullet whole — revision 54 made it the authoritative built/not-built list, and it supersedes the 2d status cell and the visual roadmap where they disagree; revision 55 rewrote its 2c sub-bullets and revision 56 added `I-9a` to them, and the short version is that `I-9` is built and discharged (`0e556a0`), `I-9a` is a follow-up that does NOT block the gate, and `I-10` is DEFERRED by Jacob's decision and does not block it either; revision 57 adds `I-9b`, one test, and revision 58 adds `I-9c` (A-75's merge-banner wording), and neither blocks the gate — **`I-9c` is not a 2c increment at all**, it is a cross-cutting core fix that took a number in this series only because QA round 53 found it while confirming the participants arc**. **Revision 60 (2026-09-08) carries the Phase 2 phase gate's six architect-routed findings**: `I-15` is queued (the whole code consequence of `ARCHITECTURE.md` revision 57's §2.1 **A-76**, a cross-cutting core fix like `I-9c` and not a 2c increment), and **four exit criteria were corrected in place — 4c (Vatican), 10 (the parser accepts a duplicate participant id and `validateTrip` reports it, per A-73), 14 (the generated-geometry exclusion) and criterion E's block quote (86, and the duplicate number removed)** — so a round re-deriving any of those four reads the criterion as it stands now, not as round 54 measured it. **The gate has RUN**; `I-11`'s *Dependencies / blockers* bullet is now history rather than a precondition, and the SHIP/SEND BACK verdict is the manager's |
| `BUILD-NOTES.md` | **~287k tok** | **never** | `cairn/tools/doc-section BUILD-NOTES <sections>`; check the Status note at the top before trusting §4/§5's numbers |
| `QA-FINDINGS.md` | **~392k tok** | **never** — it is the largest document in the repo | the Status note at the top + the specific finding(s) you were routed |
| `REVIEW.md` | ~52k tok | you're the builder/breaker acting on its routing table — and then only the current verdict | the Status note at the top tells you whether it's even current; the verdict table names which entries are closed |
| `docs/HISTORY.md`, `cairn/docs/archive/*` | — | a finding or a comment cites it by name | never by default |
| `europe-2026-itinerary.html` | ~44k tok | you're auditing render paths end to end (say so) | `node cairn/tools/extract-legacy.mjs`, or grep — see `cairn-constraints` §1 |
| `CAIRN_VISUAL_ROADMAP.md` (+ its `.html` twin) | ~72k tok | never — read the **newest block only**, which supersedes the ones below it (**revision 70's block is the newest**: it covers QA rounds 61–63 in one pass and carries the built / verified / shippable table for the whole pick arc) | not a contract doc; skip it for a routine builder/breaker task, and see below for when to *update* it |

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
