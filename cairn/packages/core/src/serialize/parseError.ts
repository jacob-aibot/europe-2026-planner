/**
 * `TripParseError`, in a module of its own.
 *
 * It lived in `fromJSON.ts` until QA **R45-1**, and it moved here for one reason: the fix for
 * that BLOCKER makes `fromJSON` call `migrateDoc`, and `migrate.ts` already threw
 * `TripParseError`. Leaving the class in `fromJSON.ts` would have made the two modules a cycle —
 * which ESM resolves, but only by an ordering argument nobody should have to re-derive when they
 * add the next reader. A leaf module both can import is the cheap way to not have that argument.
 *
 * `fromJSON.ts` re-exports it, so every existing import path is unchanged and §2.10's export
 * surface does not move.
 */

/** Thrown by `fromJSON` for any malformed document. Carries a JSON path. */
export class TripParseError extends Error {
  path: string;
  constructor(message: string, path: string) {
    super(`${message} (at ${path || '$'})`);
    this.name = 'TripParseError';
    this.path = path;
  }
}
