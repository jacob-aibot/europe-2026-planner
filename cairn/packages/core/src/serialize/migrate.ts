/**
 * Document migration.
 *
 * **There are three schema versions since Phase 2 I-9a (§8.3, A-72).** `migrateDoc` is a
 * pass-through with defaults for the current version, a **ladder** of successive upgrades for
 * anything below it, and a loud, specific failure for anything else. The *call site* was put in
 * place before the first real migration existed rather than being retrofitted into every reader;
 * this is that migration arriving, twice.
 *
 * ---
 *
 * **The rule that decides whether a new field earns a `schemaVersion` bump — §8.3 A-72 Part 4, in
 * three clauses. This docstring is where the rule is read from.**
 *
 *   - A new **scalar** field with a total default does **not** earn a bump. An older client
 *     reading a newer document loses nothing it could have used, and re-emits nothing it did not
 *     read. `datePrecision` (§8.1) is the case and stays as it is.
 *   - A **widening of an existing field's value domain** earns one. §8.5's `source:'device'` is
 *     the case.
 *   - A new **array of records** on `TripDoc` **always** earns one. The parser rebuilds by name
 *     and cannot round-trip a field it has never heard of (A-72 Part 3 — preserving unknown keys
 *     is forbidden by A-15/A-18/A-20, because a `{ ...w }` once carried a hotel door PIN across a
 *     person boundary), so an older build that opens such a document and saves it **deletes those
 *     records**. **There is no exception for "the records are small", "the array has a total
 *     default `[]`", or "no build has shipped yet."** The total default is what makes the loss
 *     *silent*; it is not what makes it *safe*.
 *
 * `photos` is decided by clause 3 (A-57 Part 5, which A-72 generalises rather than supersedes),
 * `participants` is decided by clause 3 without an argument, and the next one is decided by a
 * builder rather than by a ruling. **A mechanism used when someone remembers to argue for it is
 * not a mechanism** — and since the copy path gives up the cheap "carry unknown keys" answer on
 * purpose, `SCHEMA_VERSION` is the only downgrade-safety mechanism this design has left.
 */
import { SCHEMA_VERSION } from '../model/types.ts';
import { TripParseError } from './parseError.ts';

export { SCHEMA_VERSION };

/**
 * Fills in fields added additively *within* a schema version — the rule's **first clause** above.
 *
 * §8.1's `datePrecision` is the first of these and is still the only one. Absent values are
 * supplied; present values are never touched — validating them is `fromJSON`'s job and
 * duplicating it here would give the rule two homes.
 */
function withDefaults(doc: Record<string, unknown>): unknown {
  if (doc.datePrecision !== undefined) return doc;
  return { ...doc, datePrecision: 'exact' };
}

/**
 * **v1 → v2** (§10.3, A-57 Part 5): the document gains `photos`.
 *
 * The rule's third clause, first case. `photos` **is records**, and §8.5's sentence — *"an older
 * client would silently drop records it does not understand"* — is the exact harm: an old build
 * opening a v2 document and saving it deletes the user's photo attachments *and* orphans megabytes
 * of bytes it cannot see. So the version moves, an older build refuses loudly, and this supplies
 * the field.
 *
 * A v1 document that somehow already carries `photos` keeps it: supplying a value over one that
 * exists is the class of repair `withDefaults` is careful not to do either.
 */
function v1ToV2(doc: Record<string, unknown>): Record<string, unknown> {
  return { ...doc, photos: Array.isArray(doc.photos) ? doc.photos : [], schemaVersion: 2 };
}

/**
 * **v2 → v3** (§8.3, A-72): the document gains `participants`.
 *
 * The rule's third clause, second case — and the one that made the clause explicit, because I-9
 * shipped the field with no bump at all (**KD-96**). `participants` **is records**, so an older
 * build that opened such a document would drop them by name and write the trip back without them
 * on the next save. Unlike photos', that channel has no `DB_VERSION` in front of it: participants
 * live inside the document blob and add no object store, so nothing but this number stands between
 * an older build and the user's people (A-72 Part 2).
 *
 * In `v1ToV2`'s exact shape, including its clause: a document that somehow already carries
 * `participants` keeps them.
 */
function v2ToV3(doc: Record<string, unknown>): Record<string, unknown> {
  return {
    ...doc,
    participants: Array.isArray(doc.participants) ? doc.participants : [],
    schemaVersion: 3,
  };
}

/**
 * **The ladder** (A-72 Part 5 item 3), keyed by the version each step upgrades **from**. Every
 * entry raises `schemaVersion` by exactly one, so a v1 document walks the whole table and arrives
 * at `SCHEMA_VERSION` rather than stopping at 2.
 *
 * It is a table and not a second `if` on purpose: the two bumps this design has taken were three
 * increments apart, and the next one must not depend on anyone remembering to re-chain the one
 * before it. **Adding a version means adding a row here and nothing else.**
 */
const UPGRADES = new Map<number, (doc: Record<string, unknown>) => Record<string, unknown>>([
  [1, v1ToV2],
  [2, v2ToV3],
]);

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
  if (typeof v !== 'number') {
    throw new TripParseError(`missing schemaVersion`, '$.schemaVersion');
  }
  if (v > SCHEMA_VERSION) {
    throw new TripParseError(
      `document is schemaVersion ${v}; this build reads up to ${SCHEMA_VERSION}. Update the app.`,
      '$.schemaVersion',
    );
  }
  // Climb. `at` is where the document currently stands; the loop stops the moment the table has
  // no rung, and the check below turns that — and any version that is not a rung at all, `0`,
  // `1.5`, `NaN` — into the one refusal that names the **original** version the document claimed
  // rather than an intermediate one it was carried to.
  let cur = raw;
  let at = v;
  while (at < SCHEMA_VERSION) {
    const step = UPGRADES.get(at);
    if (step === undefined) break;
    cur = step(cur);
    at += 1;
  }
  if (at !== SCHEMA_VERSION) {
    throw new TripParseError(`no migration path from schemaVersion ${v}`, '$.schemaVersion');
  }
  return withDefaults(cur);
}
