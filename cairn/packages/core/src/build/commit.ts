/**
 * §2.1 **A-79** Part 8 (revision 60, QA **R57-3**; ROADMAP **I-18**), restating §2.1 **A-78**
 * Part 7 (revision 59, QA **R56-10**; ROADMAP **I-17**) at the width its soundness actually
 * requires — *the premise this whole mechanism rests on, stated, because an unstated premise is
 * how this arc has stayed alive.*
 *
 * A-77 Part 3's induction below (*every record object in a committed document has already been
 * parsed once*) has a premise nobody wrote down, and round 56 demonstrated its violation at three
 * record classes: **a committed record mutated in place is skipped by identity forever**, so
 * `t.bookings[0].kind = 'teleport'` followed by any later door produces an unopenable document
 * with no refusal anywhere. Round 57 then demonstrated that A-78's wording of it was **too narrow
 * to cover its own mechanics** (**R57-3**): stated over *records*, it says nothing about a `Trip`'s
 * own **collection arrays**, so `t.bookings.push(unparsedRecord)` violates nothing it says — and
 * `commitList` reads `aligned = before.bookings`, which **is** `after.bookings` for any door that
 * does not touch that collection, so `aligned[i] === r` at **every** index including the appended
 * one. The record is treated as already-parsed permanently, and the next door writes a document
 * `fromJSON` refuses with no refusal anywhere. The same one level in at `day.stops`.
 *
 * No shipped path does either — grep-verified over `packages/core/src` and `packages/client/src`,
 * and no door in `build/` or `conflict/` mutates rather than replaces; every one operates on a
 * `slice()`. The premise, at its true width:
 *
 * > **Invariant R — a committed document is not written to outside a door.** A `Trip` that has
 * > come back from `commit` (or from `fromJSON`) is **immutable in practice**, and that binds
 * > three things, not one: its **records** (a `City`, `Place`, `Day`, `Stop`, `Booking`,
 * > `PhotoAsset`, `Participant` or `ConflictResolution`, and any object nested inside one), the
 * > **collection arrays that hold them** (`cities`, `places`, `days`, each day's `stops`, `pool`,
 * > `bookings`, `photos`, `participants`, `resolutions`), and the **envelope** itself. Code that
 * > changes a record produces a new object (`{...r, field: v}`); code that changes a collection
 * > produces a new array; **no record enters a committed document except through a door that
 * > commits it.** This is what makes `commit`'s identity diff sound: `commit` trusts everything
 * > reachable from `before`, so an in-place write — to a record, to an array, or by inserting an
 * > unparsed record into either — is invisible to it permanently, and the document becomes
 * > unopenable with no refusal at any door. It binds **every** writer, not only doors —
 * > `packages/client`, `apps/web`, a Phase 3 ingest worker and a Phase 5 native bridge included.
 *
 * **No change to `commit` can close the caller half, and that is A-79 Part 8's substance rather
 * than a shortcut.** `commit` diffs `after` against `before` and trusts `before` **entire** — the
 * aligned test and the lazy identity set are both built from it. A caller that has written into
 * `before` has already falsified the premise, and dropping the aligned test would not help: the
 * appended record is in `before.bookings` too, so the identity set contains it. The only
 * mechanisms that would catch it are the two A-78 Part 7 refused with its reasons — a production
 * deep-freeze, or deep-`readonly` model types — and its trigger for revisiting them is unchanged.
 * **I-18 therefore changes this docstring and no code in this file.**
 *
 * **Enforcement, and how far it reaches.** A-78 Part 7 considered three options and took the
 * third. **There is deliberately no `Object.freeze` in this function or in any `src` file**: a
 * *shallow* freeze does not cover nested records (`Stop.cost`, `Place.hours`) and so does not
 * enforce the invariant it claims; a *deep* freeze reaches the `meta` bags A-77 Part 10 residue 2
 * passes through by reference, which is a behaviour change outside that ruling's scope; and it
 * converts a silent bug into a thrown `TypeError` on paths no current code exercises. Deep-`readonly`
 * model types were refused too — they touch every type in §2.2 and still do not bind an
 * `any`-shaped caller. What ships instead is the **door half, enforced mechanically at test time**:
 * `packages/core/test/storable.test.ts`'s frozen-input census deep-freezes the `before` document,
 * calls every door in `DOORS` with a legal argument, and asserts it does not throw — a door that
 * mutates rather than replaces throws `TypeError` in strict mode (every module here is ESM) and
 * the test names it. That is a mechanical proof of the half the repository controls, at **zero
 * production cost and with no behaviour change** — and it already reaches Invariant R at its
 * restated width, because that freeze is **deep over arrays as well as records**, so a door that
 * *pushed* into a committed collection would throw and be named (round 57 confirmed that
 * directly). The **caller** half stays a written invariant,
 * reviewed: in Phase 1 the only caller is `packages/client`'s `applyAction`, a single choke point,
 * and A-77 Part 3 rule 5 already guarantees the document holds no object the caller passed in.
 *
 * **Trigger for revisiting the production freeze:** the first writer of a `Trip` outside
 * `packages/core` and `packages/client` — the Phase 3 ingest worker or the Phase 5 native bridge,
 * both promised by the brief. At that point the caller half stops being reviewable.
 *
 * ---
 *
 * §2.1 **A-77** — *a door does not say what it wrote; the document says what changed.*
 * (Revision 58, QA **R55-1/2/3/5** and the architect's own `resolveConflict` finding; ROADMAP
 * **I-16**.)
 *
 * **What this replaces, and why it is a mechanism rather than a longer table.** A-76 replaced
 * eight per-field guards with one mechanism (`assertStorable`) and then **enumerated where to call
 * it** — 24 rows, 26 free-text exemption reasons, which record class each door writes and which
 * fields it elides. Round 55 measured **thirteen** door × field cases that table still left
 * writing a document which can never be re-opened, and proved **two** of its exemption reasons
 * false against the code. The architect found **three more** at `conflict/resolve.ts`'s
 * `resolveConflict` — a door in a directory A-76's census structurally could not read, writing a
 * record class its type map did not have. **Sixteen**, in an enumeration that had already been
 * wrong once. §4.2 **A-69** ruled that class here: *"enumerating harder is not the answer; the
 * enumeration was never the reliable part."*
 *
 * So the door stops declaring. It hands over the document it was given and the document it
 * produced, and **this function computes what changed**, by object identity.
 *
 * **The invariant, and it is an induction:** *every record object in a committed document has
 * already been parsed once* — by `fromJSON` when the document was opened, or by the `commit` of
 * the door that first put it there. So a record that is still the **same object** needs no second
 * parse, and the only records that can carry an unparsed value are the ones this door just built.
 * `before === null` is the base case (`createTrip`), where every record is new.
 *
 * Three properties fall out that no table could have:
 *
 *   - **A door that writes a record nobody thought of is covered, because the record is new.**
 *     That is the property this arc's history argues for: `resolveConflict` needed a ruling to be
 *     found, and the next one will not.
 *   - **A door that changed nothing pays nothing**, because nothing is new. The cost is linear in
 *     what the door actually wrote, plus one pointer comparison per record in the collections it
 *     touched (A-77 Part 9).
 *   - **The elision is structural.** A day is parsed with `stops: []` and its stops are parsed
 *     individually, so there is no patch key that can put anything into the elided slot without
 *     becoming a new stop object rule 3 parses — R55-1's harm closed by construction rather than
 *     by a clause. (Its *other* half — a smuggled `stops` key carrying a stop that already exists
 *     elsewhere in the document, which is parseable and therefore not a storability problem at all
 *     — is `days.ts`'s `FORBIDDEN_DAY_META_PATCH_KEYS`, A-77 Part 5.)
 *
 * **`commit` checks storability, never validity** (A-77 Part 10 residue 1). §2.9's `Issue` rules
 * are untouched: a dense-day or duplicate-id question is still `validateTrip`'s. And agreement
 * with the parser is the invariant, not strictness — if `fromJSON` is loosened for a field, every
 * door loosens with it, silently, which is the mechanism working as specified.
 *
 * **Module-internal. NOT on §2.10's surface**, exactly as `assertStorable` and `reindex` are.
 * `packages/client`'s `applyAction` was the other candidate choke point and A-77 Part 2 option 2
 * refuses it in four clauses; the decisive one is that a boundary the *library* does not enforce
 * is a convention of one consumer, and core's doors have six other callers.
 */
