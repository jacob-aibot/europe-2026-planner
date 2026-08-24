/**
 * Conflict resolution (ARCHITECTURE §2.7).
 *
 * `resolveConflict` appends to `trip.resolutions` and changes NOTHING else. A resolved
 * conflict still renders, dimmed. No code path in core edits a stop in response to a
 * conflict — auto-fixing is precisely the failure this whole subsystem exists to prevent.
 */
import type { ConflictResolution, Trip } from '../model/types.ts';
import type { ConflictId } from '../model/ids.ts';

/**
 * Records (or replaces) the resolution for one conflict id. Pure.
 * @throws {Error} if the resolution has no `conflictId`.
 */
export function resolveConflict(trip: Trip, resolution: ConflictResolution): Trip {
  if (!resolution.conflictId) throw new Error('resolveConflict: conflictId is required');
  const resolutions = trip.resolutions.filter((r) => r.conflictId !== resolution.conflictId);
  resolutions.push(resolution);
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
