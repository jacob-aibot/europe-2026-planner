/**
 * Conflict resolution (ARCHITECTURE §2.7).
 *
 * `resolveConflict` appends to `trip.resolutions` and changes NOTHING else. A resolved
 * conflict still renders, dimmed. No code path in core edits a stop in response to a
 * conflict — auto-fixing is precisely the failure this whole subsystem exists to prevent.
 */
import type { Conflict, ConflictResolution, Trip } from '../model/types.ts';
import type { ConflictId, IsoDate } from '../model/ids.ts';

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
 * Pure.
 */
export function syncResolutions(trip: Trip, conflicts: readonly Conflict[], at: IsoDate): Trip {
  const live = new Set(conflicts.map((c) => c.id));
  let changed = false;
  const resolutions = trip.resolutions.map((r) => {
    if (r.retiredAt || live.has(r.conflictId)) return r;
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