import type {
  Booking, City, ConflictResolution, Day, Participant, PhotoAsset, Place, Stop, Trip,
} from '../model/types.ts';
import { parseTripEnvelope } from '../serialize/fromJSON.ts';
import { TripParseError } from '../serialize/parseError.ts';
import type { StorableKind, StorableOf } from './storable.ts';
import { assertStorable, storableRefusal } from './storable.ts';

/** A memoised identity `Set` over a collection — built **at most once per commit**, and only if some
 * record fails the index-aligned test. For the common edit (one record changed at a known index)
 * it is never built at all, which is what keeps A-77 Part 9's budgets. */
type LazySet = () => ReadonlySet<unknown>;

function lazySet(source: () => Iterable<unknown>): LazySet {
  let built: ReadonlySet<unknown> | null = null;
  return () => {
    if (built === null) built = new Set(source());
    return built;
  };
}

/**
 * A-77 Part 3 rule 3, for one collection.
 *
 * ```
 * const r = after[i];                  // the ONE read of this slot, ever
 * out[i] = r;
 * if (aligned[i] === r)      keep r;   // unchanged in place — one pointer comparison
 * else if (identity.has(r))  keep r;   // moved, not rewritten
 * else out[i] = assertStorable(...);   // new: PARSE, and SUBSTITUTE what the parser built
 * ```
 *
 * `identity === null` means *there is no `before`* (`createTrip`), so every record is new.
 *
 * **Rule 5 applies to the ARRAY, not only to the record in it** (QA **R56-4**). This function used
 * to read `after[i]` for the aligned test and then build its output with `after.slice()` — a second
 * read of every slot it had not parsed — and, when it parsed nothing, to return `after` itself **by
 * reference**, leaving every later read of that array (`toJSON`'s, the next door's) a third. Against
 * an accessor on a slot, the value tested is then not the value stored, and the breaker's flip-read
 * sweep produced an UNOPENABLE document at flip 3. So each slot is read **once**, into `r`, and the
 * value read is **accumulated into the array this returns**: what the committed document holds is
 * what was tested, in a plain array, with no accessor the caller controls left in it.
 *
 * The cost is one array per collection per commit, where an untouched collection used to allocate
 * nothing (**KD-105**). It is bounded by the walk this function already does — one slot, one
 * comparison, one store — and it re-parses **nothing**: an unchanged record is stored by identity,
 * which is what A-77 Part 9's budget is actually bought with.
 */
