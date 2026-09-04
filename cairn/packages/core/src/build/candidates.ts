/**
 * Accepting and rejecting candidates (ARCHITECTURE §2.8, §2.10).
 *
 * Nothing that is not the user's own is ever presented as the user's plan. Acceptance is
 * an explicit act that stamps `state:'accepted'` and a timestamp; rejection keeps the item
 * (so it can be seen and undone) but marks it `rejected`, which `displayStatus` badges.
 */
import type { Provenance, Ref, Trip } from '../model/types.ts';
import type { IsoDate, UserId } from '../model/ids.ts';
import { accept, reject } from '../model/provenance.ts';

type ProvFn = (p: Provenance) => Provenance;

/**
 * Why a photo cannot be accepted or rejected **in this phase** — §10 **A-64**, revision 44.
 *
 * A-57 Part 4 claimed *"`acceptCandidate`/`rejectCandidate` then work on photos unchanged"* and
 * that sentence was false: `RefKind` has no `'photo'` arm, so `{kind:'photo'}` does not even
 * typecheck, and nothing in any shipped path mints a photo with `{source:'system'}` for the two
 * functions to act on. A-64 **withdraws the claim rather than implementing it**: the
 * `Provenance` *field* on `PhotoAsset` stays (it round-trips, and `displayStatus` badges a
 * candidate photo `'suggested'`), and the *transitions* wait for the increment that first
 * produces one — because *"reject"* means something different for a record whose derivatives are
 * megabytes, and that decision is Phase 6's to take with its own suggestion queue in front of it.
 *
 * This is a message and not a type: there is no `'photo'` `RefKind` to match on, so it is the
 * default arm's wording with a named exception for the string.
 */
const PHOTO_REFUSAL =
  'a photo\'s provenance has no transition in this phase — ARCHITECTURE §10 A-64. '
  + 'The field is carried and round-trips; the accept/reject transitions land with Phase 6\'s '
  + 'first {source:"system"} photo producer, which is the trigger A-64 Part 3 names.';

/**
 * `caller` is the **calling** function's name and it is a parameter rather than a literal: the throw
 * used to say `acceptCandidate:` no matter who raised it, so `rejectCandidate` reported another
 * function's name for its own refusal (A-64 Part 4 item 1, QA R45-6).
 */
function mapRef(trip: Trip, ref: Ref, f: ProvFn, caller: string): Trip {
  const fn = <T extends { provenance: Provenance }>(x: T): T => ({ ...x, provenance: f(x.provenance) });
  if (ref.kind === 'day') {
    let hit = false;
    const days = trip.days.map((d) => (d.id === ref.id ? ((hit = true), fn(d)) : d));
    if (!hit) throw new Error(`no such day ${ref.id}`);
    return { ...trip, days, revision: trip.revision + 1 };
  }
  if (ref.kind === 'stop') {
    let hit = false;
    const days = trip.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => (s.id === ref.id ? ((hit = true), fn(s)) : s)),
    }));
    const pool = trip.pool.map((s) => (s.id === ref.id ? ((hit = true), fn(s)) : s));
    if (!hit) throw new Error(`no such stop ${ref.id}`);
    return { ...trip, days, pool, revision: trip.revision + 1 };
  }
  if (ref.kind === 'booking') {
    let hit = false;
    const bookings = trip.bookings.map((b) => (b.id === ref.id ? ((hit = true), fn(b)) : b));
    if (!hit) throw new Error(`no such booking ${ref.id}`);
    return { ...trip, bookings, revision: trip.revision + 1 };
  }
  if ((ref.kind as string) === 'photo') throw new Error(`${caller}: ${PHOTO_REFUSAL}`);
  throw new Error(`${caller}: unsupported ref kind ${ref.kind}`);
}

/**
 * The R2-11 ruling (ARCHITECTURE §2.14, revision 4). An acceptance is a record of *who took
 * this on*; one with no accepter is unfalsifiable forever after, and §6.2's "ownership
 * traceable on every row" is on the brief's day-one list precisely because it is the
 * expensive retrofit. `null`, `undefined` and `''` are all programmer error, per §2.1 — the
 * same decision §2.1 already took for `updateStop`'s patch allowlist, and for the same
 * reason: a non-nullable TYPE is a compile-time comment, and R2-11 went straight through
 * `copyStopInto`'s.
 *
 * It is checked **before anything is copied**, so there is no partially-mutated document
 * behind the exception and `revision` has not moved.
 *
 * @throws {TypeError} if the actor is missing.
 */
export function requireActor(fn: string, actorUserId: UserId | null | undefined): UserId {
  if (typeof actorUserId !== 'string' || actorUserId === '') {
    throw new TypeError(
      `${fn}: actorUserId is required — an acceptance with no actor can never be traced to anyone.`,
    );
  }
  return actorUserId;
}

/**
 * Marks a day, stop or booking as the user's own. Pure.
 * @throws {TypeError} if `actorUserId` is missing (`null`, `undefined` or `''`) — §2.14.
 * @throws {Error} if the ref does not resolve, or its kind cannot carry provenance.
 */
export function acceptCandidate(trip: Trip, ref: Ref, actorUserId: UserId, at: IsoDate): Trip {
  const actor = requireActor('acceptCandidate', actorUserId);
  return mapRef(trip, ref, (p) => accept(p, at, actor), 'acceptCandidate');
}

/**
 * Marks a day, stop or booking rejected. It stays in the document, badged. Pure.
 * @throws {TypeError} if `actorUserId` is missing (`null`, `undefined` or `''`) — §2.14.
 * @throws {Error} if the ref does not resolve.
 */
export function rejectCandidate(trip: Trip, ref: Ref, actorUserId: UserId, at: IsoDate): Trip {
  const actor = requireActor('rejectCandidate', actorUserId);
  return mapRef(trip, ref, (p) => reject(p, at, actor), 'rejectCandidate');
}
