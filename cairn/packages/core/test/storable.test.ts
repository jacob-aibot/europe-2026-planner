/**
 * §2.1 **A-81** — *the leaf test is asked inside the distribution, both censuses walk the same tree,
 * and this class is CLOSED.* ROADMAP **I-20**, from QA **R59-1/R59-2/R59-3** (MAJOR) with **R59-4**
 * and **R59-6** riding along and **R59-7** as one clause. **Read this before A-80 below**, whose
 * Part 2 code block, Part 10 parameter sentence and *"four things"* count it supersedes. **Never
 * read A-81 instead of A-80** — A-80's descent, its `abstract new` arm, its `DESCENT_CENSUS` and its
 * coverage claim all HELD under round 59 and are what this file still is.
 *
 * **One defect wearing three shapes: *the leaf test was asked once, of a whole type, ABOVE the
 * distribution, while the thing that distributes never asked it*.** A-80's walk has two layers —
 * `Carries`, which distributes over a union and collapses existentially, and `CarriesOne`, which
 * descends one non-union type — and `IsDoor` was wired to the outside of the distribution only.
 * Everything round 59 found falls out of that one placement:
 *
 *   - **R59-1.** A door that **IS a union member** — `Door | ((t: Trip) => void)` — was invisible:
 *     `TripishReturn` distributes and answers with the *union of the returns*, `Trip | void`, which
 *     is not exactly `Trip`. All three of A-80's union rows put the door one hop *below* the member,
 *     so they exercised the descent and never the test at the bottom of it. Three such carriers in
 *     `derive/lifecycle.ts` left `npm run typecheck` at exit 0 and wrote **three** documents
 *     `fromJSON` refuses.
 *   - **R59-2.** `CarriesOne`'s three arms were a **conditional chain**, so they were ordered and
 *     exclusive: a type with a call signature *and* a construct signature matched the first arm,
 *     that arm answered `false`, and A-80's own new construct arm was never reached.
 *   - **R59-3.** `ILLEGAL_SHAPE_CENSUS` mapped `IsIllegal` over **module members only**. It had no
 *     walk at all, so `Trip | Day` was caught at the top level and invisible one hop down. **The
 *     same root shape: a leaf test asked once, of a whole type, with a union on the answer side.**
 *
 * **R59-4 is the fourth face and it points the other way:** `NonNullable<T[K]>` in `Members` was
 * **redundant by construction**, and the census could not tell a correct implementation from one
 * missing half its stated mechanism. **The token is DELETED** and A-80 Part 2's *"four things"* is
 * three — see `Members` below for the proof and for what of A-80's mechanism survives.
 *
 * **What A-81 changes, and nothing else.** The leaf test moves **inside** the distribution and the
 * outer `IsDoor` is deleted rather than kept as well (`Carries`); `CallSide` and `CtorSide` become
 * separate aliases that answer `false` instead of falling through, so `CarriesOne` asks all three
 * arms **disjunctively**; `Members` walks bare `T[K]`; both censuses share **one tagged walk**
 * rather than a second copy, and `ILLEGAL_SHAPE_CENSUS` moves to the template-literal form so it
 * names the export; five rows pin the three defects, 35 → 40. **`IsDoor`, `IsIllegal`,
 * `TripishReturn`, `ProducesTrip`, `Down`, the 12-hop bound, the depth accounting and the existing
 * 35 rows are all UNCHANGED.** No `src` file moves and no shipped behaviour changes — round 59
 * re-scanned all 54 files and there is **no union of function types anywhere in
 * `packages/core/src`**, so every one of these findings was latent.
 *
 * **A-81 Part 8 CLOSES this class, and the closure claims no completeness.** Seven rounds have run
 * on this mechanism and rounds 55–59 found **zero** unguarded doors in shipped code — only
 * increasingly narrow corners of TypeScript's type system, each real, each latent, each costing a
 * full cycle. So: **no further round is dispatched on `Carries`, `CarriesOne`, `Members`,
 * `DESCENT_CENSUS`, `HIDDEN_DOOR_CENSUS` or `ILLEGAL_SHAPE_CENSUS` on the strength of a type-system
 * corner case alone.** A finding here is evaluated first for **liveness**: does it name an export
 * that exists in `packages/core/src` **today**? If yes it is a defect and is fixed immediately; if
 * it needs a shape injected into the tree to demonstrate, it is recorded as residue. **An eighth
 * corner almost certainly exists** — six rounds found one every time they looked — and saying so is
 * the honest form of closure, because the failure this arc kept repeating was a closure claim that
 * asserted completeness and was falsified within a round. **One trigger reopens it and only one: a
 * `Trip` that reaches storage through a path `commit` did not mediate — an unopenable document in
 * the wild.** That has never once been observed.
 *
 * ---
 *
 * §2.1 **A-80** — *the predicate descends every type constructor, and the closure claim is about
 * coverage rather than a list of exceptions.* ROADMAP **I-19**, from QA **R58-1** (MAJOR) with
 * **R58-2/R58-5** riding along and **R58-3/R58-4** as one line each. **Read this before A-79
 * below**, which it amends in four places and whose closure claim it withdraws. **Its Part 2 code
 * block and its Part 10 parameter sentence are superseded by A-81 above** — read A-81 first.
 *
 * **What A-80 replaced: the predicate's REACH, not its shape.** A-79's structural walk is right and
 * it works. What A-79 did not notice is that it had turned *an enumeration of declaration forms*
 * into ***an enumeration of descents***: `Carries` descended through exactly **two** type
 * constructors — a bare object type's own keys, and a call signature's return type — while
 * `packages/core/src` holds **106 optional properties** and **six discriminated unions of object
 * types**, and spells an absent object `X | null` throughout. Round 58 exhibited **nine**
 * `Trip`-producing callables reachable from a censused export that the walk could not see, none of
 * them a cast, an `any`, an overload set or a deep nesting; three of them, appended to
 * `derive/lifecycle.ts`, left `npm run typecheck` at exit 0 while writing documents `fromJSON`
 * refuses (**R58-1**). The proof it is shipped-code reach and not a curiosity is A-79's own ship
 * gate: N9 written `autofix?(t, c): Trip` reddens the census, and **the same feature one field-shape
 * sideways — `autofix?: { fix(t, c): Trip }` — left it at exit 0.**
 *
 * **Three type-system mechanisms, one fix** (A-80 Part 1): `-?` strips the optional MODIFIER from a
 * mapped type's RESULT and not `| undefined` from the source `T[K]`; `keyof` a union is the
 * INTERSECTION of its members' keys, so a discriminated union has no walkable key and a union with a
 * non-object member matches no arm at all; and `Set`/`Iterable` are **not** a third cause but the
 * second reached through `IteratorResult`'s union. Two lines answer all three — `Members` walks
 * `NonNullable<T[K]>`, and `Carries` **distributes** over a union and collapses the verdicts with
 * `true extends` instead of bracket-guarding it — plus one architect's arm, `abstract new` in
 * `CarriesOne`, which closes **R58-2** by failing a `Trip`-producing construct signature as a
 * **carrier that must be split** rather than promoting it into `DOORS`.
 * **[A-81 Part 1, R59-4: `NonNullable<T[K]>` is one line, not two, and it is DELETED — redundant by
 * construction once `Carries` distributes and asks the leaf test per member. The distribution and
 * the `abstract new` arm both stand; where each is ASKED is what A-81 Part 2 changes.]**
 *
 * **The closure claim is WITHDRAWN, not extended to four** (A-80 Part 10). A numbered list of
 * exceptions has now been wrong within one round four times; enumerating them is this arc's own
 * defect in its last disguise. What replaces it is a claim about **coverage of a closed set** —
 * *`Carries` descends through every place a TypeScript type holds another type on its output side*
 * — and it is **checked by `DESCENT_CENSUS` below, in the compiler, not asserted in a paragraph.**
 * **A seventh finding must exhibit an output-side place with no row, or a row whose fixture passes
 * while a structurally equivalent shipped shape is missed** — which is R58-1's own move, and is why
 * N11 exists.
 *
 * **The injected faults this file's mechanism must survive** (A-80 Part 9, beside A-79's N8/N10,
 * A-78's N1–N7 and A-77's N1–N5, all carried unchanged). They are written here so the next builder
 * meets them where the mechanism is:
 *
 *   - **N9 (corrected):** `autofix?(t: Trip, c: Conflict): Trip` on the `Rule` type → the hidden-door
 *     census fails naming **eleven** exports — the ten rules **and `RULES`**, the array that holds
 *     them. `RULES` is **correct and needs no exemption**: a container of carriers is a carrier
 *     (A-80 Part 6, correcting A-79 Part 10's prediction of ten). Requires `noErrorTruncation`, or
 *     the message truncates at two.
 *   - **N11:** the same feature one field-shape sideways — `autofix?: { fix(t: Trip, c: Conflict):
 *     Trip }` → the census fails naming the same eleven. **This is the criterion that would have
 *     caught R58-1**, and N9 alone is not sufficient: at `77ef3ba` N9 was red and N11 was green.
 *   - **N12:** `export const hook: { archive: Door } | undefined` and
 *     `export type H = {kind:'a'; run: Door} | {kind:'n'; why: string}` → both redden, each naming
 *     the export. The union family, at the TOP level of an export rather than nested in a property.
 *   - **N13:** delete one `Descent<…>` row's positive fixture, or break one arm of `CarriesOne` →
 *     `DESCENT_CENSUS` fails naming that constructor's label — **it fails `npm run typecheck`;
 *     `npm test` cannot see it** (**R59-7**). After type stripping the assertion at the bottom of
 *     this file compares the literal `true` to the literal `true` whatever the type says, so a
 *     builder who discharges N13 with `npm test` sees 1637 green and has **measured nothing**. That
 *     design is deliberate — it matches `DOOR_CENSUS` and it is what keeps the suite pinned — and
 *     the clause is here rather than only beside the assertion 1,000 lines below because this is
 *     where the next builder reads the criterion. **A census that only ever passes measures
 *     nothing.** **At least three rows, at least one of them one of A-81 Part 4's five new rows.**
 *   - **N14 (A-81 Part 7, R59-1):** the same feature a **THIRD** field-shape sideways —
 *     `autofix?: Door | Inert` on the `Rule` type, with the door as a plain **union member** →
 *     `HIDDEN_DOOR_CENSUS` fails naming the same **eleven**. **N9, N11 and N14 are all required and
 *     none is sufficient alone**: that is three spellings of one feature, and it is the whole lesson
 *     of rounds 58 and 59. At `386c459` N9 and N11 were red and N14 was green.
 *   - **N15 (A-81 Part 7, R59-3):** `autofix?: (t: Trip, c: Conflict) => Trip | Day` on the `Rule`
 *     type → **`ILLEGAL_SHAPE_CENSUS`** fails **naming the eleven** — not `HIDDEN_DOOR_CENSUS`, and
 *     **not namelessly**. It is also the test of A-81 Part 3's template-literal form.
 *   - **The construct-signature pair (R58-2):** `export const c: new (t: Trip, r) => Trip` → RED
 *     naming `c`, at `HIDDEN_DOOR_CENSUS` and **not** at `DOOR_CENSUS`.
 *   - **The R59-2 pair:** `export const c: { (): string; new (): { archive: Door } }` → RED naming
 *     `c`, and `{ (): string; new (t: Trip, r: ConflictResolution): Trip }` → RED naming `c`. Both
 *     were GREEN at `386c459`, because `CarriesOne`'s arms were an ordered chain.
 *   - **The R59-3 pair:** a `Trip | Day` method **one hop down** on an exported object literal, and
 *     the same signature as a `Rule.autofix?` → **both RED at `ILLEGAL_SHAPE_CENSUS`, naming the
 *     export.** Both were GREEN at `386c459`, because that census had no walk at all.
 *
 * ---
 *
 * §2.1 **A-79** — *a door is a module-level function, and the census refuses any export that can
 * hide one.* ROADMAP **I-18**, from QA **R57-1/R57-2** (MAJOR) with **R57-3/4/5/6** riding along.
 * **Amended by A-80 above in four places: its predicate (Part 3), its `Map` evidence (Part 5), its
 * async claim (Part 9) and its closure claim (Part 11, withdrawn).**
 * It sits on top of §2.1 **A-78** — *the census reads the tree, not a list of files* — whose
 * **subject** round 57 attacked with everything it had (a new file, a new directory, a door in the
 * generated `countries.gen.ts`, re-exports from inside and outside the tree, a barrel alias, a
 * shadowing second `addStop`) and could not break. A-78's scope argument is upheld entire.
 *
 * **What A-79 replaced: the PREDICATE, not the subject.** `IsDoor<F>` begins
 * `F extends (...a: never[]) => infer R`, which matches only a module member that is **itself a
 * directly-callable function value**. So a `Trip`-producing **class method, static method,
 * object-literal method, arrow behind a `Record`, getter, or closure returned by a higher-order
 * function** was invisible *inside a censused file, in a censused directory, on the whitest part of
 * the tree*. `class TripArchiver { archive(t: Trip, r: ConflictResolution): Trip }` appended to
 * `derive/lifecycle.ts` left `npm run typecheck` at exit 0 and this file at 105 pass / 0 fail while
 * writing a document `fromJSON` refuses at `$.resolutions[0].state` (**R57-1**). And
 * `export const overlap: Rule = { … }` is that object-literal shape in **ten shipped files**.
 *
 * **A second arm on `IsDoor` is refused** (A-79 Part 1): that enumerates the ways a function can be
 * *carried*, and the next carrier — a `Map<string, door>`, a class returned from a factory, a
 * function with a door hung off it as a property — is not on the list. Four rounds of this class
 * have each ended with a longer list being wrong within a round. What ships instead is **one
 * recursive structural question**, asked of the export's type:
 *
 * > **Is a `Trip`-producing callable reachable from this export at all — through any place a
 * > TypeScript type holds another type on its output side, at any depth?**
 *
 * *(A-79 wrote that question as "through a property, or through a call signature's return type",
 * and those were the only two constructors it descended. **A-80 widened it to the closed set**, and
 * `DESCENT_CENSUS` below is what holds the coverage.)*
 *
 * At the type level a class method, a static method, an object-literal method, an arrow property
 * and a getter are *the same thing*: a property whose type has a call signature. `Carries` was
 * never told about a `Map`, a factory-returned class, a function with a property, `Promise<Trip>`
 * behind a method, or a door nested three objects deep, and it catches all of them. **One of A-79
 * Part 5's showcase rows was wrong about WHY, and A-80 Part 7 corrects it:** `Map<string, door>` was
 * caught **incidentally**, through `get(key): V | undefined`, while `Map<string, {run: door}>` — the
 * closer analogue of the `Record<RuleId, Rule>` the same table called *"the deepest carrier this
 * codebase could plausibly hold"* — was **missed**. Under A-80 both are caught, and caught for the
 * reason the row claimed. ***A carrier caught by accident is evidence of nothing***, and a showcase
 * row must name the descent by which its case is caught or it is a story — which is why every
 * `DESCENTS` row below carries a **doorless twin** rather than a claim.
 *
 * **The census is name-keyed by necessity**, which is why A-79 *refuses the carrier* rather than
 * guarding it: a door needs a `DOORS` entry, a behavioural row, a frozen-input row, a place in the
 * uniqueness walk, and a name to print in the refusal a user reads. A method or a closure has no
 * module-level name and can receive none of those. Hence the **normal form** quoted beside
 * `HIDDEN_DOOR_CENSUS` below.
 *
 * **There is one `CENSUS` array** — every `.ts` file under `packages/core/src`, with **no
 * exclusions** — read by five halves that fail at different times:
 *
 *   1. **The type-level door census** maps `DoorsOf` over `CENSUS`. Its expected set is, exactly
 *      as the code below writes it and **not** as A-78 Part 1 half 1 wrote it,
 *      `DOORS ∪ CENSUS_MECHANISM ∪ (NON_DOORS[].name & AllDoors)` — the intersection, because
 *      `mergeTrips` and `importLegacyDays` return `{trip, …}` wrappers that `IsDoor` never
 *      classified, so the ruling's `DOORS ∪ CENSUS_MECHANISM ∪ NON_DOORS[].name` is **uncompilable
 *      on a healthy tree** (KD-106 measured it). It fails `npm run typecheck`, not a test.
 *   2. **The hidden-door census** (A-79 Part 3) maps `Hides` over the same array: an export that is
 *      **not itself a door** and from which a door is **reachable** fails `npm run typecheck`, in a
 *      template-literal form that **names the offending exports**.
 *   3. **The module census** is a **recursive** `readdirSync` walk of `packages/core/src`, and it
 *      sees the one thing a type-level assertion cannot: a **new file**, in any directory,
 *      including one nobody has created yet.
 *   4. **Name uniqueness and `NON_DOORS`'s stated module are checked at runtime**, by function
 *      *identity* over the same namespace objects — the shadowing hole a name-keyed census cannot
 *      see. Not by qualifying names.
 *   5. **The behavioural census** is unchanged: one hostile value per door, driven by `DOORS`.
 *
 * **`NON_DOORS` holds only excuses the census actually spends** (A-79 Part 7, **R57-2**). Before
 * this increment two of its three entries were inert — they excused nothing, so evicting one was
 * free, and a real door's name could be substituted into the slot with `typecheck` at exit 0 and
 * this file green. `NON_DOORS_ARE_LIVE` makes every entry compiler-checked, so the list can grow
 * and cannot shrink unobserved; the two wrapper producers **leave** and become
 * `WRAPPER_PRODUCERS_ARE_NOT_DOORS`, which is strictly more than their entries said.
 *
 * Plus **Invariant R**'s door half (A-78 Part 7, restated at its true width by A-79 Part 8): a
 * frozen-input test, driven by `DOORS`, that proves no door mutates a record — or a collection
 * array — in place. There is **no `Object.freeze` in `src`** — the ruling refuses that, with its
 * reasons and its trigger.
 *
 * **The residues, as A-80 Part 11 leaves them — and note that A-79's *"there are exactly three ways"*
 * framing is GONE, not lengthened.** None of these is a carrier shape, and none of them is a place a
 * type holds another type on its output side, which is why they are not exceptions to the coverage
 * claim above:
 *
 *   - **An overload set** whose *last* signature does not return `Trip` is not caught, because
 *     `infer R` resolves to the last signature. **A-80 Part 10 reframes this as an INCOMPLETE ROW
 *     inside the claim rather than an exception outside it** — a call signature's return is a
 *     constructor the walk *does* cover, and it covers one signature of N — so it is asserted
 *     `false` in `DESCENT_CENSUS` where the incompleteness is measured, and refused by the normal
 *     form. **Zero exist under `packages/core/src` today. Trigger: the first one.**
 *   - **A parameter position.** **[SENTENCE CORRECTED BY A-81 Part 6, QA R59-6 — the row's `false`
 *     is right and A-80's stated reason was not.]** *"A callable the export accepts is unreachable"*
 *     is not uniformly true: `Awaited` resolves a **custom thenable** through the parameter of its
 *     `then` callback, and `Carries<'door', () => { then(cb: (v: {run: Door}) => void): void }>` is
 *     measured **`true`** — which is **correct**, because awaiting that function really does produce
 *     the door-bearing value. The accurate statement is: **the walk never *descends into* a
 *     parameter position — it has no member to walk to, because `keyof` a bare function type is
 *     `never` — and the one case in which a parameter's type is nonetheless reached is `Awaited`
 *     resolving a thenable's `then` callback, which is the output side arriving by another route and
 *     is caught on purpose.** Not descending is still a **ruling**, not a miss: a door passed in as
 *     an argument belongs to the caller, and flagging it would flag every higher-order function in
 *     the library. The `parameter-position` row keeps its `false` and its fixture — that fixture is
 *     `(cb: Door) => void` and no thenable is involved — and nothing in the census changes.
 *   - **A budget, not a list:** the 12-hop bound is one number in one place. The deepest carrier this
 *     codebase can plausibly hold is 2. **Trigger:** an export nesting a callable more than 12 hops
 *     down; the answer is to raise the number.
 *   - **A cast** — `any`, `unknown`, a lie about a return type. There is nothing to descend into.
 *     **Permanent.**
 *   - **A detached continuation** (A-80 Part 8, correcting A-79 Part 9): the behavioural runner's
 *     `await` reaches a door promise it awaits, and reaches nothing nobody awaits — `catch` requires
 *     something to catch. An `async` door that mutates after an `await` in a continuation the runner
 *     never sees still takes the file down unnamed. That is an inherent limit of the harness, not a
 *     defect in it. **Trigger: the first `async` door under `packages/core/src`; zero exist today**,
 *     at which point the answer is a `process.on('unhandledRejection')` handler here that names the
 *     door currently under test, or a ruled decision that async doors are refused.
 *
 * ---
 *
 * §2.1 **A-78** — *the census reads the tree, not a list of files.* ROADMAP **I-17**, from QA
 * **R56-1/R56-2** (MAJOR) with **R56-3/5/7/10** riding along.
 *
 * **What A-78 replaced.** A-77 deleted the enumeration of *what a door writes* and left an
 * enumeration of *where doors live*: `CENSUSED_BUILD_FILES` (twelve names, checked against a
 * `readdirSync` of `build/`) plus `EXTRA_DOOR_FILES` (one name, checked only for existence).
 * `export function archiveTrip(trip: Trip, r: ConflictResolution): Trip` appended to
 * `derive/lifecycle.ts` — an existing file, ordinary syntax, no new directory — left
 * `npm run typecheck` at exit 0 and this file at 62 pass / 0 fail while writing a document
 * `fromJSON` refuses at `$.resolutions[0].state` (**R56-1**). And the classifier matched an
 * *exact* `Trip` return type, so `Trip | null` and `Promise<Trip>` were not doors (**R56-2**).
 * Both file lists are **deleted**; the classifier's three legal return shapes are `IsDoor` below.
 *
 * ---
 *
 * §2.1 **A-77** — *a door does not say what it wrote; the document says what changed.*
 * ROADMAP **I-16**, from QA **R55-1/2/3/4/5/7**.
 *
 * **What replaced what.** A-76 put one mechanism (`assertStorable`) behind eight per-field guards
 * and then **enumerated where to call it** — 24 checked rows and 26 free-text exemption reasons, in
 * this file. Round 55 measured **thirteen** door × field cases that table still left writing a
 * document which can never be re-opened, and proved **two** of its exemption reasons false against
 * the code; the architect found **three more** at `conflict/resolve.ts`'s `resolveConflict`, a door
 * in a directory the census could not see, writing an eighth record class. **Sixteen.** A-77
 * deletes the enumeration rather than correcting it a third time: a door hands `commit` the
 * document it was given and the document it produced, and `commit` parses every record that is
 * not, by object identity, one the door was handed.
 *
 * `EXEMPT_TABLE` and `EXEMPT_UNTABLED` are **gone** — 26 reasons in prose, two of them false,
 * replaced by a return type. This file is A-77 **Part 6**'s censuses, in the four halves the
 * ruling states, each failing at a different time:
 *
 *   1. **The door census is a type-level assertion and it fails `npm run typecheck`, not a test.**
 *      A door is *an exported function whose return type is `Trip`* — a fact the compiler already
 *      has for every export of a module, in **every declaration syntax there is**. A-76's census
 *      collected `/^export\s+function\s+(\w+)/gm` and round 55 kept it green while injecting a
 *      door three other ways (R55-4). The regex is **not widened**; it is deleted.
 *   2. **The module census is a runtime directory read**, and it closes the one thing a type-level
 *      assertion cannot see: a **new file** in `build/`.
 *   3. **Three `Trip`-returning exports are not doors** and are named rather than reasoned about.
 *   4. **The behavioural census** fires one hostile value per door, driven by `DOORS`. It is what
 *      reddens if a door is listed and its `commit` call is deleted.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { parseTripEnvelope, parseResolution, TripParseError, fromJSON } from '../src/serialize/fromJSON.ts';
import { toJSON } from '../src/serialize/toJSON.ts';
import { assertStorable } from '../src/build/storable.ts';
import { SCHEMA_VERSION } from '../src/model/types.ts';
import type {
  Booking, ConflictResolution, Day, Participant, PhotoAsset, Place, Stop, Trip,
} from '../src/model/types.ts';
import { sequentialIds } from '../src/model/ids.ts';

// §2.1 **A-78** Part 1 — ONE namespace import per `.ts` file under `packages/core/src`, with **no
// exclusions**: `index.ts`, the two type-only `types.ts` modules and the 375 kB generated
// `geo/countries.gen.ts` are all here, because an exclusion is where the last three rounds of this
// class lived. The `CENSUS` array below pairs each with its path, and both halves read that one
// array.
import * as AccessPredicates from '../src/access/predicates.ts';
import * as Bookings from '../src/build/bookings.ts';
import * as Candidates from '../src/build/candidates.ts';
import * as CommitMod from '../src/build/commit.ts';
import * as CopyStopMod from '../src/build/copyStop.ts';
import * as CreateTripMod from '../src/build/createTrip.ts';
import * as DaysMod from '../src/build/days.ts';
import * as ParticipantsMod from '../src/build/participants.ts';
import * as PhotosMod from '../src/build/photos.ts';
import * as PoolMod from '../src/build/pool.ts';
import * as RedactMod from '../src/build/redactText.ts';
import * as StopsMod from '../src/build/stops.ts';
import * as StorableMod from '../src/build/storable.ts';
import * as ConflictDetect from '../src/conflict/detect.ts';
import * as ConflictId from '../src/conflict/id.ts';
import * as ResolveMod from '../src/conflict/resolve.ts';
import * as RuleBookingVsPlan from '../src/conflict/rules/bookingVsPlan.ts';
import * as RuleDuplicateBooking from '../src/conflict/rules/duplicateBooking.ts';
import * as RuleGeoOutlier from '../src/conflict/rules/geoOutlier.ts';
import * as RuleImpossibleTransfer from '../src/conflict/rules/impossibleTransfer.ts';
import * as RuleLegacyFlag from '../src/conflict/rules/legacyFlag.ts';
import * as RuleMissingLodging from '../src/conflict/rules/missingLodging.ts';
import * as RuleOverlap from '../src/conflict/rules/overlap.ts';
import * as RuleSupersededBooking from '../src/conflict/rules/supersededBooking.ts';
import * as RuleTypes from '../src/conflict/rules/types.ts';
import * as RuleUnbookedTicketed from '../src/conflict/rules/unbookedTicketed.ts';
import * as RuleUnverifiedReference from '../src/conflict/rules/unverifiedReference.ts';
import * as DeriveCluster from '../src/derive/cluster.ts';
import * as DeriveCost from '../src/derive/cost.ts';
import * as DeriveCountry from '../src/derive/country.ts';
import * as DeriveDisplay from '../src/derive/display.ts';
import * as DeriveGeo from '../src/derive/geo.ts';
import * as DeriveGeoCheck from '../src/derive/geoCheck.ts';
import * as DeriveLegs from '../src/derive/legs.ts';
import * as DeriveLifecycle from '../src/derive/lifecycle.ts';
import * as DeriveSummary from '../src/derive/summary.ts';
import * as DeriveTravelStats from '../src/derive/travelStats.ts';
import * as GeoCountriesGen from '../src/geo/countries.gen.ts';
import * as GeoCountryIndex from '../src/geo/countryIndex.ts';
import * as ImportLegacyDays from '../src/import/legacyDays.ts';
import * as IndexBarrel from '../src/index.ts';
import * as MergeTripsMod from '../src/merge/mergeTrips.ts';
import * as ModelCityName from '../src/model/cityName.ts';
import * as ModelIds from '../src/model/ids.ts';
import * as ModelMoney from '../src/model/money.ts';
import * as ModelOpeningHours from '../src/model/openingHours.ts';
import * as ModelProvenance from '../src/model/provenance.ts';
import * as ModelTypes from '../src/model/types.ts';
import * as PhotoExif from '../src/photo/exif.ts';
import * as SerializeFromJSON from '../src/serialize/fromJSON.ts';
import * as SerializeMigrate from '../src/serialize/migrate.ts';
import * as SerializeParseError from '../src/serialize/parseError.ts';
import * as SerializeToJSON from '../src/serialize/toJSON.ts';
import * as ValidateTrip from '../src/validate/validateTrip.ts';

import type { BuildCtx } from '../src/build/createTrip.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '..', 'src');

const ctx = (seed = 's'): BuildCtx => ({ ids: sequentialIds(seed), now: '2026-03-01', actorUserId: 'local:self' });

const GOOD_PLACE: Place = { id: 'pl-1', cityKey: 'wien', name: 'Belvedere', at: null, category: 'sight' };
const GOOD_DERIVATIVE = { w: 100, h: 80, bytes: 4096 };
const GOOD_PROVENANCE = {
  source: 'user' as const, state: 'accepted' as const, confidence: 'confirmed' as const,
  addedAt: '2026-03-01', acceptedAt: '2026-03-01', actorUserId: 'local:self',
};
const GOOD_BOOKING: Booking = {
  id: 'bk-1', tripId: 'trip-base', kind: 'train', operator: 'ÖBB', reference: 'ABC123',
  startsAt: { date: '2026-03-01', time: '08:00' }, price: null, party: 2, status: 'active',
  ticket: null, provenance: GOOD_PROVENANCE,
};

const ENVELOPE = {
  id: 'trip-1',
  title: 'Europe',
  ownerId: 'local:self',
  startDate: '2026-08-07',
  endDate: '2026-08-22',
  datePrecision: 'exact',
  homeCurrency: 'EUR',
  homeBase: null,
  party: { adults: 2, children: 0 },
  revision: 3,
  schemaVersion: SCHEMA_VERSION,
};

function baseTrip(seed = 's'): { trip: Trip; c: BuildCtx } {
  const c = ctx(seed);
  const trip = CreateTripMod.createTrip(
    {
      id: 'trip-base', title: 'Storable', startDate: '2026-03-01', endDate: '2026-03-03',
      cities: [{ key: 'wien', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
    },
    c,
  );
  return { trip, c };
}

function tripWithStop(seed = 's'): { trip: Trip; c: BuildCtx; stopId: string } {
  const { trip, c } = baseTrip(seed);
  const next = StopsMod.addStop(
    trip,
    { kind: 'scheduled', dayId: '2026-03-01', time: '10:00', order: 0 },
    { id: 'stop-1', name: 'Belvedere', category: 'sight' },
    c,
  );
  return { trip: next, c, stopId: 'stop-1' };
}

/** Rewrites one field of a record already in the document, behind a cast — §2.1's reachable producer. */
function poisonStop(t: Trip, stopId: string, field: string, value: unknown): Trip {
  return {
    ...t,
    days: t.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => (s.id === stopId ? ({ ...s, [field]: value } as unknown as Stop) : s)),
    })),
  };
}