function commitList<K extends StorableKind>(
  where: string,
  kind: K,
  label: string,
  aligned: readonly StorableOf<K>[] | null,
  identity: LazySet | null,
  after: StorableOf<K>[],
): StorableOf<K>[] {
  const out: StorableOf<K>[] = new Array(after.length) as StorableOf<K>[];
  let known: ReadonlySet<unknown> | null = null;
  for (let i = 0; i < after.length; i++) {
    // The one read. Everything below tests `r`, stores `r`, and never touches `after[i]` again.
    const r = after[i];
    out[i] = r;
    if (aligned !== null && aligned[i] === r) continue;
    if (identity !== null) {
      if (known === null) known = identity();
      if (known.has(r)) continue;
    }
    out[i] = assertStorable(where, kind, r, `${label}[${i}]`);
  }
  return out;
}

/**
 * Every record in `after` that is not, by object identity, a record of `before`, handed to
 * `fromJSON`'s own parser for its class and **substituted by what the parser built**. Pure.
 *
 * @param where  the door's name, so a refusal names the function the caller actually called.
 * @param before the document the door was handed — `null` for a door that constructs one.
 * @param after  the document the door produced.
 * @returns a `Trip`. **Always a new object**, and that is deliberate rather than an oversight
 *   (A-77 Part 3 rule 6): every envelope field is substituted, `party` and `homeBase` included,
 *   because *not* substituting them is R55-5's hole left open at two more fields — a caller that
 *   keeps the `party` object it handed `setTripMeta` could mutate it afterwards into a document
 *   that cannot be opened. The *"same reference when nothing changed"* contract that
 *   `syncResolutions`, `reassertRetirements` and `reattachDanglingPhotos` promise is unaffected:
 *   all three take that decision, and return, **before** reaching here. A door calls `commit` only
 *   on a trip it built.
 *
 * @throws {Error} a **plain** `Error`, never a `TripParseError` — A-76 Part 3's one hard
 *   prohibition, upheld entire. See `storable.ts`'s `storableRefusal`.
 */
