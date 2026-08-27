/**
 * Conflict resolution (ARCHITECTURE §2.7).
 *
 * `resolveConflict` appends to `trip.resolutions` and changes NOTHING else. A resolved
 * conflict still renders, dimmed. No code path in core edits a stop in response to a
 * conflict — auto-fixing is precisely the failure this whole subsystem exists to prevent.
 */
import type { ConflictResolution, Trip } from '../model/types.ts';
import type { ConflictId, IsoDate } from '../model/ids.ts';
import { isIsoDate } from '../model/ids.ts';
// §2.7 A-9 point 4: `resolve.ts` may import `detect.ts`. There is no cycle — `detect.ts`
// imports `model/` and `rules/` only, and `index.ts` imports both.
import { detectUngated } from './detect.ts';

/** `retiredAt` is set by `syncResolutions`, never by a caller, so it is optional here. */
export type ResolutionInit = Omit<ConflictResolution, 'retiredAt'> & { retiredAt?: IsoDate | null };

/**
 * Records (or replaces) the resolution for one conflict id. Pure.
 * @throws {Error} if the resolution has no `conflictId`.
 */
export function resolveConflict(trip: Trip, resolution: ResolutionInit): Trip {
  if (!resolution.conflictId) throw new Error('resolveConflict: conflictId is required');
  // A retired row for this id stays: it is the record that the user once answered this and
  // the conflict then went away, and `detectConflicts` reads it for the "you dismissed this
  // on 12 Aug; it has come back" detail line.
  const resolutions = trip.resolutions.filter((r) => r.conflictId !== resolution.conflictId || r.retiredAt);
  resolutions.push({ ...resolution, retiredAt: resolution.retiredAt ?? null });
  return { ...trip, resolutions, revision: trip.revision + 1 };
}

/**
 * Retires every live resolution whose conflict is no longer being reported (§2.7).
 *
 * A build function the client calls whenever it recomputes the derived conflict set — the
 * one build function driven by derived data, and the reason it is a build function and not
 * a side effect. **Retirement is one-way.** Without it, content-addressing lets a dismissed
 * conflict return still dismissed as soon as the data reverts to its old value, and a
 * dismissed blocker re-arming with no user action is what §2.7 exists to prevent.
 *
 * Returns the trip unchanged (same reference, same revision) when nothing was retired, so a
 * client may call it on every recompute without churning the document.
 *
 * **It detects the set itself, un-gated** (§2.7 **A-9**, revision 11, QA P2-1). The old
 * signature took the conflict set as an argument, and the natural thing to hand it — the set
 * the panel is holding — is §8.2's **gated** set, from which a feasibility finding has been
 * withdrawn merely because the trip is over. `syncResolutions` reads *"not in the set"* as
 * *"the user fixed it"*, so opening a finished trip retired every dismissal on it, bumped
 * `revision` and left the store dirty with no user action at all. *Retirement is a claim
 * about the document; the gate is a claim about the user's attention; they may not read the
 * same set.* A function whose correctness depends on the caller **not** making the natural
 * call is a footgun, so the ambiguous argument is deleted rather than documented.
 *
 * `at` is now both the stamp and the clock, so a missing or malformed one means **do
 * nothing** — never *detect with no horizon*.
 *
 * Pure (the rules are pure and the clock is injected).
 */
export function syncResolutions(trip: Trip, at: IsoDate): Trip {
  // Cheapest test first: with no live row there is nothing retirement can do, and this is the
  // common case — the reference trip has zero.
  if (!trip.resolutions.some((r) => !r.retiredAt)) return trip;
  if (!isIsoDate(at)) return trip;
  const live = new Set(detectUngated(trip, { today: at }).map((c) => c.id));
  let changed = false;
  const resolutions = trip.resolutions.map((r) => {
    if (r.retiredAt || live.has(r.conflictId)) return r;
    changed = true;
    return { ...r, retiredAt: at };
  });
  if (!changed) return trip;
  return { ...trip, resolutions, revision: trip.revision + 1 };
}

/**
 * Re-asserts an already-discovered retirement onto a document (§2.7 A-5, revision 6, QA R8-1).
 *
 * `syncResolutions` writes `retiredAt` into the **document**, outside the reducer — correctly,
 * because retirement is bookkeeping and §2.7 forbids it from consuming an undo slot. But §4.2
 * rule 5's undo is a snapshot restore over that same document, and `history.past` already
 * holds the pre-retirement `Trip`: Ctrl+Z therefore restored `retiredAt: null` and a dismissed
 * **blocker** rendered *"Marked dismissed on <date>"* after a keystroke that acknowledged
 * nothing.
 *
 * The position: *undo restores the plan, not the user's ignorance of what has already been
 * retired.* Retirement is not a step in the document's history; it is a **monotone fact about
 * a `conflictId`**, discovered once and true from then on. It lives in the document because it
 * has to survive a reload, and that storage location is what made it look like history.
 *
 * So: sets `retiredAt = retired.get(r.conflictId)` on every resolution row whose `retiredAt`
 * is `null` and whose `conflictId` the ledger holds. It **changes no other field of any
 * record, ever** — that sentence is the whole of §4.2 rule 5's carve-out. Returns the same
 * reference when nothing changed and bumps `revision` when something did, exactly as
 * `syncResolutions` does.
 *
 * Idempotent, and converges in one pass: it only ever moves `null` → a date the ledger already
 * holds, so a caller's `set` → re-assert cannot recurse.
 *
 * The ledger itself is client state (`AppState.retired`), per trip, outside `history` and never
 * persisted — it is reconstructed on load from the stored document's own `retiredAt` fields.
 *
 * Pure.
 */
export function reassertRetirements(trip: Trip, retired: ReadonlyMap<ConflictId, IsoDate>): Trip {
  if (retired.size === 0) return trip;
  let changed = false;
  const resolutions = trip.resolutions.map((r) => {
    // Never un-retires and never overwrites: an already-retired row keeps its own date,
    // whatever the ledger says.
    if (r.retiredAt) return r;
    const at = retired.get(r.conflictId);
    if (at === undefined) return r;
    changed = true;
    return { ...r, retiredAt: at };
  });
  if (!changed) return trip;
  return { ...trip, resolutions, revision: trip.revision + 1 };
}

/** Drops a stored resolution, putting the conflict back to unresolved. Pure. */
export function unresolveConflict(trip: Trip, conflictId: ConflictId): Trip {
  return {
    ...trip,
    resolutions: trip.resolutions.filter((r) => r.conflictId !== conflictId),
    revision: trip.revision + 1,
  };
}