/** A source document that is another person's — `copyStopInto`'s whole subject (§2.14). */
function foreignTrip(mutate: (t: Trip) => Trip): { trip: Trip; stopId: string } {
  const c = ctx('friend');
  let trip = CreateTripMod.createTrip(
    {
      id: 'trip-friend', title: 'Marta', startDate: '2026-03-01', endDate: '2026-03-03',
      ownerId: 'user:marta',
      cities: [{ key: 'wien-m', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
    },
    c,
  );
  trip = StopsMod.addPlace(trip, { id: 'pl-m', cityKey: 'wien-m', name: 'Belvedere', at: { lat: 48.19, lng: 16.38 }, category: 'sight' });
  trip = StopsMod.addStop(
    trip,
    { kind: 'scheduled', dayId: '2026-03-01', time: '10:00', order: 0 },
    { id: 'stop-m', name: 'Belvedere', category: 'sight', place: { kind: 'place', placeId: 'pl-m' } },
    c,
  );
  return { trip: mutate(trip), stopId: 'stop-m' };
}

/** A trip carrying one live resolution, for the four `conflict/resolve.ts` doors. */
function tripWithResolution(): Trip {
  const { trip } = baseTrip();
  return ResolveMod.resolveConflict(trip, {
    conflictId: 'c-1', state: 'dismissed', by: 'local:self', at: '2026-03-01',
  });
}

// ---------------------------------------------------------------------------------------------
// A-77 Part 4 — `parseTripEnvelope`, `fromJSON`'s trip-level scalars extracted as a unit, and
// A-77 Part 3 rule 8 — `parseResolution`, the eighth exported per-record parser.
// ---------------------------------------------------------------------------------------------

test('A-77 Part 4: parseTripEnvelope returns the trip scalars and nothing else', () => {
  const env = parseTripEnvelope({ ...ENVELOPE, cities: 'not an array', days: 42 }, '$');
  assert.deepEqual(env, {
    id: 'trip-1', title: 'Europe', ownerId: 'local:self',
    startDate: '2026-08-07', endDate: '2026-08-22', datePrecision: 'exact',
    homeCurrency: 'EUR', homeBase: null, party: { adults: 2, children: 0 },
    revision: 3, schemaVersion: SCHEMA_VERSION,
  });
});

test('A-77 Part 4: fromJSON\'s three tolerances move verbatim', () => {
  const { ownerId: _o, ...noOwner } = ENVELOPE;
  assert.equal(parseTripEnvelope(noOwner, '$').ownerId, '');
  const { datePrecision: _d, ...noPrecision } = ENVELOPE;
  assert.equal(parseTripEnvelope(noPrecision, '$').datePrecision, 'exact');
  const { homeBase: _h, ...noHomeBase } = ENVELOPE;
  assert.equal(parseTripEnvelope(noHomeBase, '$').homeBase, null);
});

test('A-77 Part 4: `meta` is carried when present and absent when absent', () => {
  assert.equal('meta' in parseTripEnvelope(ENVELOPE, '$'), false);
  assert.deepEqual(parseTripEnvelope({ ...ENVELOPE, meta: { k: 1 } }, '$').meta, { k: 1 });
});

test('A-77 Part 4: R55-3\'s scalars are refused with their own path', () => {
  const cases: ReadonlyArray<[string, unknown, string]> = [
    ['title', 42, '$.title'],
    ['homeCurrency', 42, '$.homeCurrency'],
    ['ownerId', 42, '$.ownerId'],
    ['party', { adults: 'two', children: 0 }, '$.party.adults'],
    ['meta', 'not an object', '$.meta'],
    ['homeBase', { name: 'Home', at: { lat: 'north', lng: 0 } }, '$.homeBase.at.lat'],
    ['datePrecision', 'fortnight', '$.datePrecision'],
    ['startDate', '2026-13-45', '$.startDate'],
  ];
  for (const [field, value, path] of cases) {
    let thrown: unknown = null;
    try {
      parseTripEnvelope({ ...ENVELOPE, [field]: value }, '$');
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown instanceof TripParseError, `${field} was accepted`);
    assert.equal((thrown as TripParseError).path, path, `${field} threw at the wrong path`);
  }
});

test('A-77 Part 4: the one check fromJSON does not have — schemaVersion must be current', () => {
  assert.throws(
    () => parseTripEnvelope({ ...ENVELOPE, schemaVersion: SCHEMA_VERSION - 1 }, '$'),
    (err: unknown) => err instanceof TripParseError && err.path === '$.schemaVersion',
  );
});

test('A-77 Part 3.8: parseResolution is exported and refuses the three fields R55 measured', () => {
  const good = { conflictId: 'c1', state: 'dismissed', by: 'local:self', at: '2026-08-07' };
  assert.deepEqual(parseResolution(good, '$'), { ...good, retiredAt: null });
  for (const [field, value, path] of [
    ['state', 'bogus', '$.state'],
    ['by', 42, '$.by'],
    ['note', {}, '$.note'],
  ] as ReadonlyArray<[string, unknown, string]>) {
    assert.throws(
      () => parseResolution({ ...good, [field]: value }, '$'),
      (err: unknown) => err instanceof TripParseError && err.path === path,
      `${field} was accepted`,
    );
  }
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 3 rules 5 and 7 — `assertStorable` RETURNS the parsed record, and carries a locator.
// `commit` is its only caller; this is the unit that caller depends on.
// ---------------------------------------------------------------------------------------------

test('A-77 Part 3.5: assertStorable returns the parser\'s value, not the caller\'s object', () => {
  const caller = { ...GOOD_PLACE, smuggled: 'not a declared key' } as unknown as Place;
  const stored = assertStorable('doorName', 'place', caller, 'places[0]');
  assert.notEqual(stored, caller, 'assertStorable handed the caller\'s own object back');
  assert.equal('smuggled' in stored, false, 'an undeclared key survived the parser (A-77 residue 4)');
  assert.deepEqual(stored, GOOD_PLACE);
});

test('A-77 Part 3.5: a getter that flips on the second read is read once, and the read value is stored', () => {
  let reads = 0;
  const flipper = {
    ...GOOD_PLACE,
    get name(): string {
      reads += 1;
      return reads === 1 ? 'Belvedere' : (42 as unknown as string);
    },
  } as unknown as Place;
  const stored = assertStorable('doorName', 'place', flipper, 'places[0]');
  assert.equal(stored.name, 'Belvedere');
  assert.equal(typeof stored.name, 'string');
});

test('A-77 Part 3.7: the message keeps A-76\'s sentence and appends the locator', () => {
  let thrown: unknown = null;
  try {
    assertStorable('doorName', 'place', { ...GOOD_PLACE, category: 'transport' as unknown as Place['category'] }, 'places[3]');
  } catch (err) {
    thrown = err;
  }
  assert.ok(thrown instanceof Error);
  assert.ok(!(thrown instanceof TripParseError), 'A-76 Part 3\'s one hard prohibition');
  const msg = (thrown as Error).message;
  assert.match(msg, /^doorName: this place cannot be stored — /);
  assert.ok(msg.includes('$.category'), msg);
  assert.ok(msg.includes('cannot be re-opened'), msg);
  assert.ok(msg.endsWith('(places[3])'), msg);
});

test('A-77 Part 3.8: StorableMap has a `resolution` arm', () => {
  const good = { conflictId: 'c1', state: 'dismissed' as const, by: 'local:self', at: '2026-08-07', retiredAt: null };
  assert.deepEqual(assertStorable('doorName', 'resolution', good, 'resolutions[0]'), good);
  assert.throws(
    () => assertStorable('doorName', 'resolution', { ...good, state: 'bogus' as never }, 'resolutions[0]'),
    /doorName: this resolution cannot be stored — .*\$\.state.*\(resolutions\[0\]\)/s,
  );
});

// ---------------------------------------------------------------------------------------------
// A-78 Part 1 — the CENSUS. One array, every `.ts` file under `packages/core/src`, no exclusions.
// ---------------------------------------------------------------------------------------------

/**
 * EVERY module under `packages/core/src`, by path relative to it, paired with its namespace.
 * **ONE list, read by all three census halves**: the type census maps over it, the module census
 * compares its paths against a *recursive* read of the directory, and the name-uniqueness check
 * walks its namespace objects. **THERE ARE NO EXCLUDED FILES** — an exclusion is where the last
 * three rounds of this class lived, and A-78 Part 1 says so in as many words.
 *
 * `index.ts` is censused like everything else. It re-exports the doors, so the same names arrive
 * twice — harmless, because both halves work on *names* and the barrel's names are the same
 * names; the identity check below is what makes that safe rather than merely convenient.
 */
const CENSUS = [
  ['access/predicates.ts', AccessPredicates],
  ['build/bookings.ts', Bookings],
  ['build/candidates.ts', Candidates],
  ['build/commit.ts', CommitMod],
  ['build/copyStop.ts', CopyStopMod],
  ['build/createTrip.ts', CreateTripMod],
  ['build/days.ts', DaysMod],
  ['build/participants.ts', ParticipantsMod],
  ['build/photos.ts', PhotosMod],
  ['build/pool.ts', PoolMod],
  ['build/redactText.ts', RedactMod],
  ['build/stops.ts', StopsMod],
  ['build/storable.ts', StorableMod],
  ['conflict/detect.ts', ConflictDetect],
  ['conflict/id.ts', ConflictId],
  ['conflict/resolve.ts', ResolveMod],
  ['conflict/rules/bookingVsPlan.ts', RuleBookingVsPlan],
  ['conflict/rules/duplicateBooking.ts', RuleDuplicateBooking],
  ['conflict/rules/geoOutlier.ts', RuleGeoOutlier],
  ['conflict/rules/impossibleTransfer.ts', RuleImpossibleTransfer],
  ['conflict/rules/legacyFlag.ts', RuleLegacyFlag],
  ['conflict/rules/missingLodging.ts', RuleMissingLodging],
  ['conflict/rules/overlap.ts', RuleOverlap],
  ['conflict/rules/supersededBooking.ts', RuleSupersededBooking],
  ['conflict/rules/types.ts', RuleTypes],
  ['conflict/rules/unbookedTicketed.ts', RuleUnbookedTicketed],
  ['conflict/rules/unverifiedReference.ts', RuleUnverifiedReference],
  ['derive/cluster.ts', DeriveCluster],
  ['derive/cost.ts', DeriveCost],
  ['derive/country.ts', DeriveCountry],
  ['derive/display.ts', DeriveDisplay],
  ['derive/geo.ts', DeriveGeo],
  ['derive/geoCheck.ts', DeriveGeoCheck],
  ['derive/legs.ts', DeriveLegs],
  ['derive/lifecycle.ts', DeriveLifecycle],
  ['derive/summary.ts', DeriveSummary],
  ['derive/travelStats.ts', DeriveTravelStats],
  ['geo/countries.gen.ts', GeoCountriesGen],
  ['geo/countryIndex.ts', GeoCountryIndex],
  ['import/legacyDays.ts', ImportLegacyDays],
  ['index.ts', IndexBarrel],
  ['merge/mergeTrips.ts', MergeTripsMod],
  ['model/cityName.ts', ModelCityName],
  ['model/ids.ts', ModelIds],
  ['model/money.ts', ModelMoney],
  ['model/openingHours.ts', ModelOpeningHours],
  ['model/provenance.ts', ModelProvenance],
  ['model/types.ts', ModelTypes],
  ['photo/exif.ts', PhotoExif],
  ['serialize/fromJSON.ts', SerializeFromJSON],
  ['serialize/migrate.ts', SerializeMigrate],
  ['serialize/parseError.ts', SerializeParseError],
  ['serialize/toJSON.ts', SerializeToJSON],
  ['validate/validateTrip.ts', ValidateTrip],
] as const;

// ---------------------------------------------------------------------------------------------
// A-78 Part 1 half 1 / Part 2 — the DOOR CENSUS, at the type level, MAPPED over `CENSUS`.
// It fails `npm run typecheck`, not a test.
// ---------------------------------------------------------------------------------------------

/**
 * Every exported function in a censused module whose return type is `Trip`. This is the whole
 * classifier: **there is no reason column**, because a return type is not a judgement about
 * whether a function *"reads a caller value into a record field"* — the judgement that was wrong
 * twice (R55-2).
 */
const DOORS = [
  // build/bookings.ts
  'upsertBooking', 'supersedeBooking', 'linkBooking',
  // build/candidates.ts
  'acceptCandidate', 'rejectCandidate',
  // build/copyStop.ts
  'copyStopInto',
  // build/createTrip.ts
  'createTrip', 'setTripMeta',
  // build/days.ts
  'ensureDays', 'setDayMeta',
  // build/participants.ts
  'addParticipant', 'updateParticipant', 'removeParticipant',
  // build/photos.ts
  'addPhoto', 'updatePhoto', 'removePhoto', 'reattachDanglingPhotos',
  // build/pool.ts
  'returnToPool', 'scheduleFromPool',
  // build/stops.ts
  'addStop', 'updateStop', 'removeStop', 'moveStop', 'reorderStop', 'addPlace',
  // conflict/resolve.ts
  'resolveConflict', 'syncResolutions', 'reassertRetirements', 'unresolveConflict',
] as const;

/**
 * The one `Trip`-returning export inside the censused set that is not a door: **the mechanism
 * itself**. `commit` cannot commit through itself, and it is module-internal exactly as
 * `assertStorable` and `reindex` are.
 */
const CENSUS_MECHANISM = ['commit'] as const;

/**
 * **A-79 Part 7 (QA R57-2) — the `Trip`-returning exports inside the censused set that are NOT
 * doors. It is ONE entry, and every entry is LIVE.**
 *
 * A-78 shipped three names and named this list *"the one remaining place a human judgement can
 * hide a door"*, with a residue whose trigger was **the fourth name**. **That trigger could never
 * fire**, and KD-106 is why. The shipped equation subtracts `NON_DOORS[].name & AllDoors`, and
 * `importLegacyDays` and `mergeTrips` return `{trip, …}` wrappers `IsDoor` never classified — so
 * two of the three entries **excused nothing**. An entry that excuses nothing is a **free slot**:
 * evict it, put a real door's name in its place, delete the two behavioural rows `DOORS` was
 * driving, and the list is still three names with `typecheck` at exit 0 and this file green.
 * Delete that door's `commit` call and it writes an unopenable document with **no census half
 * firing**. Round 57's breaker drove all three steps.
 *
 * **The defect was not the count. It was that the list contained entries the compiler could not
 * see**, so removing one cost nothing. Four clauses answer it:
 *
 *   1. **Liveness is compiler-checked** — `NON_DOORS_ARE_LIVE` below requires every name here to be
 *      one `IsDoor` actually classifies as a door, and names the inert entry if one is not.
 *   2. **Eviction therefore reddens `DOOR_CENSUS`**, which is what kills substitution: removing a
 *      live entry drops a name from the expected set that `AllDoors` still contains. The list can
 *      grow; it cannot shrink unobserved.
 *   3. **The count is re-pinned to the live count**, and the trigger is now **the SECOND name**.
 *   4. **Each entry carries its own individually-checkable fact**, not just prose: `module`, which
 *      half 3's identity walk resolves. An entry cannot be re-pointed at a different function
 *      without a second field being wrong.
 *
 * The rule for what may go here is unchanged and narrow: **a whole-document producer — a function
 * that constructs a document rather than editing one, so there is no `before` to diff against.**
 * A **second** name is an architect's ruling, and the question it must answer is whether producers
 * should get the whole-document check A-77 Part 10 residue 3 defers — not whether this particular
 * function may be excused.
 */
const NON_DOORS = [
  {
    name: 'fromJSON',
    module: 'serialize/fromJSON.ts',
    why: 'it IS the parse — there is no `before` to diff against, and the document it returns is by '
      + 'construction one `fromJSON` accepts',
  },
] as const satisfies ReadonlyArray<{ name: string; module: string; why: string }>;

type IsExact<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

/**
 * **A-78 Part 2 — the classifier, three legal return shapes.**
 *
 * The return type a door may have, normalised: one `Promise` unwrapped, `null`/`undefined`
 * removed. `Exclude<Awaited<R>, null | undefined>` and **not**
 * `Awaited<Exclude<R, null | undefined>>` — **the order is load-bearing**, and the wrong one
 * silently drops `Promise<Trip | null>`.
 */
type TripishReturn<F> = F extends (...a: never[]) => infer R ? Exclude<Awaited<R>, null | undefined> : never;

/** A DOOR: its return type is `Trip`, `Trip | null`, `Promise<Trip>` or `Promise<Trip | null>`. */
type IsDoor<F> = IsExact<TripishReturn<F>, Trip>;

/** A REFUSED SHAPE: the return type carries `Trip` as a union member but is not a door. */
type HasTripMember<R> = true extends (R extends unknown ? IsExact<R, Trip> : never) ? true : false;
type IsIllegal<F> = IsDoor<F> extends true ? false : HasTripMember<TripishReturn<F>>;

type DoorsOf<M> = { [K in keyof M]-?: IsDoor<M[K]> extends true ? K : never }[keyof M];

/**
 * **A-81 Part 3 (QA R59-3) — the illegal-shape census gets REACH, and it gets it by sharing the
 * one walk rather than copying it.**
 *
 * This mapped `IsIllegal<M[K]>` and asked the question **only of module members**, so
 * `export function r59mixed(t: Trip): Trip | {id: string}` was red while the same signature as a
 * method on an exported object literal, or as `Rule.autofix?: () => Trip | Day`, was green. That is
 * exactly the defect A-79/I-18 fixed for the door census and never fixed here.
 *
 * **A second copy of the walk with `IsIllegal` at the bottom is refused by name** (A-81 Part 3):
 * this arc's entire history is a second, narrower copy of a guarantee drifting from the first, and a
 * duplicated 20-line recursive predicate is that failure with a fresh face and a `tsc` bill. The
 * walk takes a **tag** instead and `Leaf` selects the question — one mechanism, two questions, one
 * place to repair. **The top-level catch is preserved, not replaced**: `Carries<'illegal', T>` asks
 * `IsIllegal` of `T` itself first, because `T` is a union member of one.
 */
type IllegalOf<M> = { [K in keyof M]-?: Carries<'illegal', M[K]> extends true ? K : never }[keyof M];

/** A **union** over `CENSUS`, not an intersection of namespaces: an intersection makes a name
 * exported by two modules into an intersection of two function types, which is a classification
 * hazard for no benefit. */
type NamesIn<E> = E extends readonly [string, infer M] ? DoorsOf<M> & string : never;
type IllegalIn<E> = E extends readonly [string, infer M] ? IllegalOf<M> & string : never;

type AllDoors = NamesIn<(typeof CENSUS)[number]>;
type AllIllegal = IllegalIn<(typeof CENSUS)[number]>;

/**
 * **This line is the census.** A new `Trip`-returning export **anywhere under
 * `packages/core/src`** — written `export function`, `export const … = () =>`,
 * `function d(){}; export { d }` or `export default function`, returning `Trip`, `Trip | null`,
 * `Promise<Trip>` or `Promise<Trip | null>` — makes `IsExact` `false` and `npm run typecheck`
 * fails on the commit that adds it. `archiveTrip` in `derive/lifecycle.ts` (R56-1's exact repro)
 * is caught here, because that module is in `CENSUS` and its namespace is mapped.
 */
const DOOR_CENSUS: IsExact<
  AllDoors,
  (typeof DOORS)[number] | (typeof CENSUS_MECHANISM)[number] | ExcusedProducers
> = true;

/**
 * **A-78 Part 1 half 1, corrected against the code — BUILD-NOTES KD-106.**
 *
 * The ruling writes the expected set as `DOORS ∪ CENSUS_MECHANISM ∪ NON_DOORS[].name` on the
 * stated ground that *"`fromJSON`, `importLegacyDays` and `mergeTrips` return `Trip` and their
 * modules are now censused, so they must appear on the right-hand side or the census fails"*.
 * **That is true of `fromJSON` and false of the other two, measured:**
 * `mergeTrips(base, local, remote): MergeResult` where `MergeResult = {trip, report}`
 * (`merge/mergeTrips.ts:42,207`) and `importLegacyDays(legacy, opts): ImportResult` where
 * `ImportResult = {trip, issues, cityRangeCheck, unmatchedNames}` (`import/legacyDays.ts:74,147`).
 * Both are **wrapper returns**, so `IsDoor` classifies neither as a door and neither needs
 * excusing; written literally, the ruling's equation makes `AllDoors` a strict subset of the
 * expected set and `npm run typecheck` fails on a healthy tree.
 *
 * The excuse is therefore taken **as far as it is owed and no further**: a `NON_DOORS` name is
 * subtracted from the census only where the classifier actually put it there. Nothing is weakened
 * — the intersection is computed by the compiler, not judged — and the two properties the ruling
 * wanted from this line are both kept: a producer that *is* `Trip`-returning (`fromJSON`) is on
 * the expected side or the census fails, and a name in `NON_DOORS` that is exported by no censused
 * module is caught by half 3's identity check below.
 *
 * These two are also the only wrapper returns in `packages/core/src`, and A-78 Part 2's
 * prohibition does not reach them: it binds *"a function … that produces an **edited** `Trip`"*,
 * and a producer constructs a document rather than editing one (A-77 Part 6.3, Part 10 residue 3).
 *
 * **A-79 Part 7 (R57-2) closed the hole that correction left open.** Subtracting the intersection
 * is right, but it made the two wrapper producers **inert entries the compiler could not see**, so
 * evicting one was free and a real door could be substituted into the slot. They have now **left
 * `NON_DOORS`** — see `WRAPPER_PRODUCERS_ARE_NOT_DOORS`, which asserts the property they were being
 * trusted for instead of excusing them for it — and `NON_DOORS_ARE_LIVE` forbids a future inert
 * entry. The intersection stays, because it is the shape the compiler can compute; what changed is
 * that it can no longer be empty for any entry.
 */
type ExcusedProducers = (typeof NON_DOORS)[number]['name'] & AllDoors;

/**
 * **A-78 Part 2's second census line.** A function returning `Trip | Day` is neither a door nor a
 * non-door; it is a **return shape core does not permit**, and it fails the build saying so rather
 * than being classified.
 *
 * The one shape this cannot detect is a `Trip` reached through a **wrapper** — `{trip, issues}`, a
 * tuple, a class instance — which would need an arbitrary-depth search that flags half the library.
 * A-78 Part 2 forbids it **by rule** instead, and the rule is quoted here so it is read where the
 * mechanism is:
 *
 * > **A function in `packages/core/src` that produces an edited `Trip` returns it directly.** The
 * > legal return types are `Trip`, `Trip | null`, and a `Promise` of either. A door may not return
 * > a `Trip` inside a record, a tuple, a generator or any other container. A function that
 * > genuinely needs to return a trip *and* something else is **two functions**: a door, and a
 * > reader over the document it returned.
 *
 * **Trigger:** the first increment that wants a wrapper return — most plausibly a Phase 3 ingest
 * worker returning a trip plus a report. It is an **architect's** ruling and not a builder's
 * convenience: the answer is either *split it* (expected) or a census extension ruled in writing.
 *
 * **A-81 Part 3 (QA R59-3) gave this line REACH and moved it to the TEMPLATE-LITERAL form.** It
 * mapped `IsIllegal` over module members only, so `Trip | Day` was caught at the top level and
 * invisible one hop down; `IllegalOf` now maps `Carries<'illegal', M[K]>`, the same walk
 * `HIDDEN_DOOR_CENSUS` uses. The form had to change with the reach: `IsExact<AllIllegal, never>`
 * fails as `Type 'true' is not assignable to type 'false'` — **namelessly** — which was survivable
 * while only a module member could trip it and is not survivable now that a nested shape can. That
 * is A-79 Part 6's lesson, and `--noErrorTruncation` (A-80 Part 6) is already set so the union
 * prints whole.
 */
const ILLEGAL_SHAPE_CENSUS: [AllIllegal] extends [never] ? true :
  `A-78 Part 2: this export reaches a callable whose return carries Trip as a union member without
   being a door — a return shape core does not permit. Split it; do not widen the census:
   ${AllIllegal}` = true;

// ---------------------------------------------------------------------------------------------
// A-79 Part 3 (QA **R57-1**) — the HIDDEN-DOOR census. The THIRD census line, mapped over the same
// `CENSUS` array, failing `npm run typecheck` rather than a test.
//
// `IsDoor` above matches only a module member that is ITSELF a directly-callable function value.
// A `Trip`-producing class method, static method, object-literal method, `Record` arrow, getter or
// higher-order return is invisible to it — and `export const overlap: Rule = { … }` is the
// object-literal shape TEN shipped files already use.
//
// **A second arm on `IsDoor` is refused** (A-79 Part 1): that enumerates the ways a function can be
// CARRIED, and the next carrier is not on the list. The question below is structural instead —
// *is a `Trip`-producing callable reachable from this export, through a property or through a call
// signature's return type, at ANY depth?* — and it therefore catches carriers it was never told
// about: a `Map<string, door>`, a class returned from a factory, a function with a door hung off it
// as a property, `Promise<Trip>` behind a method, a door nested three objects deep (A-79 Part 5).
// ---------------------------------------------------------------------------------------------

/** Decrement, and the depth bound. 12 hops, measured — A-79 Part 5: a door is found through 6
 * property hops and missed at 7 when the bound is 6; 12 costs nothing measurable over 6, and the
 * deepest carrier this codebase could plausibly hold is 2 (`Record<RuleId, Rule>` → method). */
type Down = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * **A-81 Part 2 — the leaf test, chosen by TAG. There is ONE walk; only its bottom differs.**
 *
 * `'door'` is A-79's hidden-door question (*is this thing itself a `Trip`-producing callable?*);
 * `'illegal'` is A-78 Part 2's refused-return-shape question (*does this callable's return carry
 * `Trip` as a union member without being a door?*). Both are asked at the same places, by the same
 * descent, at the same depths — which is the whole of A-81 Part 3's refusal of a second copy.
 */
type Leaf<Tag extends 'door' | 'illegal', T> = Tag extends 'door' ? IsDoor<T> : IsIllegal<T>;

/**
 * The members of `T`, walked through **bare `T[K]`** (A-81 Part 1, QA **R59-4**).
 *
 * **A-80 wrote `NonNullable<T[K]>` here and called it load-bearing. It is not, and the token is
 * DELETED.** The proof is by construction: for any member type `U = N | null? | undefined?`,
 * `TripishReturn` distributes and the `null`/`undefined` members contribute `never` to the union of
 * returns, so `Leaf<Tag, U> = Leaf<Tag, N>`; and `Carries` distributes, with `CarriesOne<null>` and
 * `CarriesOne<undefined>` both `false` — neither matches a call signature, a construct signature nor
 * `[T] extends [object]`. **The existential over `U` therefore equals the existential over `N` for
 * every input.** Measured from both sides: reverting the token left all 35 A-80 census rows green
 * and N11 still red naming the same eleven, and across 151 oracle shapes the two predicates differ
 * on **zero** rows.
 *
 * **A-80 Part 2 point 1's *mechanism* is not wrong and is kept here**, because it is the reason the
 * pre-A-80 predicate missed optional properties and it is still true: `-?` strips the optional
 * MODIFIER from a mapped type's **result**; it does not strip `| undefined` from the source indexed
 * access `T[K]`. The template below is not `T[K]` but `Carries<Tag, T[K], D>`, so the conditional
 * inside `Carries` is evaluated against `T[K] | undefined` and the removal then applies to a
 * `true`/`false` literal, where it does nothing:
 *
 * ```ts
 * type Wrap<X> = [X] extends [object] ? 'obj' : 'not-obj';
 * type M1<T> = { [K in keyof T]-?: T[K]       }[keyof T];  // {a?: {run: door}} -> {run: door}
 * type M2<T> = { [K in keyof T]-?: Wrap<T[K]> }[keyof T];  // {a?: {run: door}} -> 'not-obj'
 * ```
 *
 * What was false is the claim of **necessity**. `M2`'s `| undefined` still reaches `Carries` — and
 * `Carries` now distributes over it and asks the leaf test of each member, so the wrapper's job is
 * done by the distribution. **Three things are load-bearing in this walk, not four**, and they are
 * listed on `Carries`, `CallSide`/`CtorSide` and this docstring respectively.
 */
type Members<Tag extends 'door' | 'illegal', T, D extends number> =
  true extends { [K in keyof T]-?: Carries<Tag, T[K], D> }[keyof T] ? true : false;

/** The door test applied to a type a callable PRODUCES, rather than to the callable itself. Reuses
 *  A-78 Part 2's `Exclude<Awaited<R>, null | undefined>` order, which A-78 ruled load-bearing. */
type ProducesTrip<R> = IsExact<Exclude<Awaited<R>, null | undefined>, Trip>;

/**
 * Is a leaf of kind `Tag` reachable from `T`? **The leaf test is asked of EVERY MEMBER of a union,
 * INSIDE the distribution — not once, above it** (A-81 Part 0/Part 2, QA **R59-1**).
 *
 * **This is the sentence A-80 got wrong, and getting it wrong is the whole of round 59's first
 * finding.** A-80's docstring said *"asked of every member of a union, and answered `true` if ANY
 * member says so"*. That was true of the **descent** and false of the **test at the bottom of it**:
 * `IsDoor<T>` sat *above* the distribution and was asked once, of the whole type, while the thing
 * that distributed — `CarriesOne` — never asked it at all. So a door that **is** a union member was
 * invisible: `TripishReturn` distributes and answers with the *union of the returns*, and
 * `Carries<Door | ((t: Trip) => void)>` was **`false` with the door in plain sight**. Every census
 * row A-80 wrote put its door one hop *below* the member (`{run: Door} | undefined`), so all three
 * union rows exercised the descent and none of them exercised the test at the bottom.
 *
 * **A-80's outer `IsDoor<T>` is DELETED, not kept as well.** Keeping it is dead weight: the
 * distributed form answers `true` on every input the outer form did, because a non-union `T`
 * distributes to itself. `Leaf<Tag, T>` below is evaluated with `T` bound to **one union member**,
 * which is the only place the question *"is this thing a door"* means what this docstring says.
 *
 * Both of A-79/A-80's original halves survive unchanged, and only both together are the story:
 *
 *   - **The collapse keeps `false` from being lost.** `true extends (…)` reduces the union of
 *     verdicts to exactly `true` or exactly `false` — never `boolean` — so `Hides<T> extends true`
 *     still cannot silently swallow a verdict. A-79's concern is *preserved*, not discarded.
 *   - **The distribution keeps `true` from being lost.** Not distributing meant a union reached
 *     `keyof`, and **`keyof (A | B)` is the INTERSECTION of the members' keys** — measured, `keyof
 *     ({a: door} | {b: string})` is `never` — so a discriminated union of object types had no
 *     walkable key at all; and a union with any non-object member matched neither arm and fell
 *     straight to `false`, which is why `{run: door} | undefined` and `{run: door} | null` were
 *     invisible while this repository spells an absent object `X | null` throughout.
 *
 * The correct quantifier over a union is **existential**: a leaf is reachable from `A | B` if it is
 * reachable from `A` *or* from `B` — and *being* a leaf now counts as reaching one. The brackets
 * stay inside `CarriesOne`/`CallSide`/`CtorSide`, where `T` is already a single member and they cost
 * nothing, and they still guard `never` and the depth base case. **Distribution consumes no depth**
 * — `CarriesOne` decrements before every recursion — so the 12-hop bound keeps exactly the meaning
 * A-79 Part 5 measured for it and round 59 re-measured (12 red / 13 green).
 */
type Carries<Tag extends 'door' | 'illegal', T, D extends number = 12> =
  [D] extends [never] ? false :
    true extends (T extends unknown
      ? (Leaf<Tag, T> extends true ? true : CarriesOne<Tag, T, D>)
      : never) ? true : false;

/**
 * **The call side**: a call signature's awaited return. It answers **`false`, not "no match"**, when
 * `T` is not callable — which is half of A-81 Part 2 point 2 and half of R59-2's fix.
 *
 * **`Awaited<R>`, so `Promise<Trip>` behind a method is a door.** The classifier A-78 Part 2 widened
 * is REUSED (`IsDoor`, whose `Exclude<Awaited<R>, null | undefined>` argument order A-78 already
 * ruled load-bearing) rather than re-derived, so `Trip | null` behind a getter is caught by the same
 * rule that catches it at a module-level function.
 */
type CallSide<Tag extends 'door' | 'illegal', T, D extends number> =
  [T] extends [(...a: never[]) => infer R] ? Carries<Tag, Awaited<R>, Down[D]> : false;

/**
 * **The construct side**, with **A-80 Part 2 point 4's `ProducesTrip` pre-test kept exactly as
 * ruled** — A-81 changes where the arms are asked, not what they ask.
 *
 * `abstract new` matches both `class` constructors and bare construct-signature types. A construct
 * signature that produces a `Trip` therefore fails **here**, as a *carrier that must be split*,
 * naming the export — and is **not** promoted into `DOORS`, where the behavioural runner would call
 * it without `new`. **The arm does not go on `TripishReturn`**: A-80 Part 2 measured that placement
 * and it reddens `DOOR_CENSUS` with **no name in the message**, while a builder's repair would be to
 * add the constructor to `DOORS`. A construct signature is not a door — the normal form quoted
 * beside `HIDDEN_DOOR_CENSUS` says a door is a module-level function — so it must fail as a carrier.
 *
 * Because the pre-test is now **shared by tag**, a `Trip`-producing construct signature reddens
 * **both** censuses. A-81 Part 3 rules that deliberate: both messages are true, both tell the builder
 * to split it, and the noise is one extra line of `tsc` output in a case that is already a build
 * failure. It is not worth a tag-conditional to suppress.
 */
type CtorSide<Tag extends 'door' | 'illegal', T, D extends number> =
  [T] extends [abstract new (...a: never[]) => infer I]
    ? (ProducesTrip<I> extends true ? true : Carries<Tag, I, Down[D]>) : false;

/**
 * One non-union type. **The three constructors a type can hold another type on its OUTPUT side**
 * (A-80 Part 3) — and they are not three of an unbounded set. Arrays, tuples, index signatures,
 * mapped types and intersections are all *object types with members*; a union is handled by the
 * quantifier above; `Promise`, `Set`, `Map`, `Iterable` and their relatives are reduced to these by
 * the compiler before the predicate sees them. **That list is closed by the language and not by this
 * codebase**, which is the distinction A-80 Part 3 draws between this and the arm-per-carrier A-79
 * Part 1 refused: a builder invents an eighth *declaration form* by writing code, and invents no
 * eighth *type constructor* by writing anything.
 *
 * **All three arms are asked INDEPENDENTLY and the answer is their DISJUNCTION** (A-81 Part 2
 * point 2, QA **R59-2**). A-80 wrote them as a conditional *chain*, which made them ordered and
 * exclusive: a type with a call signature **and** a construct signature matched the first arm, that
 * arm answered `false`, and the construct arm A-80 had just added was never reached —
 * `{ (): string; new (): { archive: Door } }` was green while the same type without the call
 * signature was red. `CallSide` and `CtorSide` are separate aliases that answer `false` rather than
 * falling through, so all three can be asked. That is the whole of R59-2's fix and it costs two
 * aliases.
 *
 * **A callable's PROPERTIES are still walked as well as its return type.** `keyof` a bare function
 * type is `never` — verified, so there is no `call`/`apply`/`bind` noise to filter — but `keyof` a
 * function with a door hung off it is exactly that door's key. A function type **is** an `object`,
 * so the third arm reaches a callable's own members once the first two have answered `false`; that
 * is what keeps `Object.assign(fn, {door})` from being another form.
 */
type CarriesOne<Tag extends 'door' | 'illegal', T, D extends number> =
  CallSide<Tag, T, D> extends true ? true
    : CtorSide<Tag, T, D> extends true ? true
      : [T] extends [object] ? Members<Tag, T, Down[D]> : false;

// ---------------------------------------------------------------------------------------------
// A-80 Part 4 (QA **R58-1**) — the DESCENT CENSUS. *A coverage claim is checked by the compiler or
// it is a paragraph.*
//
// A-79 Part 11 wrote its closure claim as a numbered list of exceptions and it was falsified in one
// round. A-80 Part 10 withdraws that format and claims **coverage of a closed set** instead:
// `Carries` descends through every place a TypeScript type holds another type on its OUTPUT side —
// union members, intersection members, properties (required, optional, readonly, getter,
// symbol-keyed), index signatures, array and tuple elements, a call signature's awaited return type,
// and a construct signature's instance type. **That set is closed by the language and not by this
// codebase**, and the rows below are what checks it. An enumeration here is a MEASUREMENT and not a
// mechanism: the predicate is structural, so a row this table forgets is very likely still caught,
// and a missing row costs a row rather than a hidden door.
//
// Every row is one constructor with a **positive** fixture (a door behind it) and a **doorless
// negative twin**, so a row cannot pass by the predicate becoming vacuous — the row's
// `Carries<…, Neg>` must be `false` or the row names itself too.
//
// **Two rows are asserted `false` deliberately** (A-80 Part 10), so the walk's boundaries are
// MEASURED rather than described: a **parameter position**, which is a ruled non-descent (a door
// passed in as an argument belongs to the caller, and flagging it would flag every higher-order
// function in the library), and an **overload set whose last signature is not `Trip`**, which is not
// an exception to the coverage claim but **an incomplete row inside it** — `infer R` resolves to the
// last signature, so the walk covers one signature of N. Both are in this table rather than in a
// residue paragraph so that if TypeScript's behaviour changes under us the file reddens and somebody
// reads A-80, instead of a paragraph quietly becoming untrue.
//
// **A-81 Part 4 (QA R59-1/R59-2/R59-3) took the table 35 → 40, and refused the general rule.**
// Round 59's structural point is right and it is recorded here rather than fixed here: *a census of
// fixtures measures its fixtures*, and every one of A-80's 35 rows puts its door one hop BELOW the
// constructor it names, so no row could ever have caught a door AT the constructor's own position.
// The proposed remedy — **two fixtures per constructor, one at the position and one below it** — is
// **REFUSED as open-ended**: it roughly doubles this table and its `tsc` cost to buy coverage of
// corners that have produced ZERO live defects in six rounds. What is adopted instead is **five
// specific rows that pin the three defects actually found**, so this repair cannot silently regress.
// **Do not add a sixth row on the strength of a type-system corner case** — A-81 Part 8 closed this
// class, and the bar for reopening it is an export that exists in `packages/core/src` today.
// **The existing 35 rows do not change**: not their labels, not their fixtures, not their order.
// ---------------------------------------------------------------------------------------------

/** The door shape every positive fixture below hides, and the doorless twin every negative one
 *  does. `Doorless` is a *function*, not a scalar — a negative twin that removed the callable as
 *  well as the `Trip` would pass whether the descent worked or not. */
type Door = (t: Trip, r: ConflictResolution) => Trip;
type Doorless = (t: Trip, r: ConflictResolution) => string[];

/** The **other member** of R59-1's union — `Door | Inert` is the exact shape that left
 *  `npm run typecheck` at exit 0 with the door in plain sight. It must be a *callable* for the same
 *  reason `Doorless` is: a union whose other member were a scalar would still distribute usefully,
 *  but it would stop being the shape round 59 measured. */
type Inert = (t: Trip) => void;

declare const DESCENT_SYM: unique symbol;

type RecursiveWithDoor = { readonly next?: RecursiveWithDoor; readonly run?: Door };
type RecursiveDoorless = { readonly next?: RecursiveDoorless; readonly run?: Doorless };

/** `never` if the constructor is covered; the label if the positive fixture is missed OR the
 *  negative fixture false-positives. A-80 Part 4, verbatim. */
type Descent<Label extends string, Pos, Neg> =
  Carries<'door', Pos> extends true ? (Carries<'door', Neg> extends false ? never : Label) : Label;

/**
 * **A-81 Part 4 — the same shape as `Descent` with the tag changed.** The two `'illegal'` rows join
 * the **same** `DESCENTS` tuple and the **same** census line, so the door rows stay byte-identical
 * and there is still exactly one place a coverage row can be added.
 *
 * Its negative twin is asserted against the **illegal** leaf, which is why
 * `illegal-optional-method`'s twin can be — and is — a **door**: a door is a legal return shape, so
 * `IsIllegal` must answer `false` on it.
 */
type IllegalReach<Label extends string, Pos, Neg> =
  Carries<'illegal', Pos> extends true ? (Carries<'illegal', Neg> extends false ? never : Label) : Label;

/** A place the walk deliberately does NOT descend (A-80 Part 10). `never` while that holds; the
 *  label the day it starts descending — which is a finding, not a fix. */
type NonDescent<Label extends string, T> = Carries<'door', T> extends false ? never : Label;

type DESCENTS = [
  // — properties, in every modifier and key form the language has —
  Descent<'property-required', { run: Door }, { run: Doorless }>,
  Descent<'property-optional', { run?: Door }, { run?: Doorless }>,
  Descent<'property-optional-nested', { a?: { b?: { run: Door } } }, { a?: { b?: { run: Doorless } } }>,
  Descent<'property-readonly-getter', { readonly a?: { get run(): Door } }, { readonly a?: { get run(): Doorless } }>,
  Descent<'property-symbol-key', { [DESCENT_SYM]: Door }, { [DESCENT_SYM]: Doorless }>,
  Descent<'index-signature-string', { [k: string]: Door }, { [k: string]: Doorless }>,
  Descent<'index-signature-symbol', { [k: symbol]: Door }, { [k: symbol]: Doorless }>,
  // — indexed containers —
  Descent<'array', Door[], Doorless[]>,
  Descent<'readonly-array', readonly Door[], readonly Doorless[]>,
  Descent<'tuple', [string, Door], [string, number]>,
  // — the quantifier over a union, which is what R58-1 was —
  Descent<'union-non-object-member', { run: Door } | undefined, { run: Doorless } | undefined>,
  Descent<'union-null', { run: Door } | null, { run: Doorless } | null>,
  Descent<'discriminated-union',
    { kind: 'a'; run: Door } | { kind: 'n'; why: string },
    { kind: 'a'; run: Doorless } | { kind: 'n'; why: string }>,
  Descent<'intersection', { x: string } & { run: Door }, { x: string } & { run: Doorless }>,
  // — callables, on their output side —
  Descent<'call-signature-return', () => Door, () => Doorless>,
  Descent<'call-signature-return-promise', () => Promise<{ run: Door }>, () => Promise<{ run: Doorless }>>,
  Descent<'call-signature-own-property', (() => string) & { run: Door }, (() => string) & { run: Doorless }>,
  Descent<'construct-signature-instance', new () => { archive: Door }, new () => { archive: Doorless }>,
  Descent<'construct-signature-produces-trip',
    new (t: Trip, r: ConflictResolution) => Trip,
    new (t: Trip, r: ConflictResolution) => string[]>,
  // — the standard library, reduced to the constructors above before the predicate sees it —
  Descent<'promise', Promise<{ run: Door }>, Promise<{ run: Doorless }>>,
  Descent<'iterable', Iterable<Door>, Iterable<Doorless>>,
  Descent<'async-iterable', AsyncIterable<Door>, AsyncIterable<Doorless>>,
  Descent<'generator', Generator<Door>, Generator<Doorless>>,
  Descent<'set', Set<Door>, Set<Doorless>>,
  Descent<'readonly-set', ReadonlySet<Door>, ReadonlySet<Doorless>>,
  Descent<'map-door-value', Map<string, Door>, Map<string, Doorless>>,
  Descent<'map-carrier-value', Map<string, { run: Door }>, Map<string, { run: Doorless }>>,
  Descent<'weakmap', WeakMap<object, { run: Door }>, WeakMap<object, { run: Doorless }>>,
  // — mapped types —
  Descent<'record', Record<string, { a?: { run: Door } }>, Record<string, { a?: { run: Doorless } }>>,
  Descent<'partial', Partial<{ run: Door }>, Partial<{ run: Doorless }>>,
  Descent<'readonly-mapped', Readonly<{ run: Door }>, Readonly<{ run: Doorless }>>,
  Descent<'pick', Pick<{ run: Door; x: string }, 'run'>, Pick<{ run: Doorless; x: string }, 'run'>>,
  Descent<'recursive-type', RecursiveWithDoor, RecursiveDoorless>,
  // — A-81 Part 4's five rows: the three defects round 59 found, pinned so this repair cannot
  //   silently regress. 35 → 40. The general "two fixtures per constructor" rule is REFUSED as
  //   open-ended (A-81 Part 4), so this list stops here and does NOT gain a sixth row. —
  //
  //   R59-1: a door that IS a union member, rather than one hop below it. Every one of the three
  //   union rows above puts its door below the member (`{run: Door} | undefined`), so all three
  //   exercised the descent and none of them exercised the leaf test at the bottom of it. These two
  //   are what the leaf test moving inside the distribution buys, at the top level and one hop down.
  Descent<'union-member-is-door', Door | Inert, Doorless | Inert>,
  Descent<'union-member-is-door-nested', { autofix?: Door | Inert }, { autofix?: Doorless | Inert }>,
  //   R59-2: callable AND constructable. Under A-80's ordered chain this matched the call arm, that
  //   arm answered `false`, and the construct arm was never reached — while the same type without
  //   the call signature was red. The row dies the moment `CarriesOne`'s arms stop being disjoint.
  Descent<'call-and-construct',
    { (): string; new (): { archive: Door } },
    { (): string; new (): { archive: Doorless } }>,
  //   R59-3, asked with the `'illegal'` tag: the refused return shape, reached by the SAME walk.
  //   `illegal-optional-method`'s twin is deliberately a **door** — a door is a legal return shape,
  //   so the illegal leaf must answer `false` on it, and a twin that were merely doorless would not
  //   measure that.
  IllegalReach<'illegal-nested-method', { mix(t: Trip): Trip | Day }, { mix(t: Trip): string }>,
  IllegalReach<'illegal-optional-method',
    { autofix?: (t: Trip) => Trip | Day },
    { autofix?: (t: Trip) => Trip }>,
  // — and the two boundaries, asserted `false` on purpose (A-80 Part 10) —
  NonDescent<'parameter-position', (cb: Door) => void>,
  NonDescent<'overload-set-last-signature-not-trip',
    { (t: Trip, r: ConflictResolution): Trip; (t: Trip): string }>,
];

type UNCOVERED = DESCENTS[number];

/**
 * **This line is A-80 Part 10's closure claim**, in the only form this arc has left that is worth
 * anything: held by the compiler rather than by a paragraph.
 *
 * **The message is adapted from A-80 Part 4's block by one clause, and the reason is recorded as
 * KD-109:** the block's sentence names one failure direction (*"no longer descends"*), and the
 * two `NonDescent` rows fail in the opposite one (a ruled non-descent has STARTED descending). A
 * census that prints a false sentence about its own failure is the shape six rounds of this arc
 * exist to remove, so the clause names both directions. Nothing else about the block moves.
 */
const DESCENT_CENSUS: [UNCOVERED] extends [never] ? true :
  `A-80: this type constructor no longer behaves as the coverage claim says — the predicate has
   stopped descending it, its doorless twin now false-positives, or a ruled NON-descent has started
   descending: ${UNCOVERED}` = true;

/** A HIDDEN door: this export is not itself a door, and something under it is. **A-81 Part 3: the
 *  same walk `IllegalOf` uses, tagged `'door'` instead of `'illegal'`.** */
type Hides<T> = IsDoor<T> extends true ? false : Carries<'door', T>;

type HiddenOf<M> = { [K in keyof M]-?: Hides<M[K]> extends true ? K : never }[keyof M];
type HiddenIn<E> = E extends readonly [string, infer M] ? HiddenOf<M> & string : never;
type AllHidden = HiddenIn<(typeof CENSUS)[number]>;

/**
 * **This line is A-79.** It is written in the **template-literal** form deliberately: A-78's
 * `DOOR_CENSUS` fails as `Type 'true' is not assignable to type 'false'`, which tells a builder
 * that *something* is wrong and not *what*. This one fails naming **every offending export**.
 *
 * **`ILLEGAL_SHAPE_CENSUS` has now joined it in that form (A-81 Part 3), and `DOOR_CENSUS` has
 * not.** A-79 Part 6 deferred both on the ground that they were *"correct as they stand"*, and
 * that ground expired for one of them and not the other: the illegal census gained a **walk** in
 * this increment, so a nested shape can trip it and the nameless failure stopped being survivable.
 * `DOOR_CENSUS` still asks its question only of module members it can already name in the source,
 * so it keeps its `IsExact` form.
 *
 * **This census and `ILLEGAL_SHAPE_CENSUS` now share one walk**, `Carries<Tag, …>`, differing only
 * in which question `Leaf` asks at the bottom (A-81 Part 3). A second copy of the walk with
 * `IsIllegal` at the leaf was **refused by name**: this arc's entire history is a second, narrower
 * copy of a guarantee drifting from the first, and there is exactly one place to repair the descent.
 *
 * **What this census asks of a union changed under A-81 (R59-1), and the old sentence is the one
 * that produced the finding.** A-80 said the door test was *"asked of every member of a union"*.
 * It was not — it was asked once, of the whole type, **above** the distribution, and the thing that
 * distributed never asked it. The layers now divide as: `Carries` distributes and collapses
 * existentially; `Leaf` is asked **per member, inside** that distribution; `CarriesOne` descends one
 * non-union type through three **independent** arms. Read `Carries`'s docstring for why each of
 * those three sentences is load-bearing.
 *
 * **A-79 does not find a hidden door and guard it. It REFUSES THE CARRIER**, and that is the only
 * answer the mechanism can support rather than the weaker one. **The census is name-keyed by
 * necessity**: a door needs a `DOORS` entry, a behavioural row firing a hostile value at it, a
 * frozen-input row, a place in half 3's uniqueness walk, and a name to print in the refusal a user
 * reads on screen. A door that is a method on an object, or a closure a factory returns, has **no
 * module-level name and can receive none of those** — finding it would not let us guard it. So the
 * rule is to require the shape that CAN be guarded, and it is quoted here, beside A-78 Part 2's
 * wrapper prohibition above, because the two are one rule:
 *
 * > **Normal form (revision 61).** *A function in `packages/core/src` that produces an edited
 * > `Trip` is a **module-level exported function with a single call signature**. It is not a
 * > method, not a static method, not a getter, not a property of an exported object, not a closure
 * > returned by another function, **not a constructor or a construct signature**, and not an
 * > overload set. A design that wants one of those splits it: the door is a module-level function,
 * > and the carrier calls it.*
 *
 * **A-80 Part 7 added the constructor clause, and it is stated AND detected** — which is why it
 * lands in the same pass as the `abstract new` arm in `CarriesOne`. A clause alone would be *stated
 * and not detected*, and that is the shape which has now produced six rounds.
 *
 * With A-78 Part 2's *a door returns a `Trip` directly*, that is the whole of what a door may be:
 * **one exported function, one call signature, one `Trip` out.** A-78 Part 2's half is *stated and
 * not detected*; this half is **stated and detected**, everywhere except the overload case — which
 * A-80 Part 10 reframes as **an incomplete row inside the coverage claim rather than an exception
 * outside it**, asserts `false` in `DESCENT_CENSUS` above so the incompleteness is measured, and
 * gives the trigger *the first overload set under `packages/core/src`* — of which there are **zero**
 * today.
 */
const HIDDEN_DOOR_CENSUS: [AllHidden] extends [never] ? true :
  `A-79: a Trip-producing function is reachable through this export but is not a module-level
   function — split it out; do not exempt it: ${AllHidden}` = true;

/**
 * **A-79 Part 7 clause 1 — `NON_DOORS` liveness, checked by the compiler.**
 *
 * Every name in `NON_DOORS` must be one `IsDoor` actually classifies as a door. An **inert** entry
 * — one the census never spends, so evicting it is free — makes this line fail and **names itself**
 * in the error. This is what kills R57-2's substitution attack: because every entry is live,
 * removing one drops a name from the expected set that `AllDoors` still contains, and `DOOR_CENSUS`
 * fails. The list can grow; **it cannot shrink unobserved.**
 */
const NON_DOORS_ARE_LIVE: (typeof NON_DOORS)[number]['name'] extends AllDoors
  ? true
  : ['A-79 Part 7: this NON_DOORS entry excuses nothing and is a free slot',
    Exclude<(typeof NON_DOORS)[number]['name'], AllDoors>] = true;

/**
 * **A-79 Part 7 — what is NOT lost when the two wrapper producers leave the list.**
 *
 * `importLegacyDays` and `mergeTrips` were `NON_DOORS` entries under A-78. They return
 * `{trip, …}` wrappers, so `IsDoor` classified neither as a door and neither ever needed excusing;
 * their presence was A-78 Part 1's own uncompilable equation showing through, which KD-106
 * corrected in the code and not in the list. Their **documentation** was worth something and their
 * **inertness** was not, so they move to a line that asserts the property they were being trusted
 * for. This is **strictly more** than they had: an inert `NON_DOORS` entry said nothing, and this
 * fires the day a producer's return shape changes.
 *
 * A-77 Part 10 residue 3's two whole-document producers, asserted NOT to be doors rather than
 * excused as if they were. If either ever returns a `Trip` directly, this reddens and it must be
 * classified.
 */
const WRAPPER_PRODUCERS_ARE_NOT_DOORS:
IsExact<IsDoor<typeof ImportLegacyDays.importLegacyDays> | IsDoor<typeof MergeTripsMod.mergeTrips>, false> = true;

/**
 * **A-79 Part 5's no-false-positive measurement, pinned as a standing line rather than left as a
 * number in a ruling.** `AllHidden` being `never` over the shipped tree already says this, but it
 * says it about 54 modules at once and would keep saying it if these three stopped being the
 * reason. These are the shapes a **too-eager** predicate flags, and a red here is a **false
 * positive and a defect in this increment**, not a door:
 *
 *   - **the `Rule` objects as they actually ship** — ten object literals whose only method is
 *     `run(ctx): Conflict[]`. An object literal with a method is exactly the carrier A-79 exists to
 *     catch; what makes these legal is that the method returns `Conflict[]` and not a `Trip`. This
 *     is the control for N9, which adds `autofix?(t, c): Trip` to the same type and must redden;
 *   - **`sequentialIds`** — a function that *returns a function*. Higher-order is the carrier shape
 *     of A-79 Part 5 row 6; what makes this one legal is that the returned callable produces a
 *     `string`;
 *   - **`toDoc`** — it returns `Record<string, unknown>`, which A-78 Part 2 already recorded as the
 *     shape a looser classifier flags as carrying a `Trip`.
 */
const NEGATIVE_CONTROLS: IsExact<
  | Hides<typeof RuleOverlap.overlap>
  | Hides<typeof RuleLegacyFlag.legacyFlag>
  | Hides<typeof ModelIds.sequentialIds>
  | Hides<typeof SerializeToJSON.toDoc>,
  false
> = true;

test('A-78 Part 1: the type-level door census holds (it is `npm run typecheck` that enforces it)', () => {
  assert.equal(DOOR_CENSUS, true);
  assert.equal(ILLEGAL_SHAPE_CENSUS, true);
  assert.equal(new Set(DOORS).size, DOORS.length, 'a door is named twice');
});

test('A-79 Part 3: the hidden-door census holds (it is `npm run typecheck` that enforces it)', () => {
  assert.equal(HIDDEN_DOOR_CENSUS, true);
  // A-80 Part 4's descent census rides in this test rather than in a new one **on purpose**:
  // `I-19`'s ship gate pins the suite at 1637 and says no test may change, and this census — like
  // `DOOR_CENSUS` — is enforced by `npm run typecheck` and not by a runtime assertion.
  assert.equal(DESCENT_CENSUS, true);
  assert.equal(WRAPPER_PRODUCERS_ARE_NOT_DOORS, true);
  assert.equal(NEGATIVE_CONTROLS, true);
});

test('A-79 Part 7: NON_DOORS is one LIVE excuse, and the trigger is the SECOND name', () => {
  assert.equal(NON_DOORS_ARE_LIVE, true);
  for (const n of NON_DOORS) {
    assert.ok(!(DOORS as readonly string[]).includes(n.name), `${n.name} is listed as a door: ${n.why}`);
    assert.ok(n.why.length > 10);
    assert.ok(n.module.endsWith('.ts'), `${n.name}: \`module\` must be a path under packages/core/src`);
  }
  assert.equal(
    NON_DOORS.length, 1,
    'A-79 Part 7 supersedes A-78 Part 10\'s residue: NON_DOORS is the one remaining place a human ' +
    'judgement can hide a door, every entry is now LIVE (so eviction reddens the compiler rather ' +
    'than freeing a slot), and its trigger is THE SECOND NAME. A second producer is an ' +
    'architect\'s ruling — the question it must answer is whether producers get the whole-document ' +
    'check A-77 Part 10 residue 3 defers, not whether this particular function may be excused.',
  );
});

// ---------------------------------------------------------------------------------------------
// A-78 Part 1 half 2 — the MODULE census, a RECURSIVE directory read of `packages/core/src`.
// It sees the one thing a type-level assertion cannot: a new FILE, in any directory, including
// one nobody has created yet. `CENSUSED_BUILD_FILES` and `EXTRA_DOOR_FILES` are DELETED.
// ---------------------------------------------------------------------------------------------

function walk(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(resolve(dir, e.name), rel));
    else out.push(rel);
  }
  return out.sort();
}

test('A-78 Part 1: every `.ts` file under packages/core/src is censused, and every censused path is on disk', () => {
  const onDisk = walk(SRC).filter((f) => f.endsWith('.ts')).sort();
  const censused = CENSUS.map(([p]) => p).slice().sort();
  assert.deepEqual(
    onDisk,
    censused,
    'a file is under `packages/core/src` and is not censused: add a namespace import and a ' +
    '`CENSUS` row. If `npm run typecheck` then fails, that file exports a function returning a ' +
    '`Trip` and you must classify it — a door (add it to `DOORS` and give it a behavioural row), ' +
    'the mechanism, or a whole-document producer with a reason. DO NOT ADD AN EXCLUSION LIST.',
  );
});

test('A-78 Part 1: there is nothing else under packages/core/src — no `.d.ts`, no non-`.ts` file', () => {
  // A `.d.ts` cannot be namespace-imported the way `CENSUS` requires and could declare a door over
  // a JS implementation; core is zero-dependency and has neither today.
  const strays = walk(SRC).filter((f) => !f.endsWith('.ts') || f.endsWith('.d.ts'));
  assert.deepEqual(
    strays, [],
    'a file under `packages/core/src` is not a namespace-importable `.ts` module. An architect ' +
    'rules on this file; do not exclude it.',
  );
});

// ---------------------------------------------------------------------------------------------
// A-78 Part 1 half 3 — a door's name is UNIQUE across `packages/core/src`, checked at RUNTIME by
// function IDENTITY. Half 1 works on names, so a *second* door named `addStop` in another module
// would collapse into the union and stay invisible — the shadowing hole, and precisely the next
// face a breaker would try.
//
// It is closed **without qualifying every name**, which A-78 refuses because qualifying would
// double `DOORS` to carry `index.ts`'s re-exports. A re-export gives the SAME OBJECT, so
// `index.ts` costs nothing; a second definition gives two, and this reddens naming both modules.
// ---------------------------------------------------------------------------------------------

test('A-78 Part 1 half 3: every censused name resolves to exactly one function object', () => {
  const names = [
    ...DOORS,
    ...CENSUS_MECHANISM,
    ...NON_DOORS.map((n) => n.name),
  ] as readonly string[];
  const problems: string[] = [];
  for (const name of names) {
    const objects = new Map<unknown, string[]>();
    for (const [path, ns] of CENSUS) {
      const member = (ns as Record<string, unknown>)[name];
      if (typeof member !== 'function') continue;
      const seen = objects.get(member);
      if (seen) seen.push(path);
      else objects.set(member, [path]);
    }
    if (objects.size === 0) {
      problems.push(`${name}: named in DOORS/CENSUS_MECHANISM/NON_DOORS and exported by no censused module`);
    } else if (objects.size !== 1) {
      const where = [...objects.values()].map((paths) => paths.join(' + ')).join(' AND ');
      problems.push(`${name}: ${objects.size} distinct function objects — ${where}`);
    }
  }
  assert.deepEqual(
    problems, [],
    'a name is defined twice under `packages/core/src`. If it ever fires on an innocent collision ' +
    'the answer is to RENAME THE INNOCENT FUNCTION, not to exempt it: a door\'s name is how a ' +
    'refusal reads on screen, and two of them in one library is a defect in its own right.',
  );
});

/**
 * **A-79 Part 7 clause 4** — half 3's identity walk, applied to `NON_DOORS`'s `module` field. This
 * is what makes each entry **individually checkable** rather than merely counted: the single
 * function object a `NON_DOORS` name resolves to must be the one the stated `module` path exports.
 * An entry cannot be silently re-pointed at a different function — *"each entry has a reason"*
 * stops meaning *"each entry has a sentence"*.
 */
test('A-79 Part 7: every NON_DOORS entry\'s `module` exports the very function its name resolves to', () => {
  const problems: string[] = [];
  for (const entry of NON_DOORS) {
    const stated = CENSUS.find(([path]) => path === entry.module);
    if (!stated) {
      problems.push(`${entry.name}: module \`${entry.module}\` is not a censused path`);
      continue;
    }
    const declared = (stated[1] as Record<string, unknown>)[entry.name];
    if (typeof declared !== 'function') {
      problems.push(`${entry.name}: \`${entry.module}\` exports no function called \`${entry.name}\``);
      continue;
    }
    const elsewhere = CENSUS
      .filter(([, ns]) => typeof (ns as Record<string, unknown>)[entry.name] === 'function')
      .filter(([, ns]) => (ns as Record<string, unknown>)[entry.name] !== declared)
      .map(([path]) => path);
    if (elsewhere.length > 0) {
      problems.push(
        `${entry.name}: \`${entry.module}\` exports one function object and ${elsewhere.join(', ')} `
        + 'export a different one under the same name',
      );
    }
  }
  assert.deepEqual(
    problems, [],
    'a NON_DOORS entry names a module that does not define it. The `module` field is the SECOND ' +
    'checkable fact each entry carries (A-79 Part 7 clause 4): an entry re-pointed at a different ' +
    'function makes it wrong, which is what an excuse written only in prose could not do.',
  );
});

// ---------------------------------------------------------------------------------------------
// A-78 Part 1 half 4 (was A-77 Part 6.4) — the BEHAVIOURAL census, UNCHANGED. One hostile value
// per door, driven by `DOORS`. This is what reddens if a door is listed and its `commit` call is
// deleted (A-77 fault N1), and it is what reddens if a door's name is moved into `NON_DOORS`
// (A-78 fault N6).
// ---------------------------------------------------------------------------------------------

type HostileRow = {
  /** The door. Must be one of `DOORS`, and every door must have a row. */
  door: string;
  /** The record class the refusal must name — `trip` for the envelope (A-77 Part 3 rule 1). */
  noun: string;
  /** The JSON path `fromJSON` throws at, rooted at the record. */
  path: string;
  /** The door the refusal names. Usually `door`; a delegating door names the door it delegates to. */
  where: string;
  hostile: () => unknown;
};

/** A trip whose own `title` cannot be stored — the envelope is parsed on every commit (rule 1). */
function poisonedEnvelope(t: Trip): Trip {
  return { ...t, title: 42 as unknown as string };
}

const HOSTILE: readonly HostileRow[] = [
  {
    door: 'addStop', noun: 'stop', path: '$.category', where: 'addStop',
    hostile: () => {
      const { trip, c } = baseTrip();
      return StopsMod.addStop(trip, { kind: 'scheduled', dayId: '2026-03-01', time: '10:00', order: 0 },
        { name: 'Bus', category: 'transport' as unknown as Stop['category'] }, c);
    },
  },
  {
    door: 'updateStop', noun: 'stop', path: '$.category', where: 'updateStop',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      return StopsMod.updateStop(trip, stopId, { category: 'transport' as unknown as Stop['category'] });
    },
  },
  {
    door: 'moveStop', noun: 'stop', path: '$.placement.cityKey', where: 'moveStop',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      return StopsMod.moveStop(trip, stopId, { kind: 'pool', cityKey: 42 } as unknown as Stop['placement']);
    },
  },
  {
    // Delegates to `moveStop`, which is where the refusal is raised — A-76's own note, upheld.
    door: 'reorderStop', noun: 'stop', path: '$.category', where: 'moveStop',
    hostile: () => {
      const { trip, c, stopId } = tripWithStop();
      const two = StopsMod.addStop(trip, { kind: 'scheduled', dayId: '2026-03-01', time: '12:00', order: 1 },
        { id: 'stop-2', name: 'Prater', category: 'sight' }, c);
      return StopsMod.reorderStop(poisonStop(two, stopId, 'category', 'transport'), stopId, 1);
    },
  },
  {
    // `removeStop` writes no caller value — A-76 exempted it. `commit` covers it anyway, because
    // the trip it produces is diffed whole and its envelope is parsed unconditionally.
    door: 'removeStop', noun: 'trip', path: '$.title', where: 'removeStop',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      return StopsMod.removeStop(poisonedEnvelope(trip), stopId);
    },
  },
  {
    door: 'addPlace', noun: 'place', path: '$.category', where: 'addPlace',
    hostile: () => {
      const { trip } = baseTrip();
      return StopsMod.addPlace(trip, { ...GOOD_PLACE, category: 'transport' as unknown as Place['category'] });
    },
  },
  {
    door: 'setDayMeta', noun: 'day', path: '$.legacyFlag', where: 'setDayMeta',
    hostile: () => {
      const { trip } = baseTrip();
      return DaysMod.setDayMeta(trip, '2026-03-01', { legacyFlag: 'yes' as unknown as boolean });
    },
  },
  {
    // R55-2: A-76 exempted `ensureDays`/`blankDay` as *"reads no caller value into a record
    // field"*, and that reason was false — `blankDay(date, city, ctx.now)` writes the CALLER's
    // `ctx.now` into `provenance.addedAt`.
    door: 'ensureDays', noun: 'day', path: '$.provenance.addedAt', where: 'ensureDays',
    hostile: () => {
      const { trip } = baseTrip();
      return DaysMod.ensureDays({ ...trip, endDate: '2026-03-06' },
        { ids: sequentialIds('e'), now: 42 as unknown as string, actorUserId: 'local:self' });
    },
  },
  {
    // R55-3: `createTrip`'s literal wrote six trip-level scalars with no check of any kind.
    door: 'createTrip', noun: 'trip', path: '$.title', where: 'createTrip',
    hostile: () => CreateTripMod.createTrip(
      { title: 42 as unknown as string, startDate: '2026-03-01', endDate: '2026-03-03', cities: [] }, ctx()),
  },
  {
    door: 'setTripMeta', noun: 'trip', path: '$.homeCurrency', where: 'setTripMeta',
    hostile: () => {
      const { trip, c } = baseTrip();
      return CreateTripMod.setTripMeta(trip, { homeCurrency: 7 as unknown as string }, c);
    },
  },
  {
    door: 'upsertBooking', noun: 'booking', path: '$.kind', where: 'upsertBooking',
    hostile: () => {
      const { trip } = baseTrip();
      return Bookings.upsertBooking(trip, { ...GOOD_BOOKING, kind: 'spaceship' as unknown as Booking['kind'] });
    },
  },
  {
    // A-76 exempted it — *"writes a field of a booking already in the trip"*. It rewrites that
    // booking into a NEW object, so `commit` parses it.
    door: 'supersedeBooking', noun: 'booking', path: '$.operator', where: 'supersedeBooking',
    hostile: () => {
      const { trip } = baseTrip();
      const a = Bookings.upsertBooking(trip, GOOD_BOOKING);
      const b = Bookings.upsertBooking(a, { ...GOOD_BOOKING, id: 'bk-2' });
      const poisoned: Trip = {
        ...b,
        bookings: b.bookings.map((x) => (x.id === 'bk-1' ? ({ ...x, operator: 42 } as unknown as Booking) : x)),
      };
      return Bookings.supersedeBooking(poisoned, 'bk-1', 'bk-2');
    },
  },
  {
    door: 'linkBooking', noun: 'stop', path: '$.category', where: 'linkBooking',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      const withBooking = Bookings.upsertBooking(trip, GOOD_BOOKING);
      return Bookings.linkBooking(poisonStop(withBooking, stopId, 'category', 'transport'), stopId, 'bk-1');
    },
  },
  {
    // R55-2: A-76 exempted it as *"writes a `Provenance` core constructs from its own literals"*,
    // and that reason was false — `accept(p, at, actor)` writes the CALLER's `at`.
    door: 'acceptCandidate', noun: 'stop', path: '$.provenance.acceptedAt', where: 'acceptCandidate',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      return Candidates.acceptCandidate(trip, { kind: 'stop', id: stopId }, 'local:self', 42 as unknown as string);
    },
  },
  {
    // `rejectCandidate` was safe **by accident** (`reject()` writes `acceptedAt: null` whatever it
    // is passed). It rewrites the record either way, so `commit` covers it on purpose now.
    door: 'rejectCandidate', noun: 'stop', path: '$.category', where: 'rejectCandidate',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      return Candidates.rejectCandidate(poisonStop(trip, stopId, 'category', 'transport'),
        { kind: 'stop', id: stopId }, 'local:self', '2026-03-01');
    },
  },
  {
    door: 'addParticipant', noun: 'participant', path: '$.kind', where: 'addParticipant',
    hostile: () => {
      const { trip, c } = baseTrip();
      return ParticipantsMod.addParticipant(trip, { displayName: 'Marta', kind: 'goldfish' as never }, c);
    },
  },
  {
    door: 'updateParticipant', noun: 'participant', path: '$.displayName', where: 'updateParticipant',
    hostile: () => {
      const { trip, c } = baseTrip();
      const withP = ParticipantsMod.addParticipant(trip, { displayName: 'Marta' }, c);
      return ParticipantsMod.updateParticipant(withP, withP.participants[0].id,
        { displayName: 42 as unknown as string });
    },
  },
  {
    door: 'removeParticipant', noun: 'trip', path: '$.title', where: 'removeParticipant',
    hostile: () => {
      const { trip, c } = baseTrip();
      const withP = ParticipantsMod.addParticipant(trip, { displayName: 'Marta' }, c);
      return ParticipantsMod.removeParticipant(poisonedEnvelope(withP), withP.participants[0].id);
    },
  },
  {
    door: 'addPhoto', noun: 'photo', path: '$.caption', where: 'addPhoto',
    hostile: () => {
      const { trip, c } = baseTrip();
      return PhotosMod.addPhoto(trip, { caption: 42 as unknown as string, thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c);
    },
  },
  {
    door: 'updatePhoto', noun: 'photo', path: '$.caption', where: 'updatePhoto',
    hostile: () => {
      const { trip, c } = baseTrip();
      const withPhoto = PhotosMod.addPhoto(trip, { id: 'ph-1', thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c);
      return PhotosMod.updatePhoto(withPhoto, 'ph-1', { caption: 42 as unknown as string });
    },
  },
  {
    door: 'removePhoto', noun: 'trip', path: '$.title', where: 'removePhoto',
    hostile: () => {
      const { trip, c } = baseTrip();
      const withPhoto = PhotosMod.addPhoto(trip, { id: 'ph-1', thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c);
      return PhotosMod.removePhoto(poisonedEnvelope(withPhoto), 'ph-1');
    },
  },
  {
    // A-76 exempted it — *"rewrites `attach` to the literal `{kind:'trip'}`"*. It rewrites the
    // PhotoAsset into a new object, so `commit` parses the whole record.
    door: 'reattachDanglingPhotos', noun: 'photo', path: '$.caption', where: 'reattachDanglingPhotos',
    hostile: () => {
      const { trip, c, stopId } = tripWithStop();
      const withPhoto = PhotosMod.addPhoto(trip, { id: 'ph-1', attach: { kind: 'stop', stopId }, thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c);
      // The stop is gone and the caption is unstorable: the photo must be rewritten, and the
      // rewritten record is what `commit` sees.
      const dangling: Trip = {
        ...withPhoto,
        days: withPhoto.days.map((d) => ({ ...d, stops: [] })),
        photos: withPhoto.photos.map((p) => ({ ...p, caption: 42 } as unknown as PhotoAsset)),
      };
      return PhotosMod.reattachDanglingPhotos(dangling);
    },
  },
  {
    door: 'returnToPool', noun: 'stop', path: '$.category', where: 'moveStop',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      return PoolMod.returnToPool(poisonStop(trip, stopId, 'category', 'transport'), stopId, 'wien');
    },
  },
  {
    door: 'scheduleFromPool', noun: 'stop', path: '$.category', where: 'moveStop',
    hostile: () => {
      const { trip, stopId } = tripWithStop();
      const pooled = StopsMod.moveStop(trip, stopId, { kind: 'pool', cityKey: 'wien' });
      const poisoned: Trip = {
        ...pooled,
        pool: pooled.pool.map((s) => ({ ...s, category: 'transport' } as unknown as Stop)),
      };
      return PoolMod.scheduleFromPool(poisoned, stopId, { dayId: '2026-03-01', time: '10:00', order: 0 });
    },
  },
  {
    // The one door whose input is another person's document (§2.14). The PLACE it drags in is
    // refused first — A-77 Part 3 rule 2's stated collection order, `places` before `days`.
    door: 'copyStopInto', noun: 'place', path: '$.category', where: 'copyStopInto',
    hostile: () => {
      const { trip: target, c } = baseTrip();
      const { trip: src, stopId } = foreignTrip((t) => ({
        ...t, places: t.places.map((p) => ({ ...p, category: 'transport' } as unknown as Place)),
      }));
      return CopyStopMod.copyStopInto(target, { trip: src, stopId },
        { kind: 'scheduled', dayId: '2026-03-01', time: '10:00', order: 0 },
        { ids: c.ids, today: '2026-03-01', actorUserId: 'local:self' });
    },
  },
  {
    // The case A-76's census structurally could not see: another directory, an eighth record class.
    door: 'resolveConflict', noun: 'resolution', path: '$.state', where: 'resolveConflict',
    hostile: () => {
      const { trip } = baseTrip();
      return ResolveMod.resolveConflict(trip, { conflictId: 'c-1', state: 'bogus' as never, by: 'local:self', at: '2026-03-01' });
    },
  },
  {
    door: 'syncResolutions', noun: 'resolution', path: '$.by', where: 'syncResolutions',
    hostile: () => {
      const t = tripWithResolution();
      const poisoned: Trip = { ...t, resolutions: t.resolutions.map((r) => ({ ...r, by: 42 } as unknown as typeof r)) };
      return ResolveMod.syncResolutions(poisoned, '2026-03-02');
    },
  },
  {
    door: 'reassertRetirements', noun: 'resolution', path: '$.by', where: 'reassertRetirements',
    hostile: () => {
      const t = tripWithResolution();
      const poisoned: Trip = { ...t, resolutions: t.resolutions.map((r) => ({ ...r, by: 42 } as unknown as typeof r)) };
      return ResolveMod.reassertRetirements(poisoned, new Map([['c-1', '2026-03-02']]));
    },
  },
  {
    door: 'unresolveConflict', noun: 'trip', path: '$.title', where: 'unresolveConflict',
    hostile: () => ResolveMod.unresolveConflict(poisonedEnvelope(tripWithResolution()), 'c-1'),
  },
];

test('A-77 Part 6.4: the behavioural census covers every door, exactly once', () => {
  assert.deepEqual(HOSTILE.map((r) => r.door).sort(), [...DOORS].sort());
});

/**
 * **A-78 Part 2's widening reaches the runner, not only the classifier** (BUILD-NOTES KD-107).
 * The classifier now admits `Promise<Trip>`, and a synchronous `try`/`catch` cannot see a rejected
 * promise: an async door's refusal would read as *"the door ACCEPTED a value `fromJSON` refuses"*,
 * which is the wrong sentence about the wrong fact. Every door is synchronous today, so this
 * changes nothing that runs — it is what stops A-78 Part 9's **N3** from being half-true.
 */
function isThenable(v: unknown): v is PromiseLike<unknown> {
  return typeof (v as { then?: unknown } | null)?.then === 'function';
}

for (const row of HOSTILE) {
  test(`A-77 Part 6.4: ${row.door} refuses a ${row.noun} the parser refuses (${row.path})`, async () => {
    let thrown: unknown = null;
    try {
      const out = row.hostile();
      if (isThenable(out)) await out;
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown !== null, `${row.door} accepted a ${row.noun} fromJSON refuses at ${row.path}`);
    assert.ok(thrown instanceof Error, `${row.door} threw a non-Error`);
    // A-76 Part 3's one hard prohibition, upheld entire by A-77: never a `TripParseError`. That
    // type means "this STORED document is unopenable" to `store.ts` and to §2.9 A-47's
    // `noteOpenFailure`, and raising one from a build door would put a live, healthy document
    // into the unreadable-row path.
    assert.ok(!(thrown instanceof TripParseError), `${row.door} threw a TripParseError`);
    const msg = (thrown as Error).message;
    assert.ok(msg.startsWith(`${row.where}: this ${row.noun} cannot be stored`), msg);
    assert.ok(msg.includes(row.path), `refusal does not carry the parser's path ${row.path}: ${msg}`);
    assert.ok(msg.includes('cannot be re-opened'), msg);
  });
}

// ---------------------------------------------------------------------------------------------
// A-78 Part 7 (QA **R56-10**) — **Invariant R**, the door half, enforced mechanically.
//
// > **Invariant R — records are replaced, never rewritten.** A record in a committed `Trip` is
// > immutable in practice. Code that changes a record produces a NEW object (`{...r, field: v}`)
// > and puts it in a new collection array; it never assigns through a reference into a record the
// > document already holds. **This is what makes `commit`'s identity diff sound**: an in-place
// > write is invisible to it, permanently, and the document becomes unopenable with no refusal at
// > any door.
//
// The premise was unstated until A-78, and the breaker demonstrated its violation at three record
// classes. It is now written into `commit.ts`'s header docstring, and this is the half the
// repository controls, proved rather than asserted: **for every door, deep-freeze the `before`
// document, call the door with a LEGAL argument, and assert it does not throw.** A door that
// mutates rather than replaces throws `TypeError` in strict mode (every module here is ESM).
//
// **There is no `Object.freeze` in `src`** — A-78 Part 7 refuses that, with its reasons and its
// trigger, and this is deliberately a test-time freeze. The CALLER half stays a written invariant.
// ---------------------------------------------------------------------------------------------

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  return value;
}

type FrozenRow = {
  /** The door. Must be one of `DOORS`, and every door must have a row. */
  door: string;
  /** The `before` document. The test deep-freezes THIS and hands it to `go`. */
  before: () => Trip;
  /**
   * **A-79 Part 9 (QA R57-6).** `Trip | Promise<Trip>`, not `Trip`. KD-107 widened the two
   * **runners** for `Promise<Trip>` and did not widen this **row type**, so making a real door
   * async reddened the census itself — `Type 'Promise<Trip>' is missing the following properties
   * from type 'Trip'` — and the first async door would have had to edit the mechanism that exists
   * to accommodate it. A-78 Part 2's whole argument for widening now rather than later is that
   * *"the cost of deferring is that the first async door ships unguarded and nothing says so"*, and
   * the widening stopped one type short of it.
   */
  go: (frozen: Trip, c: BuildCtx) => Trip | Promise<Trip>;
};

const PLACEMENT = { kind: 'scheduled', dayId: '2026-03-01', time: '10:00', order: 0 } as const;

const FROZEN: readonly FrozenRow[] = [
  { door: 'upsertBooking', before: () => baseTrip().trip, go: (t) => Bookings.upsertBooking(t, GOOD_BOOKING) },
  {
    door: 'supersedeBooking',
    before: () => Bookings.upsertBooking(Bookings.upsertBooking(baseTrip().trip, GOOD_BOOKING), { ...GOOD_BOOKING, id: 'bk-2' }),
    go: (t) => Bookings.supersedeBooking(t, 'bk-1', 'bk-2'),
  },
  {
    door: 'linkBooking',
    before: () => Bookings.upsertBooking(tripWithStop().trip, GOOD_BOOKING),
    go: (t) => Bookings.linkBooking(t, 'stop-1', 'bk-1'),
  },
  {
    door: 'acceptCandidate', before: () => tripWithStop().trip,
    go: (t) => Candidates.acceptCandidate(t, { kind: 'stop', id: 'stop-1' }, 'local:self', '2026-03-02'),
  },
  {
    door: 'rejectCandidate', before: () => tripWithStop().trip,
    go: (t) => Candidates.rejectCandidate(t, { kind: 'stop', id: 'stop-1' }, 'local:self', '2026-03-02'),
  },
  {
    // The `before` document here is the TARGET. The source is an argument, not the document being
    // edited, so it is not what this criterion freezes.
    door: 'copyStopInto', before: () => baseTrip().trip,
    go: (t, c) => {
      const { trip: src, stopId } = foreignTrip((x) => x);
      return CopyStopMod.copyStopInto(t, { trip: src, stopId }, PLACEMENT,
        { ids: c.ids, today: '2026-03-01', actorUserId: 'local:self' });
    },
  },
  {
    // `createTrip`'s `before` is `null` — the base case. What it must not mutate is the caller's
    // `init`, so that is what is frozen for this row.
    door: 'createTrip', before: () => baseTrip().trip,
    go: (_t, c) => CreateTripMod.createTrip(deepFreeze({
      id: 'trip-frozen', title: 'Frozen', startDate: '2026-03-01', endDate: '2026-03-03',
      cities: [{ key: 'wien', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
    }), c),
  },
  { door: 'setTripMeta', before: () => baseTrip().trip, go: (t, c) => CreateTripMod.setTripMeta(t, { title: 'Renamed' }, c) },
  { door: 'ensureDays', before: () => baseTrip().trip, go: (t, c) => DaysMod.ensureDays(t, c) },
  { door: 'setDayMeta', before: () => baseTrip().trip, go: (t) => DaysMod.setDayMeta(t, '2026-03-01', { title: 'Arrival' }) },
  {
    door: 'addParticipant', before: () => baseTrip().trip,
    go: (t, c) => ParticipantsMod.addParticipant(t, { displayName: 'Marta', kind: 'contact' }, c),
  },
  {
    door: 'updateParticipant',
    before: () => { const { trip, c } = baseTrip(); return ParticipantsMod.addParticipant(trip, { displayName: 'Marta' }, c); },
    go: (t) => ParticipantsMod.updateParticipant(t, t.participants[0].id, { displayName: 'Marta B' }),
  },
  {
    door: 'removeParticipant',
    before: () => { const { trip, c } = baseTrip(); return ParticipantsMod.addParticipant(trip, { displayName: 'Marta' }, c); },
    go: (t) => ParticipantsMod.removeParticipant(t, t.participants[0].id),
  },
  {
    door: 'addPhoto', before: () => baseTrip().trip,
    go: (t, c) => PhotosMod.addPhoto(t, { thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c),
  },
  {
    door: 'updatePhoto',
    before: () => { const { trip, c } = baseTrip(); return PhotosMod.addPhoto(trip, { id: 'ph-1', thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c); },
    go: (t) => PhotosMod.updatePhoto(t, 'ph-1', { caption: 'A caption' }),
  },
  {
    door: 'removePhoto',
    before: () => { const { trip, c } = baseTrip(); return PhotosMod.addPhoto(trip, { id: 'ph-1', thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c); },
    go: (t) => PhotosMod.removePhoto(t, 'ph-1'),
  },
  {
    // Something must actually dangle, or the door returns the trip by reference and proves nothing.
    door: 'reattachDanglingPhotos',
    before: () => {
      const { trip, c, stopId } = tripWithStop();
      const withPhoto = PhotosMod.addPhoto(trip, { id: 'ph-1', attach: { kind: 'stop', stopId }, thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c);
      return { ...withPhoto, days: withPhoto.days.map((d) => ({ ...d, stops: [] })) };
    },
    go: (t) => PhotosMod.reattachDanglingPhotos(t),
  },
  { door: 'returnToPool', before: () => tripWithStop().trip, go: (t) => PoolMod.returnToPool(t, 'stop-1', 'wien') },
  {
    door: 'scheduleFromPool',
    before: () => StopsMod.moveStop(tripWithStop().trip, 'stop-1', { kind: 'pool', cityKey: 'wien' }),
    go: (t) => PoolMod.scheduleFromPool(t, 'stop-1', { dayId: '2026-03-01', time: '10:00', order: 0 }),
  },
  {
    door: 'addStop', before: () => baseTrip().trip,
    go: (t, c) => StopsMod.addStop(t, PLACEMENT, { name: 'Prater', category: 'sight' }, c),
  },
  { door: 'updateStop', before: () => tripWithStop().trip, go: (t) => StopsMod.updateStop(t, 'stop-1', { name: 'Belvedere Palace' }) },
  { door: 'removeStop', before: () => tripWithStop().trip, go: (t) => StopsMod.removeStop(t, 'stop-1') },
  { door: 'moveStop', before: () => tripWithStop().trip, go: (t) => StopsMod.moveStop(t, 'stop-1', { kind: 'pool', cityKey: 'wien' }) },
  {
    door: 'reorderStop',
    before: () => {
      const { trip, c } = tripWithStop();
      return StopsMod.addStop(trip, { kind: 'scheduled', dayId: '2026-03-01', time: '12:00', order: 1 },
        { id: 'stop-2', name: 'Prater', category: 'sight' }, c);
    },
    go: (t) => StopsMod.reorderStop(t, 'stop-1', 1),
  },
  { door: 'addPlace', before: () => baseTrip().trip, go: (t) => StopsMod.addPlace(t, GOOD_PLACE) },
  {
    door: 'resolveConflict', before: () => baseTrip().trip,
    go: (t) => ResolveMod.resolveConflict(t, { conflictId: 'c-1', state: 'dismissed', by: 'local:self', at: '2026-03-01' }),
  },
  { door: 'syncResolutions', before: () => tripWithResolution(), go: (t) => ResolveMod.syncResolutions(t, '2026-03-02') },
  {
    door: 'reassertRetirements', before: () => tripWithResolution(),
    go: (t) => ResolveMod.reassertRetirements(t, new Map([['c-1', '2026-03-02']])),
  },
  { door: 'unresolveConflict', before: () => tripWithResolution(), go: (t) => ResolveMod.unresolveConflict(t, 'c-1') },
];

test('A-78 Part 7: the frozen-input census covers every door, exactly once', () => {
  assert.deepEqual(FROZEN.map((r) => r.door).sort(), [...DOORS].sort());
});

for (const row of FROZEN) {
  test(`A-78 Part 7 (Invariant R): ${row.door} replaces rather than rewrites — a frozen \`before\` is enough`, async () => {
    const frozen = deepFreeze(row.before());
    let thrown: unknown = null;
    // **A-79 Part 9 (R57-6).** The `await` is INSIDE the `try`, and the `catch` NAMES THE DOOR.
    // Round 57 found an async door mutating in a continuation after its first `await` took the
    // whole test file down with an unhandled rejection instead of naming anything — a mechanism
    // that names the door in the synchronous case and not the asynchronous one, which is this
    // arc's own shape in miniature. A rejection is now this row's failure, reported like a throw.
    try {
      await row.go(frozen, ctx(`frozen-${row.door}`));
    } catch (err) {
      thrown = new Error(`${row.door}: ${(err as Error)?.message ?? String(err)}`, { cause: err });
    }
    assert.equal(
      thrown, null,
      `${row.door} threw on a deep-frozen \`before\` document: ${(thrown as Error)?.message}. ` +
      'Invariant R — records are REPLACED, never rewritten. An in-place write is invisible to ' +
      "`commit`'s identity diff, permanently, and the document becomes unopenable with no " +
      'refusal at any door.',
    );
  });
}

// ---------------------------------------------------------------------------------------------
// A-77 Part 8 fault N5 — the SIXTEEN door × field cases of Part 1, re-derived here as a standing
// test rather than a one-off probe run. Each must be REFUSED AT DOOR.
// ---------------------------------------------------------------------------------------------

const SIXTEEN: ReadonlyArray<{ label: string; go: () => unknown }> = [
  // R55-1 — `setDayMeta · stops`. `DayMetaPatch` is a compile-time `Pick`; the door had no
  // runtime key allowlist, and A-76's elision then substituted the injected list away before
  // `parseDay` could see it.
  {
    label: 'R55-1 setDayMeta · stops',
    go: () => {
      const { trip, stopId } = tripWithStop();
      return DaysMod.setDayMeta(trip, '2026-03-01', {
        stops: [{ ...trip.days[0].stops[0], category: 'transport' }],
      } as unknown as Parameters<typeof DaysMod.setDayMeta>[2]);
    },
  },
  // R55-2 — two exemption reasons A-76 stated and the code disproved. Four cases.
  {
    label: 'R55-2 acceptCandidate · at (stop)',
    go: () => {
      const { trip, stopId } = tripWithStop();
      return Candidates.acceptCandidate(trip, { kind: 'stop', id: stopId }, 'local:self', 42 as unknown as string);
    },
  },
  {
    label: 'R55-2 acceptCandidate · at (day)',
    go: () => {
      const { trip } = baseTrip();
      return Candidates.acceptCandidate(trip, { kind: 'day', id: '2026-03-01' }, 'local:self', 42 as unknown as string);
    },
  },
  {
    label: 'R55-2 createTrip → blankDay · ctx.now',
    go: () => CreateTripMod.createTrip(
      { title: 'x', startDate: '2026-03-01', endDate: '2026-03-03', cities: [] },
      { ids: sequentialIds('n'), now: 42 as unknown as string, actorUserId: 'local:self' }),
  },
  {
    label: 'R55-2 setTripMeta → ensureDays · ctx.now on a range change',
    go: () => {
      const { trip } = baseTrip();
      return CreateTripMod.setTripMeta(trip, { endDate: '2026-03-20' },
        { ids: sequentialIds('n2'), now: 42 as unknown as string, actorUserId: 'local:self' });
    },
  },
  // R55-3 — the eight trip-level scalars A-76 Part 2 exempted in one sentence.
  { label: 'R55-3 setTripMeta · title', go: () => { const { trip, c } = baseTrip(); return CreateTripMod.setTripMeta(trip, { title: 42 as unknown as string }, c); } },
  { label: 'R55-3 setTripMeta · homeCurrency', go: () => { const { trip, c } = baseTrip(); return CreateTripMod.setTripMeta(trip, { homeCurrency: 7 as unknown as string }, c); } },
  { label: 'R55-3 setTripMeta · ownerId', go: () => { const { trip, c } = baseTrip(); return CreateTripMod.setTripMeta(trip, { ownerId: 7 as unknown as string }, c); } },
  { label: 'R55-3 setTripMeta · party', go: () => { const { trip, c } = baseTrip(); return CreateTripMod.setTripMeta(trip, { party: 'two' as unknown as Trip['party'] }, c); } },
  { label: 'R55-3 setTripMeta · meta', go: () => { const { trip, c } = baseTrip(); return CreateTripMod.setTripMeta(trip, { meta: 7 as unknown as Trip['meta'] }, c); } },
  { label: 'R55-3 createTrip · title', go: () => CreateTripMod.createTrip({ title: 42 as unknown as string, startDate: '2026-03-01', endDate: '2026-03-02', cities: [] }, ctx()) },
  { label: 'R55-3 createTrip · homeCurrency', go: () => CreateTripMod.createTrip({ title: 'x', homeCurrency: 7 as unknown as string, startDate: '2026-03-01', endDate: '2026-03-02', cities: [] }, ctx()) },
  { label: 'R55-3 createTrip · party', go: () => CreateTripMod.createTrip({ title: 'x', party: 'two' as unknown as Trip['party'], startDate: '2026-03-01', endDate: '2026-03-02', cities: [] }, ctx()) },
  // The architect's own three, at a door in a directory A-76's census could not read, writing the
  // eighth record class. These are what decided A-77 Part 2.
  { label: 'NEW resolveConflict · state', go: () => ResolveMod.resolveConflict(baseTrip().trip, { conflictId: 'c-1', state: 'bogus' as never, by: 'local:self', at: '2026-03-01' }) },
  { label: 'NEW resolveConflict · by', go: () => ResolveMod.resolveConflict(baseTrip().trip, { conflictId: 'c-1', state: 'dismissed', by: 42 as unknown as string, at: '2026-03-01' }) },
  { label: 'NEW resolveConflict · note', go: () => ResolveMod.resolveConflict(baseTrip().trip, { conflictId: 'c-1', state: 'dismissed', by: 'local:self', at: '2026-03-01', note: {} as unknown as string }) },
];

test('A-77 Part 8 N5: all sixteen door × field cases of Part 1 are REFUSED AT DOOR', () => {
  assert.equal(SIXTEEN.length, 16, 'A-77 Part 1 measures sixteen cases');
  const survivors: string[] = [];
  for (const { label, go } of SIXTEEN) {
    let thrown: unknown = null;
    try {
      const out = go();
      // Not refused: does the document it produced still open? That is the harm, measured the way
      // round 55 measured it — door → toJSON → fromJSON.
      try {
        fromJSON(toJSON(out as Trip));
        survivors.push(`${label} → accepted, and the saved document still reopens`);
      } catch (e) {
        survivors.push(`${label} → accepted, and the SAVED document is UNOPENABLE (${(e as Error).message})`);
      }
    } catch (err) {
      thrown = err;
    }
    if (thrown !== null) {
      assert.ok(thrown instanceof Error && !(thrown instanceof TripParseError),
        `${label} refused with the wrong error type`);
    }
  }
  assert.deepEqual(survivors, [], 'a door still writes a document that cannot be opened again');
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 5 — `setDayMeta`'s missing allowlist, the half of R55-1 `commit` does NOT subsume.
// ---------------------------------------------------------------------------------------------

test('A-77 Part 5: setDayMeta refuses every key outside DayMetaPatch', () => {
  const { trip } = baseTrip();
  for (const key of ['stops', 'id', 'date', 'somethingNobodyDeclared']) {
    assert.throws(
      () => DaysMod.setDayMeta(trip, '2026-03-01', { [key]: undefined } as unknown as Parameters<typeof DaysMod.setDayMeta>[2]),
      new RegExp(`setDayMeta: "${key}" may not be patched`),
      `${key} was accepted on a DayMetaPatch`,
    );
  }
});

test('A-77 Part 5: a `stops` key carrying an ALREADY-VALID stop from another day is still refused', () => {
  // This is the case `commit` cannot see: the smuggled stop is a perfectly parseable record and
  // is the SAME OBJECT the document already holds, so the identity diff finds nothing new. What
  // it produces is `duplicate_id` and `scheduled_stop_has_no_day` on an edit the user never made.
  const { trip, c, stopId } = tripWithStop();
  const existing = trip.days[0].stops[0];
  const twoDays = DaysMod.setDayMeta(trip, '2026-03-02', { title: 'Day two' });
  assert.throws(
    () => DaysMod.setDayMeta(twoDays, '2026-03-02', { stops: [existing] } as unknown as Parameters<typeof DaysMod.setDayMeta>[2]),
    /setDayMeta: "stops" may not be patched/,
  );
});

/**
 * **QA R56-6 — the type and the runtime allowlist, pinned.** `DAY_META_PATCH_KEYS` was a
 * hand-maintained second copy of `DayMetaPatch`'s `Pick` with nothing holding the two together: a
 * field added to the type and not to the constant makes a legal patch silently refused, and
 * nothing catches it. The pin is in two halves, and this is the second:
 *
 *   1. `days.ts` types the constant as `Record<keyof DayMetaPatch, true>` — the same
 *      compile-time shape `readOnce.test.ts`'s four `CENSUS_*_FIELDS` maps use — so a field added
 *      to `DayMetaPatch` and not to the constant fails `npm run typecheck` **in `src`**, on the
 *      commit that adds it.
 *   2. This literal is typed `Required<DayMetaPatch>`, so the same field fails `npm run typecheck`
 *      **here** until the fixture carries it — and the assertion below then drives it through the
 *      real door, which is what makes the constant's agreement a *behaviour* and not a type.
 */
const EVERY_DAY_META_KEY: Required<DaysMod.DayMetaPatch> = {
  primaryCity: 'wien', cities: ['wien'], title: 'Arrival', subtitle: 'Landing',
  legacyFlag: true, tzId: 'Europe/Vienna',
  // `provenance` was here and A-78 Part 5 takes it out of the `Pick`. Both halves move together:
  // if only the constant moved, this literal would fail `npm run typecheck` for a missing key.
};

test('A-77 Part 5 (R56-6): every key of DayMetaPatch is accepted — the type and the allowlist cannot drift', () => {
  const { trip } = baseTrip();
  assert.doesNotThrow(() => DaysMod.setDayMeta(trip, '2026-03-01', EVERY_DAY_META_KEY));
  // Key by key, so a drift names the field rather than failing on the whole patch.
  for (const [k, v] of Object.entries(EVERY_DAY_META_KEY)) {
    assert.doesNotThrow(
      () => DaysMod.setDayMeta(trip, '2026-03-01', { [k]: v } as DaysMod.DayMetaPatch),
      `"${k}" is a key of DayMetaPatch and setDayMeta refused it — the allowlist has drifted from the type`,
    );
  }
});

test('A-77 Part 5 (R56-6): a key inherited from Object.prototype is not a patchable key', () => {
  // The allowlist is an OWN-property lookup, not `in`: `{toString: …}` names a key every object
  // has and none of them is a field of `DayMetaPatch`.
  const { trip } = baseTrip();
  for (const key of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) {
    assert.throws(
      () => DaysMod.setDayMeta(trip, '2026-03-01', Object.defineProperty({}, key, {
        value: undefined, enumerable: true, configurable: true, writable: true,
      }) as DaysMod.DayMetaPatch),
      // Not anchored at the front: `assert.throws` matches a RegExp against `String(err)`, which
      // carries the `Error: ` prefix. The tail is the part that matters here.
      new RegExp(`setDayMeta: "${key}" may not be patched — it is not a field of DayMetaPatch$`),
      `${key} was accepted on a DayMetaPatch, or its refusal printed a value off Object.prototype ` +
      'where its reason belongs',
    );
  }
});

// ---------------------------------------------------------------------------------------------
// A-78 Part 4 (QA **R56-5** / BUILD-NOTES **KD-104**) — `TripMetaPatch` joins the patch-allowlist
// family. Deleting `assertDatePrecision` was right and it left a real regression, and it is a
// change of **verdict** rather than of message: `setTripMeta(t, {datePrecision: undefined})` on a
// `'month'` trip silently wrote `'exact'`.
//
// **Why the family and not a guard for one field.** `parseTripEnvelope` carries `fromJSON`'s
// TOLERANCES verbatim, by design — absent `ownerId` is `''`, absent `datePrecision` is `'exact'`,
// absent `homeBase` is `null`. Those are right for a *document* (an older file; a field that did
// not exist yet) and wrong for a *patch*, where a key's PRESENCE is the caller saying *set this
// field to this value* and `undefined` is not a value any of these fields may hold. **Every field
// with a parser tolerance is a hole of exactly this shape**; `datePrecision` is the one a breaker
// reached first.
// ---------------------------------------------------------------------------------------------

/** Every key of `TripMetaPatch`, typed so a field added to the `Pick` fails `npm run typecheck`
 * here until the fixture carries it — R56-6's pin, applied to the second patch door. */
const EVERY_TRIP_META_KEY: Required<CreateTripMod.TripMetaPatch> = {
  title: 'Renamed', startDate: '2026-03-01', endDate: '2026-03-04', datePrecision: 'month',
  homeCurrency: 'GBP', homeBase: null, party: { adults: 2, children: 1 }, cities: [],
  ownerId: 'local:self', meta: { k: 1 },
};

test('A-78 Part 4 (R56-5): setTripMeta refuses a present-but-undefined key of TripMetaPatch', () => {
  const { trip, c } = baseTrip();
  const month = CreateTripMod.setTripMeta(trip, { datePrecision: 'month' }, c);
  assert.equal(month.datePrecision, 'month');
  assert.throws(
    () => CreateTripMod.setTripMeta(month, { datePrecision: undefined }, c),
    /setTripMeta: "datePrecision" may not be patched to `undefined`/,
    'a present-but-undefined datePrecision silently reset a precision the USER chose',
  );
  // …and the trip still reads what the user said.
  assert.equal(month.datePrecision, 'month');

  // The family, not the field: every key of `TripMetaPatch` gets the same answer, because every
  // one of them either has a parser tolerance or is a field `undefined` cannot be.
  for (const k of Object.keys(EVERY_TRIP_META_KEY)) {
    assert.throws(
      () => CreateTripMod.setTripMeta(month, { [k]: undefined } as CreateTripMod.TripMetaPatch, c),
      new RegExp(`setTripMeta: "${k}" may not be patched to \`undefined\``),
      `"${k}" was accepted with an explicit undefined — a caller that means *leave this field ` +
      'alone* omits the key',
    );
  }
});

test('A-78 Part 4 (R56-5): setTripMeta refuses any key outside TripMetaPatch\'s Pick', () => {
  const { trip, c } = baseTrip();
  for (const key of ['days', 'stops', 'id', 'revision', 'schemaVersion', 'photos', 'somethingNobodyDeclared']) {
    assert.throws(
      () => CreateTripMod.setTripMeta(trip, { [key]: 'x' } as unknown as CreateTripMod.TripMetaPatch, c),
      new RegExp(`setTripMeta: "${key}" may not be patched — it is not a field of TripMetaPatch$`),
      `${key} was accepted on a TripMetaPatch`,
    );
  }
});

test('A-78 Part 4 (R56-5): a key inherited from Object.prototype is not a patchable key here either', () => {
  const { trip, c } = baseTrip();
  for (const key of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) {
    assert.throws(
      () => CreateTripMod.setTripMeta(trip, Object.defineProperty({}, key, {
        value: 'x', enumerable: true, configurable: true, writable: true,
      }) as CreateTripMod.TripMetaPatch, c),
      new RegExp(`setTripMeta: "${key}" may not be patched — it is not a field of TripMetaPatch$`),
      `${key} was accepted on a TripMetaPatch`,
    );
  }
});

test('A-78 Part 4 (R56-5): every key of TripMetaPatch is still ACCEPTED with a real value', () => {
  const { trip, c } = baseTrip();
  assert.doesNotThrow(() => CreateTripMod.setTripMeta(trip, EVERY_TRIP_META_KEY, c));
  for (const [k, v] of Object.entries(EVERY_TRIP_META_KEY)) {
    assert.doesNotThrow(
      () => CreateTripMod.setTripMeta(trip, { [k]: v } as CreateTripMod.TripMetaPatch, c),
      `"${k}" is a key of TripMetaPatch and setTripMeta refused it — the allowlist has drifted ` +
      'from the type',
    );
  }
});

test('A-78 Part 4: the `cities` Array.isArray check STAYS — it is the one shape commit cannot see', () => {
  const { trip, c } = baseTrip();
  assert.throws(
    () => CreateTripMod.setTripMeta(trip, { cities: 'not an array' as unknown as Trip['cities'] }, c),
    /setTripMeta: cities must be an array/,
    'commit walks a COLLECTION; a non-array in the slot is the one shape the per-collection walk ' +
    'cannot see',
  );
  // `{cities: undefined}` is subsumed by the new rule and answers with it, not with this one.
  assert.throws(
    () => CreateTripMod.setTripMeta(trip, { cities: undefined }, c),
    /setTripMeta: "cities" may not be patched to `undefined`/,
  );
});

// ---------------------------------------------------------------------------------------------
// A-78 Part 5 (QA **R56-7**) — `provenance` leaves `DayMetaPatch`.
//
// `setDayMeta`'s allowlist permitted `provenance` because `DayMetaPatch`'s `Pick` named it, while
// `updateStop`'s `FORBIDDEN_PATCH_KEYS` forbids it by name. Two doors, one field, opposite
// answers. **The stop's answer is the right one and the day follows it**: provenance records *who
// said so*, and a caller that can rewrite it can launder a suggestion into the user's own plan —
// the one convention the root `CLAUDE.md` calls absolute. `Sidebar.tsx` renders
// `displayStatus(day.provenance)` exactly as `DayTimeline.tsx` renders it for a stop, so a
// rewritable day provenance is a VISIBLE false claim about who planned the day.
// ---------------------------------------------------------------------------------------------

test('A-78 Part 5 (R56-7): setDayMeta refuses `provenance`, with updateStop\'s reason verbatim', () => {
  const { trip, stopId } = tripWithStop();
  assert.throws(
    () => DaysMod.setDayMeta(trip, '2026-03-01', { provenance: GOOD_PROVENANCE } as unknown as DaysMod.DayMetaPatch),
    /setDayMeta: "provenance" may not be patched — use acceptCandidate \/ rejectCandidate$/,
  );
  // The two doors now read the same. This is the sentence being matched against.
  assert.throws(
    () => StopsMod.updateStop(trip, stopId, { provenance: GOOD_PROVENANCE } as never),
    /updateStop: "provenance" may not be patched — use acceptCandidate \/ rejectCandidate$/,
  );
});

test('A-78 Part 5 (R56-7): a Day\'s provenance is written by blankDay and importLegacyDays and by nothing a caller can reach', () => {
  const { trip } = baseTrip();
  const before = trip.days[0].provenance;
  const after = DaysMod.setDayMeta(trip, '2026-03-01', { title: 'Arrival' });
  assert.deepEqual(after.days[0].provenance, before);
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 3 rule 4 — the elision survives, STRUCTURALLY rather than by a declared clause.
// ---------------------------------------------------------------------------------------------

test('A-77 Part 3.4: setDayMeta edits a day that already holds an unparseable stop', () => {
  // The point of the identity diff: the poisoned stop is the SAME OBJECT the door was handed, so
  // it is not re-parsed and the edit is not punished for data it did not write.
  const { trip, stopId } = tripWithStop();
  const poisoned = poisonStop(trip, stopId, 'category', 'transport');
  assert.doesNotThrow(() => DaysMod.setDayMeta(poisoned, '2026-03-01', { title: 'Arrival' }));
});

test('A-77 Part 3.4: a stop that MOVES between a day and the pool is not re-parsed for having moved', () => {
  const { trip, stopId } = tripWithStop();
  // A pre-existing record the parser would refuse, moved without being rewritten: `moveStop`
  // rewrites `placement`, so this asserts the one-set-over-days-and-pool rule through a door that
  // does NOT rewrite the record — `removeParticipant` on a trip whose pool holds it.
  const pooled = StopsMod.moveStop(trip, stopId, { kind: 'pool', cityKey: 'wien' });
  const poisoned: Trip = { ...pooled, pool: pooled.pool.map((s) => ({ ...s, category: 'transport' } as unknown as Stop)) };
  // `addPlace` touches neither the pool nor the days, so the poisoned pooled stop keeps identity.
  assert.doesNotThrow(() => StopsMod.addPlace(poisoned, GOOD_PLACE));
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 3 rule 5 — R55-5's TOCTOU, closed at every door rather than at the two the repros used.
// ---------------------------------------------------------------------------------------------

test('A-77 Part 3.5 (R55-5): a getter that flips on its second read cannot poison the document', () => {
  const { trip } = baseTrip();
  let reads = 0;
  const hostile = {
    ...GOOD_BOOKING,
    get kind(): Booking['kind'] {
      reads += 1;
      return reads === 1 ? 'train' : ('spaceship' as Booking['kind']);
    },
  } as Booking;
  const next = Bookings.upsertBooking(trip, hostile);
  assert.equal(next.bookings[0].kind, 'train');
  // And the document the door produced still opens, however many times the getter has since run.
  assert.doesNotThrow(() => fromJSON(toJSON(next)));
});

test('A-77 Part 3.5 (R55-5): a caller that mutates its object after the door returned holds an object the document no longer contains', () => {
  const { trip } = baseTrip();
  const mine: Booking = { ...GOOD_BOOKING };
  const next = Bookings.upsertBooking(trip, mine);
  assert.notEqual(next.bookings[0], mine, 'the door stored the caller\'s own object');
  (mine as { kind: string }).kind = 'spaceship';
  assert.equal(next.bookings[0].kind, 'train');
  assert.doesNotThrow(() => fromJSON(toJSON(next)));
});

test('A-77 Part 3.6 (R55-5): `party` and `homeBase` are substituted too', () => {
  const { trip, c } = baseTrip();
  const party = { adults: 2, children: 1 };
  const next = CreateTripMod.setTripMeta(trip, { party }, c);
  assert.notEqual(next.party, party, 'the envelope was not substituted');
  (party as { adults: unknown }).adults = 'two';
  assert.equal(next.party.adults, 2);
  assert.doesNotThrow(() => fromJSON(toJSON(next)));
});

// ---------------------------------------------------------------------------------------------
// QA **R56-4** — rule 5's TOCTOU one level UP: the collection ARRAY, not the record in it.
//
// Rule 5 made the RECORD read-once. The array holding it was not. `commitList` read `after[i]`
// for the aligned test and then built its output with `after.slice()` — a SECOND read of every
// slot it had not parsed — and when it parsed nothing at all it returned the array it was handed
// **by reference**, so every later read of that array (`toJSON`'s, the next door's) was a third.
// With an accessor on the slot, the value that was tested is then not the value that is stored:
// the breaker's flip-read sweep produced an UNOPENABLE document at flip 3.
//
// `commitList` and `commitDays` now read each slot exactly once and **accumulate what they read**
// into the array they return, so the collection in the committed document holds the values that
// were tested and no accessor the caller controls.
// ---------------------------------------------------------------------------------------------

/**
 * The breaker's own oracle (`qa/r56-a77.mjs`'s `census`): call the door, serialise what it
 * returned, try to open it again. `REFUSED` is the mechanism working. **`UNOPENABLE` is the
 * defect class** — it saved, and it can never be opened again.
 */
function census(run: () => Trip): 'REFUSED' | 'UNSERIALISABLE' | 'UNOPENABLE' | 'clean' {
  let doc: Trip;
  try { doc = run(); } catch { return 'REFUSED'; }
  let bytes: string;
  try { bytes = toJSON(doc); } catch { return 'UNSERIALISABLE'; }
  try { fromJSON(bytes); } catch { return 'UNOPENABLE'; }
  return 'clean';
}

/** An array whose slot `i` yields `flipped` on the `flipAt`-th read and `stable` on every other. */
function flipRead<T>(rows: readonly T[], i: number, flipAt: number, stable: T, flipped: T): T[] {
  const out = rows.slice();
  let reads = 0;
  Object.defineProperty(out, String(i), {
    configurable: true, enumerable: true,
    get(): T { return ++reads === flipAt ? flipped : stable; },
  });
  return out;
}

test('A-77 Part 3.5 (R56-4): a collection slot that flips on a LATER read cannot poison the document', () => {
  const { trip, c } = baseTrip();
  const base = Bookings.upsertBooking(
    Bookings.upsertBooking(trip, GOOD_BOOKING),
    { ...GOOD_BOOKING, id: 'bk-2', kind: 'bus' },
  );
  const good1 = base.bookings[1];
  const evil = { ...good1, kind: 'teleport' as Booking['kind'] };

  const bad: string[] = [];
  for (let flipAt = 1; flipAt <= 5; flipAt++) {
    const hostile = flipRead(base.bookings, 1, flipAt, good1, evil);
    const verdict = census(() =>
      CreateTripMod.setTripMeta({ ...base, bookings: hostile }, { title: `r${flipAt}` }, c));
    if (verdict === 'UNOPENABLE' || verdict === 'UNSERIALISABLE') bad.push(`flip ${flipAt}: ${verdict}`);
  }
  assert.deepEqual(
    bad, [],
    'a read of a collection slot other than the tested one reached the document — the value that ' +
    'was checked is not the value that was stored (R56-4, R55-5\'s class inside commit itself)',
  );
});

test('A-77 Part 3.5 (R56-4): the same holds for the DAYS array, whose slots commitDays reads', () => {
  const { trip } = baseTrip();
  const good1 = trip.days[1];
  const evil = { ...good1, title: 42 as unknown as string };

  const bad: string[] = [];
  for (let flipAt = 1; flipAt <= 5; flipAt++) {
    const hostile = flipRead(trip.days, 1, flipAt, good1, evil);
    const verdict = census(() => StopsMod.addPlace({ ...trip, days: hostile }, GOOD_PLACE));
    if (verdict === 'UNOPENABLE' || verdict === 'UNSERIALISABLE') bad.push(`flip ${flipAt}: ${verdict}`);
  }
  assert.deepEqual(bad, [], 'commitDays stored a read of a day slot other than the one it tested');
});

test('A-77 Part 3.5 (R56-4): commit accumulates — a committed collection is never the array the door handed it', () => {
  const { trip, c } = baseTrip();
  const base = Bookings.upsertBooking(trip, GOOD_BOOKING);
  const next = CreateTripMod.setTripMeta(base, { title: 'Renamed' }, c);
  assert.notEqual(
    next.bookings, base.bookings,
    'commit returned the array it was handed, so a later read of a slot is not the read that was tested',
  );
  assert.notEqual(next.days, base.days, 'the same, for the days array commitDays builds');
  // Accumulation is not re-parsing: every unchanged record keeps its identity, which is what
  // A-77 Part 9's budget is bought with.
  assert.equal(next.bookings[0], base.bookings[0]);
  for (let i = 0; i < base.days.length; i++) assert.equal(next.days[i], base.days[i]);
  assert.deepEqual(next.bookings, base.bookings);
});

test('A-77 Part 10 residue 4: an undeclared key on a record does not survive the door', () => {
  const { trip } = baseTrip();
  const next = Bookings.upsertBooking(trip, { ...GOOD_BOOKING, smuggled: 'x' } as unknown as Booking);
  assert.equal('smuggled' in next.bookings[0], false);
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 9 — `ensureDays` preserves day identity, so a range change re-parses only what it minted.
// ---------------------------------------------------------------------------------------------

test('A-77 Part 9: a range change keeps every unchanged day by object identity', () => {
  const { trip, c } = baseTrip();
  const before = trip.days.slice();
  const wider = CreateTripMod.setTripMeta(trip, { endDate: '2026-03-06' }, c);
  for (let i = 0; i < before.length; i++) {
    assert.deepEqual(wider.days[i], before[i], `day ${i} was rewritten by a range change`);
  }
  assert.equal(wider.days.length, 6);
});

test('A-77 Part 9: ensureDays does not rebuild a day whose id already equals its date', () => {
  const { trip } = baseTrip();
  const same = DaysMod.ensureDays(trip, ctx('x'));
  // `commit` substitutes nothing it did not have to, so an untouched day is the same object it
  // was — which is the property the 3,653-day budget is bought with.
  for (let i = 0; i < trip.days.length; i++) assert.equal(same.days[i], trip.days[i]);
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 4 — the two guards that are NOT the parser, and the one that is deleted.
// ---------------------------------------------------------------------------------------------

test('A-77 Part 4: assertDatePrecision is DELETED, and the refusal it made is the parser\'s now', () => {
  const { trip, c } = baseTrip();
  assert.throws(
    () => CreateTripMod.setTripMeta(trip, { datePrecision: 'fortnight' as never }, c),
    /setTripMeta: this trip cannot be stored — .*\$\.datePrecision/s,
  );
  assert.throws(
    () => CreateTripMod.createTrip({ title: 'x', startDate: '2026-03-01', endDate: '2026-03-02', datePrecision: 'fortnight' as never, cities: [] }, ctx()),
    /createTrip: this trip cannot be stored — .*\$\.datePrecision/s,
  );
  assert.doesNotThrow(() => CreateTripMod.setTripMeta(trip, { datePrecision: 'month' }, c));
});

/**
 * **A-78 Part 3 (QA R56-3) — this test's RULING changed, so the test is rewritten, not deleted.**
 *
 * A-77 Part 4 kept `isIsoDate` at both trip doors and gave a reason that is **false against the
 * code**: §2.9 **A-45** had already made `isIsoDate` the parser's *own* date check
 * (`fromJSON.ts`'s `isoDate` calls it), the two predicates return identical verdicts on all 19
 * values round 56 drove through both, and there is no value at which the door is stricter than the
 * document. That is R16-2's *one property, two guards*, and A-77 deleted `assertDatePrecision` one
 * table row above for exactly this reason.
 *
 * The only reason the measurement left open was **ordering** — the ground `assertBuiltAttach`
 * survives on — and it is empty: **both doors commit the envelope BEFORE minting days.**
 * `createTrip` runs `commit('createTrip', null, base)` and only then `ensureDays`; `setTripMeta`
 * runs `commit('setTripMeta', trip, next)` and only then the conditional `ensureDays`. So a
 * calendar-invalid date is refused by `parseTripEnvelope` at `$.startDate` **before** A-35's span
 * cap can produce its misleading *"this trip would cover N days"* message.
 *
 * **Both call sites are deleted.** `isIsoDate` itself is untouched — it is on §2.10's surface and
 * seven other modules call it, `fromJSON` included.
 */
test('A-78 Part 3 (R56-3): isIsoDate is DELETED at both trip doors, and the refusal is the parser\'s own', () => {
  for (const bad of ['2026-13-45', '2026-02-30', '2026-00-10', '2026-04-31', '2026-02-29']) {
    assert.throws(
      () => CreateTripMod.createTrip({ title: 'x', startDate: bad, endDate: '2026-03-02', cities: [] }, ctx()),
      (err: unknown) => {
        const msg = (err as Error).message;
        assert.ok(
          msg.startsWith('createTrip: this trip cannot be stored — '),
          `the refusal is not the storability refusal: ${msg}`,
        );
        assert.ok(msg.includes('expected a real calendar date in YYYY-MM-DD'), msg);
        assert.ok(msg.includes('$.startDate'), `the refusal does not name the field: ${msg}`);
        // A-35's span cap must NOT be what fires: `2026-13-45` rolls through Date.UTC into
        // 2027-02-14, and the misleading message is *"this trip would cover N days"*.
        assert.ok(!msg.includes('would cover'), `A-35's span cap pre-empted the parser: ${msg}`);
        return true;
      },
      `createTrip accepted ${bad}`,
    );
  }
  const { trip, c } = baseTrip();
  assert.throws(
    () => CreateTripMod.setTripMeta(trip, { endDate: '2026-13-45' }, c),
    (err: unknown) => {
      const msg = (err as Error).message;
      assert.ok(msg.startsWith('setTripMeta: this trip cannot be stored — '), msg);
      assert.ok(msg.includes('expected a real calendar date in YYYY-MM-DD'), msg);
      assert.ok(msg.includes('$.endDate'), msg);
      return true;
    },
  );
  // The doors keep NO second date opinion — not merely a weaker one. `isIsoDate` is CALLED
  // nowhere in this file any more (the docstrings still name it, which is why this matches a call
  // and not the word), and `build/` is left with exactly one guard that is not the parser.
  const source = readFileSync(resolve(SRC, 'build/createTrip.ts'), 'utf8');
  assert.equal(
    /isIsoDate\s*\(/.test(source), false,
    'createTrip.ts still calls a date predicate of its own — A-78 Part 3 deletes both call sites',
  );
});

test('A-78 Part 3: both doors\' `endDate < startDate` check STAYS — ordering is a property the parser deliberately does not have', () => {
  const { trip, c } = baseTrip();
  assert.throws(
    () => CreateTripMod.createTrip({ title: 'x', startDate: '2026-03-05', endDate: '2026-03-02', cities: [] }, ctx()),
    /createTrip: endDate 2026-03-02 precedes startDate 2026-03-05/,
  );
  assert.throws(
    () => CreateTripMod.setTripMeta(trip, { endDate: '2026-02-01' }, c),
    /setTripMeta: endDate 2026-02-01 precedes startDate 2026-03-01/,
  );
  // …and the reversed document itself OPENS. `validateTrip` is what reports it (§2.9).
  const reversed = { ...trip, startDate: '2026-03-03', endDate: '2026-03-01' };
  assert.doesNotThrow(() => fromJSON(toJSON(reversed as Trip)));
});

test('A-77 Part 4: assertBuiltAttach is KEPT, and still runs BEFORE commit', () => {
  const { trip, c } = baseTrip();
  assert.throws(
    () => PhotosMod.addPhoto(trip, { attach: { kind: 'place', placeId: 'pl-1' }, caption: 42 as unknown as string, thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c),
    /attaching a photo to a place is not built/,
    'the storability refusal pre-empted the deferral message',
  );
});

test('A-77 Part 4: the three per-field guards A-76 deleted are still gone', () => {
  for (const name of ['assertParticipantKind', 'assertDisplayName', 'assertNote']) {
    assert.equal(name in (ParticipantsMod as unknown as Record<string, unknown>), false);
  }
});

// ---------------------------------------------------------------------------------------------
// A-77 Part 10 residue 1 — agreement, not strictness. The doors must still accept everything the
// parser accepts, or the mechanism has become a second validator.
// ---------------------------------------------------------------------------------------------

test('A-77 residue 1: a legal edit at every checked door still succeeds', () => {
  const { trip, c, stopId } = tripWithStop();
  assert.doesNotThrow(() => StopsMod.updateStop(trip, stopId, { name: 'Belvedere Palace' }));
  assert.doesNotThrow(() => StopsMod.moveStop(trip, stopId, { kind: 'pool', cityKey: 'wien' }));
  assert.doesNotThrow(() => StopsMod.reorderStop(trip, stopId, 0));
  assert.doesNotThrow(() => StopsMod.removeStop(trip, stopId));
  assert.doesNotThrow(() => DaysMod.setDayMeta(trip, '2026-03-01', { title: 'Arrival', legacyFlag: true }));
  assert.doesNotThrow(() => StopsMod.addPlace(trip, GOOD_PLACE));
  assert.doesNotThrow(() => Bookings.upsertBooking(trip, GOOD_BOOKING));
  assert.doesNotThrow(() => PhotosMod.addPhoto(trip, { thumb: GOOD_DERIVATIVE, display: GOOD_DERIVATIVE }, c));
  assert.doesNotThrow(() => ParticipantsMod.addParticipant(trip, { displayName: 'Marta', kind: 'contact' }, c));
  assert.doesNotThrow(() => CreateTripMod.setTripMeta(trip, { title: 'Renamed' }, c));
  assert.doesNotThrow(() => Candidates.acceptCandidate(trip, { kind: 'stop', id: stopId }, 'local:self', '2026-03-02'));
  assert.doesNotThrow(() => ResolveMod.resolveConflict(trip, { conflictId: 'c-1', state: 'dismissed', by: 'local:self', at: '2026-03-01' }));
});

test('A-77 residue 1: a committed document round-trips through toJSON/fromJSON unchanged', () => {
  const { trip, c, stopId } = tripWithStop();
  const edited = DaysMod.setDayMeta(
    Bookings.upsertBooking(StopsMod.updateStop(trip, stopId, { name: 'Belvedere Palace' }), GOOD_BOOKING),
    '2026-03-01', { title: 'Arrival' },
  );
  assert.deepEqual(fromJSON(toJSON(edited)), edited);
});