export function commit(where: string, before: Trip | null, after: Trip): Trip {
  // ── 1. The trip envelope, unconditionally. ────────────────────────────────────────────────
  // A-76 Part 2's *"a trip-level scalar is not a record class and keeps its own guard"* is
  // withdrawn and replaced: the trip's own scalars ARE a parseable unit, they are simply one
  // `fromJSON` never factored out. It is O(1) — eleven fields, two of them two-key objects — so
  // it runs on every commit with no diff at all, and R55-3's eight fields close without a single
  // named guard. `createTrip.ts`'s `assertDatePrecision` was A-76's one *efficiency* exception
  // and this is why it has no premise left.
  let envelope;
  try {
    envelope = parseTripEnvelope(after, '$');
  } catch (err) {
    if (!(err instanceof TripParseError)) throw err;
    throw storableRefusal(where, 'trip', err, '$');
  }

  // ── 2. Each record collection, in this fixed order. ───────────────────────────────────────
  // The order is the refusal **precedence** and is stated so it is deterministic: `cities`,
  // `places`, `days` (each day's own fields, then its stops), `pool`, `bookings`, `photos`,
  // `participants`, `resolutions`. It is what preserves *"the place refusal comes first"* for
  // `copyStopInto`, which `qa/r55-a76.mjs` §D pins.

  // One set over `before`'s day stops AND its pool, for rule 3's second test: a stop that moves
  // between them is the same already-parsed object and must not be re-parsed for having moved.
  const stopIdentity: LazySet | null =
    before === null
      ? null
      : lazySet(function* () {
          for (const d of (before as Trip).days) for (const s of d.stops) yield s;
          for (const s of (before as Trip).pool) yield s;
        });

  const cities: City[] = commitList(
    where, 'city', 'cities',
    before === null ? null : before.cities,
    before === null ? null : lazySet(() => (before as Trip).cities),
    after.cities,
  );

  const places: Place[] = commitList(
    where, 'place', 'places',
    before === null ? null : before.places,
    before === null ? null : lazySet(() => (before as Trip).places),
    after.places,
  );

  const days = commitDays(where, before, after, stopIdentity);

  const pool: Stop[] = commitList(
    where, 'stop', 'pool',
    before === null ? null : before.pool,
    stopIdentity,
    after.pool,
  );

  const bookings: Booking[] = commitList(
    where, 'booking', 'bookings',
    before === null ? null : before.bookings,
    before === null ? null : lazySet(() => (before as Trip).bookings),
    after.bookings,
  );

  const photos: PhotoAsset[] = commitList(
    where, 'photo', 'photos',
    before === null ? null : before.photos,
    before === null ? null : lazySet(() => (before as Trip).photos),
    after.photos,
  );

  const participants: Participant[] = commitList(
    where, 'participant', 'participants',
    before === null ? null : before.participants,
    before === null ? null : lazySet(() => (before as Trip).participants),
    after.participants,
  );

  const resolutions: ConflictResolution[] = commitList(
    where, 'resolution', 'resolutions',
    before === null ? null : before.resolutions,
    before === null ? null : lazySet(() => (before as Trip).resolutions),
    after.resolutions,
  );

  return { ...envelope, cities, days, pool, places, bookings, photos, participants, resolutions };
}

/**
 * A-77 Part 3 rule 4 — **a day is parsed with `stops: []` and its stops are parsed individually.**
 *
 * A-76's elision survives; it was always the right shape, because parsing a day's real stop list
 * would let one pre-existing bad stop make the day's *title* uneditable — punishing an edit for
 * data it did not write. What changes is that it is now **structural rather than declared**: the
 * day's own fields come from the day, the stops come from rule 3, and there is no patch key that
 * can put anything into the elided slot without becoming a new stop object rule 3 parses.
 *
 * Read-once and accumulating, for `commitList`'s reason and by the same construction (QA
 * **R56-4**): one read of `after.days[i]`, one read of `aligned[i]`, and the output array is built
 * from what was read rather than from a second pass over the caller's.
 */
function commitDays(where: string, before: Trip | null, after: Trip, stopIdentity: LazySet | null): Day[] {
  const aligned = before === null ? null : before.days;
  const dayIdentity = before === null ? null : lazySet(() => (before as Trip).days);
  const source = after.days;
  const out: Day[] = new Array(source.length) as Day[];
  let known: ReadonlySet<unknown> | null = null;

  for (let i = 0; i < source.length; i++) {
    const d = source[i];
    out[i] = d;
    // One read of the day that stood at this index before, used for both the alignment test and
    // the stop list it aligns against.
    const a = aligned === null ? undefined : aligned[i];
    if (a !== undefined && a === d) continue;
    if (dayIdentity !== null) {
      if (known === null) known = dayIdentity();
      if (known.has(d)) continue;
    }
    // Taken BEFORE the spread below, so the list rule 3 walks is the first read of the field and
    // the spread's (whose value the explicit `stops: []` discards) is the second.
    const dStops = d.stops;
    // The day itself is new. Its own fields go to `parseDay` with the stop list elided …
    const parsedDay = assertStorable(where, 'day', { ...d, stops: [] }, `days[${i}]`);
    // … and its stops go through rule 3, index-aligned against whatever day stood at this index
    // before, then against the one set spanning `before`'s day stops and pool.
    const stops = commitList(where, 'stop', `days[${i}].stops`, a === undefined ? null : a.stops, stopIdentity, dStops);
    out[i] = { ...parsedDay, stops };
  }
  return out;
}
