/**
 * QA round 57 — a `Trip`-returning function defined OUTSIDE `packages/core/src`, used by
 * `qa/r57-kd106.sh` to ask whether a re-export can smuggle an unguarded door back into the
 * censused tree. It is not imported by any product code.
 */
import type { Trip } from '../packages/core/src/model/types.ts';

export function outsideDoor(trip: Trip, title: string): Trip {
  return { ...trip, title, revision: trip.revision + 1 };
}
