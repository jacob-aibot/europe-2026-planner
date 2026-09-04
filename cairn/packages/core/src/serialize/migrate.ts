/**
 * Document migration.
 *
 * **There are two schema versions since Phase 2 I-13 (§10.3, A-57 Part 5).** `migrateDoc` is a
 * pass-through with defaults for v2, a real upgrade for v1, and a loud, specific failure for
 * anything else. The *call site* was put in place before the first real migration existed
 * rather than being retrofitted into every reader; this is that migration arriving.
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
 * **v1 → v2** (§10.3, A-57 Part 5): the document gains `photos`.
 *
 * The rule above says a total default does not earn a bump; this is the case its second half
 * carves out. `photos` **is records**, and §8.5's sentence — *"an older client would silently
 * drop records it does not understand"* — is the exact harm: an old build opening a v2 document
 * and saving it deletes the user's photo attachments *and* orphans megabytes of bytes it cannot
 * see. So the version moves, an older build refuses loudly, and this supplies the field.
 *
 * A v1 document that somehow already carries `photos` keeps it: supplying a value over one that
 * exists is the class of repair `withDefaults` is careful not to do either.
 */
function v1ToV2(doc: Record<string, unknown>): Record<string, unknown> {
  return { ...doc, photos: Array.isArray(doc.photos) ? doc.photos : [], schemaVersion: 2 };
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
  if (v === 1) return withDefaults(v1ToV2(raw));
  if (v > SCHEMA_VERSION) {
    throw new TripParseError(
      `document is schemaVersion ${v}; this build reads up to ${SCHEMA_VERSION}. Update the app.`,
      '$.schemaVersion',
    );
  }
  throw new TripParseError(`no migration path from schemaVersion ${v}`, '$.schemaVersion');
}
