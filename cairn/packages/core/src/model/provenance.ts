/**
 * Provenance constructors (ARCHITECTURE §2.8).
 *
 * `source` = who produced it. `confidence` = how well attested. `state` = whether the
 * user has taken it on. Email-derived data is created `state:'candidate'` and is never
 * a silent write.
 *
 * All functions pure. None of them read a clock — `at` is always passed in.
 */
import type { Provenance, ProvenanceConfidence } from './types.ts';
import type { IsoDate, UserId } from './ids.ts';

/** The user's own, accepted content. Pure. */
export function userProvenance(at: IsoDate, actorUserId: UserId | null = null): Provenance {
  return {
    source: 'user',
    state: 'accepted',
    confidence: 'confirmed',
    addedAt: at,
    acceptedAt: at,
    actorUserId,
  };
}

/** Something we drafted. Renders as `suggested` and stays dimmed until accepted. Pure. */
export function systemSuggestion(
  at: IsoDate,
  confidence: ProvenanceConfidence = 'inferred',
  ruleId?: string,
): Provenance {
  return {
    source: 'system',
    state: 'candidate',
    confidence,
    origin: ruleId ? { ruleId } : undefined,
    addedAt: at,
    acceptedAt: null,
    actorUserId: null,
  };
}

/** Mail-derived. ALWAYS a candidate — §5.1 gives ingestion no write path at all. Pure. */
export function emailCandidate(
  at: IsoDate,
  origin: { mailAccountId?: string; messageId?: string },
): Provenance {
  return {
    source: 'email',
    state: 'candidate',
    confidence: 'confirmed',
    origin,
    addedAt: at,
    acceptedAt: null,
    actorUserId: null,
  };
}

/** Pulled in from a friend's trip. The credit link survives acceptance. Pure. */
export function friendImport(
  at: IsoDate,
  origin: { friendUserId?: UserId; sourceTripId?: string; sourceStopId?: string },
): Provenance {
  return {
    source: 'friend',
    state: 'candidate',
    confidence: 'asserted',
    origin,
    addedAt: at,
    acceptedAt: null,
    actorUserId: null,
  };
}

/** Marks a provenance accepted. Pure — returns a new object. */
export function accept(p: Provenance, at: IsoDate, actorUserId: UserId | null): Provenance {
  return { ...p, state: 'accepted', acceptedAt: at, actorUserId };
}

/** Marks a provenance rejected. Pure — returns a new object. */
export function reject(p: Provenance, at: IsoDate, actorUserId: UserId | null): Provenance {
  return { ...p, state: 'rejected', acceptedAt: null, actorUserId };
}
