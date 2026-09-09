/**
 * Document migration.
 *
 * **There are five schema versions since ROADMAP I-22a (§8.4, A-84 Part 8).** `migrateDoc` is a
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
 * `participants` is decided by clause 3 without an argument, **`City.centre: LatLng | null` is
 * decided by clause 2** (§8.4 A-83 Part 8 — a widening of an existing field's value domain, and
 * `City.placeId` rides along in the same bump because it would not have earned one alone),
 * **`City.pick` replacing `City.placeId` is decided by neither clause and by A-84 Part 8 instead
 * — it is a TYPE CHANGE, so the *"new scalar with a total default"* arm does not apply** — and
 * the next one is decided by a builder rather than by a ruling. **A mechanism used when someone remembers to argue for it is
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
 * What a rung **converted**, as opposed to what it merely supplied.
 *
 * `v1ToV2` and `v2ToV3` supply an absent array and change nothing that was there; there is
 * nothing for them to count. The 3 → 4 rung is the first that **rewrites a stored value**, and
 * ROADMAP I-22 requires the number to be reported rather than inferred — a conversion nobody
 * counted is a conversion nobody can check against the document it ran on.
 */
export type MigrationReport = {
  /**
   * How many `cities[].centre` values were exactly `{lat: 0, lng: 0}` and became `null`
   * (§8.4 A-83 Part 8). Zero for a document that carried none, which is what makes it a
   * measurement and not a flag.
   */
  nulledOriginCentres: number;
  /**
   * How many non-null `cities[].placeId` values the 4 → 5 rung **discarded** (§8.4 **A-84**
   * Part 8). Rounds 60 and 61 both walked the callers and **no product surface has ever written
   * a non-null `placeId`**, so this is zero on every document that exists — and the criterion
   * that asserts it is zero over every committed fixture is what makes A-84 Part 7 item 3's rule
   * (*"a rung that rewrites or discards a value a person typed or picked owes the user a record;
   * a rung that deletes a fabrication does not"*) checkable rather than assumed.
   */
  droppedPlaceIds: number;
};

/**
 * A ladder step. It is handed the document and the run's tally; only the rung that converts
 * something writes to the tally, and the tally is allocated fresh per `migrateDocWithReport`
 * call, so this module holds no state between calls and the function stays pure in the sense
 * §2.1 means: same input, same output, no ambient anything.
 */
type Rung = (doc: Record<string, unknown>, tally: MigrationReport) => Record<string, unknown>;

/**
 * `{lat: 0, lng: 0}` — exactly those two values, and **not near** them.
 *
 * **QA R61-8: it ACCEPTS `{lat: 0, lng: 0, alt: 5}`, and the old docstring's *"not `{0,0,extra}`"*
 * was false.** The behaviour is right and the sentence was wrong, so the sentence moved. The rung
 * exists to delete a fabrication `createTrip` used to write, and it is keyed on the two fields
 * that fabrication consists of; an extra key beside them does not make the point a measurement,
 * and `parseCentre` rebuilds a coordinate from `lat`/`lng` alone anyway, so the extra key was
 * never going to survive the parser that runs immediately after this.
 */
function isOrigin(v: unknown): boolean {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return o.lat === 0 && o.lng === 0;
}

/**
 * **v3 → v4** (§8.4 **A-83** Part 8, ROADMAP I-22): `City.centre` widens to `LatLng | null` and
 * `City.placeId` arrives.
 *
 * **QA R61-9, recorded rather than fixed: a document already stamped `4` that carries a `{0, 0}`
 * centre is NOT swept.** The ladder only climbs — `migrateDocWithReport` enters at the version
 * the document claims and runs the rungs above it — so this rung never sees such a document. That
 * is the ladder's design and not an oversight: a rung that also ran *below* its own floor would
 * be a repair pass, and a repair pass has no version at which it stops.
 *
 * The rule's **second** clause — a widening of an existing field's value domain — and this rung
 * is a **ruling, not a convenience**:
 *
 *   - a stored `centre` **exactly equal to `{lat: 0, lng: 0}` becomes `null``;
 *   - **every other value passes through untouched**, including a malformed one, because
 *     repairing a value the parser is about to refuse would hide the refusal;
 *   - `placeId` is filled with `null`, and a document that somehow already carries one keeps it
 *     — `v1ToV2`'s clause, one field over.
 *
 * **Stated plainly because it will be questioned: this also nulls a city genuinely at 0°N 0°E.**
 * There is no land there — the point is in the Gulf of Guinea — and the alternative is carrying
 * a fabrication forever. A-82 Part 7: `{0,0}` is *"a value nobody measured, wearing the shape of
 * one"*, and it is exactly what `createTrip` wrote for every city typed into a form.
 *
 * The rung **counts** what it converted, into the run's tally, and `migrateDocWithReport`
 * returns it.
 *
 * **What it does NOT count, and why that is not an omission — §8.4 A-85 Part 5 (QA R62-5).** A
 * hand-written v3 city at `{0, 0}` that also carries a `pick` (an unknown key riding the spread
 * above) arrives at v5 with `centre: null`, the pick kept and inert, and only the centre counted.
 * A-84 Part 7 item 3's rule — *"a rung that rewrites or discards a value a person picked owes the
 * user a record"* — does not fire, by measurement: either `pick.centre` is not `{0, 0}`, in which
 * case the pick was already stale at v3 and this rung invalidated nothing, or it is `{0, 0}`, in
 * which case the pick cannot have come from `cityPickFromRow` — **no shipped gazetteer row lies
 * within a whole degree of the origin** (nearest: São Tomé `0.3334, 6.7333`, Port-Gentil
 * `-0.72, 8.78`), so it is a fabricated record in a hand-written document, which is A-83 Part 8's
 * *"provenance, not authentication"* boundary and not this rung's business. **What reopens it:**
 * a shipped row at the origin, or the first rung that can discard a pick whose liveness is not
 * decidable from the corpus.
 */
