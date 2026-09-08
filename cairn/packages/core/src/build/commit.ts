/**
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
 * if (aligned[i] === r)      keep r;   // unchanged in place — one pointer comparison
 * else if (identity.has(r))  keep r;   // moved, not rewritten
 * else out[i] = assertStorable(...);   // new: PARSE, and SUBSTITUTE what the parser built
 * ```
 *
 * `identity === null` means *there is no `before`* (`createTrip`), so every record is new.
 * Returns `after` **by reference** when nothing moved, so an untouched collection allocates
 * nothing.
 */
function commitList<K extends StorableKind>(
  where: string,
  kind: K,
  label: string,
  aligned: readonly StorableOf<K>[] | null,
  identity: LazySet | null,
  after: StorableOf<K>[],
): StorableOf<K>[] {
  let out: StorableOf<K>[] | null = null;
  let known: ReadonlySet<unknown> | null = null;
  for (let i = 0; i < after.length; i++) {
    const r = after[i];
    if (aligned !== null && aligned[i] === r) continue;
    if (identity !== null) {
      if (known === null) known = identity();
      if (known.has(r)) continue;
    }
    const parsed = assertStorable(where, kind, r, `${label}[${i}]`);
    if (out === null) out = after.slice();
    out[i] = parsed;
  }
  return out ?? after;
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
 */
function commitDays(where: string, before: Trip | null, after: Trip, stopIdentity: LazySet | null): Day[] {
  const aligned = before === null ? null : before.days;
  const dayIdentity = before === null ? null : lazySet(() => (before as Trip).days);
  let out: Day[] | null = null;
  let known: ReadonlySet<unknown> | null = null;

  for (let i = 0; i < after.days.length; i++) {
    const d = after.days[i];
    if (aligned !== null && aligned[i] === d) continue;
    if (dayIdentity !== null) {
      if (known === null) known = dayIdentity();
      if (known.has(d)) continue;
    }
    // The day itself is new. Its own fields go to `parseDay` with the stop list elided …
    const parsedDay = assertStorable(where, 'day', { ...d, stops: [] }, `days[${i}]`);
    // … and its stops go through rule 3, index-aligned against whatever day stood at this index
    // before, then against the one set spanning `before`'s day stops and pool.
    const alignedStops = aligned !== null && aligned[i] !== undefined ? aligned[i].stops : null;
    const stops = commitList(where, 'stop', `days[${i}].stops`, alignedStops, stopIdentity, d.stops);
    if (out === null) out = after.days.slice();
    out[i] = { ...parsedDay, stops };
  }
  return out ?? after.days;
}
