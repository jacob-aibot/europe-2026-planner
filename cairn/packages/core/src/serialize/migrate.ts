/**
 * Document migration.
 *
 * There is exactly one schema version today, so `migrateDoc` is a pass-through for v1 and a
 * loud, specific failure for anything else. It exists now so that the *call site* is in
 * place before the first real migration, rather than being retrofitted into every reader.
 */
import { SCHEMA_VERSION } from '../model/types.ts';
import { TripParseError } from './fromJSON.ts';

export { SCHEMA_VERSION };

/**
 * Fills in fields added additively *within* a schema version.
 *
 * §8.1's `datePrecision` is the first of these and states the rule: a field that is additive
 * with a **total default** does not earn a `schemaVersion` bump, because an older client
 * reading a newer document loses nothing it could have used. A bump is reserved for a *value*
 * widening that an older client would silently drop (§8.5's `source:'device'` is the one that
 * earns it). Absent values are supplied; present values are never touched — validating them
 * is `fromJSON`'s job and duplicating it here would give the rule two homes.
 */
function withDefaults(doc: Record<string, unknown>): unknown {
  if (doc.datePrecision !== undefined) return doc;
  return { ...doc, datePrecision: 'exact' };
}

/**
 * Upgrades a raw document to the current schema version. Pure.
 * @throws {TripParseError} for a version this build cannot read.
 */
export function migrateDoc(doc: unknown): unknown {
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    throw new TripParseError('expected a trip document object', '$');
  }
  const raw = doc as Record<string, unknown>;
  const v = raw.schemaVersion;
  if (v === SCHEMA_VERSION) return withDefaults(raw);
  if (typeof v !== 'number') {
    throw new TripParseError(`missing schemaVersion`, '$.schemaVersion');
  }
  if (v > SCHEMA_VERSION) {
    throw new TripParseError(
      `document is schemaVersion ${v}; this build reads up to ${SCHEMA_VERSION}. Update the app.`,
      '$.schemaVersion',
    );
  }
  throw new TripParseError(`no migration path from schemaVersion ${v}`, '$.schemaVersion');
}