function v3ToV4(doc: Record<string, unknown>, tally: MigrationReport): Record<string, unknown> {
  const cities = Array.isArray(doc.cities) ? doc.cities : null;
  if (cities === null) return { ...doc, schemaVersion: 4 };
  const next = cities.map((c) => {
    if (typeof c !== 'object' || c === null || Array.isArray(c)) return c;
    const city = c as Record<string, unknown>;
    const nulled = isOrigin(city.centre);
    if (nulled) tally.nulledOriginCentres += 1;
    return {
      ...city,
      ...(nulled ? { centre: null } : {}),
      placeId: city.placeId === undefined ? null : city.placeId,
    };
  });
  return { ...doc, cities: next, schemaVersion: 4 };
}

/**
 * **v4 → v5** (§8.4 **A-84** Part 8, ROADMAP I-22a): `City.placeId: string | null` becomes
 * `City.pick: CityPick | null`.
 *
 * A **type change**, so A-72's *"a new scalar with a total default"* arm does not apply and the
 * version moves. The rung **drops `placeId`, writes `pick: null`, and counts what it dropped**.
 *
 * **It may NOT promote, and this is a ruling rather than a simplification.** Composing
 * `{rowId: placeId, centre: city.centre, countryCode: city.countryCode}` would mint a *verified*
 * record out of exactly the three unverified fields A-84 exists to stop being read as one — the
 * pair the shipped code composed and QA R61-1 measured — and would therefore **re-create R61-1
 * inside the migration**, where no parser and no derive rule can see it. So the rung discards
 * rather than promotes, and the discarded count is published: rounds 60 and 61 both walked the
 * callers and no product surface has ever written a non-null `placeId`, so on every document that
 * exists the count is **zero**, and the criterion that asserts so is what makes that claim
 * checkable.
 *
 * A document that somehow already carries a `pick` keeps it — `v1ToV2`'s clause, one field over.
 */
function v4ToV5(doc: Record<string, unknown>, tally: MigrationReport): Record<string, unknown> {
  const cities = Array.isArray(doc.cities) ? doc.cities : null;
  if (cities === null) return { ...doc, schemaVersion: 5 };
  const next = cities.map((c) => {
    if (typeof c !== 'object' || c === null || Array.isArray(c)) return c;
    const { placeId, ...rest } = c as Record<string, unknown>;
    if (placeId !== null && placeId !== undefined) tally.droppedPlaceIds += 1;
    return { ...rest, pick: rest.pick === undefined ? null : rest.pick };
  });
  return { ...doc, cities: next, schemaVersion: 5 };
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
const UPGRADES = new Map<number, Rung>([
  [1, v1ToV2],
  [2, v2ToV3],
  [3, v3ToV4],
  [4, v4ToV5],
]);

/**
 * Upgrades a raw document to the current schema version **and reports what the ladder
 * converted**. Pure.
 *
 * **Not on §2.10's export surface, deliberately** (ROADMAP I-22a keeps the count at 88 — the one
 * symbol it adds is `cityPickFromRow`, not this). A
 * caller that needs a `Trip` calls `fromJSON`; a caller that needs the number reaches this by
 * module path, which is what `packages/core/test/nullCentre.test.ts` does.
 *
 * @throws {TripParseError} for a version this build cannot read.
 */
export function migrateDocWithReport(doc: unknown): { doc: unknown; report: MigrationReport } {
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
  const report: MigrationReport = { nulledOriginCentres: 0, droppedPlaceIds: 0 };
  while (at < SCHEMA_VERSION) {
    const step = UPGRADES.get(at);
    if (step === undefined) break;
    cur = step(cur, report);
    at += 1;
  }
  if (at !== SCHEMA_VERSION) {
    throw new TripParseError(`no migration path from schemaVersion ${v}`, '$.schemaVersion');
  }
  return { doc: withDefaults(cur), report };
}

/**
 * Upgrades a raw document to the current schema version. Pure.
 *
 * `migrateDocWithReport(doc).doc`, and the signature is unchanged on purpose: it is the one
 * every production caller uses, and a migration's bookkeeping is not a parser's business.
 *
 * @throws {TripParseError} for a version this build cannot read.
 */
export function migrateDoc(doc: unknown): unknown {
  return migrateDocWithReport(doc).doc;
}
