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
 * Upgrades a raw document to the current schema version. Pure.
 * @throws {TripParseError} for a version this build cannot read.
 */
export function migrateDoc(doc: unknown): unknown {
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    throw new TripParseError('expected a trip document object', '$');
  }
  const v = (doc as Record<string, unknown>).schemaVersion;
  if (v === SCHEMA_VERSION) return doc;
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
