/**
 * Content-addressed conflict ids (ARCHITECTURE §2.7).
 *
 * The id hashes `(ruleId, sorted subject ids, the values that made it a conflict)`. If the
 * Ryanair time changes from 19:30 to 07:30 the id changes, so a previous "acknowledged"
 * does NOT silently carry over. That is `HISTORY.md` Pass 5's lesson, mechanised.
 *
 * Hand-rolled FNV-1a rather than `node:crypto`: core has zero runtime dependencies and no
 * platform APIs, so it must hash the same way in Node, a browser and Hermes.
 */
import type { Conflict, ConflictKind, ConflictSeverity, Ref } from '../model/types.ts';
import type { ConflictId, RuleId } from '../model/ids.ts';

function fnv1a(input: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Stable 16-hex-char digest of a string. Pure. */
export function digest(input: string): string {
  const a = fnv1a(input, 0x811c9dc5);
  const b = fnv1a(input, 0x9e3779b9);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/** Canonical JSON with sorted keys, so param order cannot change an id. Pure. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
}

/** Builds the content-addressed id for a conflict. Pure. */
export function conflictId(ruleId: RuleId, subjects: readonly Ref[], values: unknown): ConflictId {
  const ids = subjects.map((s) => `${s.kind}:${s.id}`).sort();
  return `${ruleId}-${digest(canonical([ruleId, ids, values]))}`;
}

/** Assembles a conflict, computing its id. Pure. */
export function makeConflict(args: {
  ruleId: RuleId;
  kind: ConflictKind;
  severity: ConflictSeverity;
  subjects: Ref[];
  summary: string;
  params: Record<string, string | number>;
  detail?: string;
  /** The values that made it a conflict — part of the id, so a fix changes the id. */
  values: unknown;
}): Conflict {
  return {
    id: conflictId(args.ruleId, args.subjects, args.values),
    kind: args.kind,
    ruleId: args.ruleId,
    severity: args.severity,
    subjects: args.subjects,
    summary: args.summary,
    params: args.params,
    ...(args.detail ? { detail: args.detail } : {}),
    resolution: null,
  };
}
