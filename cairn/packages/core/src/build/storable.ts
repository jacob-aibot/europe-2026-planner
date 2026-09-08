/**
 * §2.1 **A-76** — *a build door asks the parser what a record may hold; it does not keep a second
 * opinion.* (Revision 57, QA **R54-1**; ROADMAP **I-15**.)
 *
 * **The defect this closes.** Round 54's breaker drove eight build doors through the real store and
 * measured the same harm at each: a door accepts a value `serialize/fromJSON.ts` refuses, `toJSON`
 * serialises it, `persistence.status` goes to `'idle'` — the state the UI renders as **Saved** —
 * and the stored bytes can never be parsed again. `closeTrip` then `openTrip` refuses the **whole
 * document**; everything the user did before that edit is unreachable except through §2.9 A-46's
 * rescue export, which hands back bytes the app cannot read.
 *
 * **Why one function and not eight guards.** A-76 Part 2 refuses the enumeration in writing, and
 * the enumeration was already wrong: the census named eight fields, and the architect found two
 * more while writing the ruling (`setTripMeta`'s `patch.cities[].centre`, and the `StopPlacement`
 * *argument* to `addStop`/`moveStop`). §4.2 **A-69** ruled that class here already — *"enumerating
 * harder is not the answer; the enumeration was never the reliable part."* So the door hands the
 * record it just wrote to the **same per-record parse function `fromJSON` uses for that record
 * class**. It is O(record) rather than O(document), it holds no member list of its own, and it
 * cannot drift from the parser because it **is** the parser.
 *
 * > **Agreement with the parser is the invariant, not strictness** (Part 8 residue 1). If
 * > `fromJSON` is ever loosened for a field, every door loosens with it, silently. That is the
 * > mechanism working as specified — these doors are not a second validator and must not become
 * > one — and it is why a door that wants to be *stricter* than the parser keeps its own guard
 * > (`build/photos.ts`'s `assertBuiltAttach`, the one legitimate case).
 *
 * **It parses the in-memory record directly**, not `JSON.parse(JSON.stringify(toJSON(record)))`.
 * `toJSON`'s per-record writers are `omitUndef` plus a copy-by-name, and the parser is
 * `undefined`-tolerant at exactly the optional fields `toJSON` omits, so the two agree field for
 * field. The direct parse is *stricter* in the one place it differs, and in the right direction:
 * `{ displayName: undefined }` — which type-checks, because `cairn/tsconfig.json` has no
 * `exactOptionalPropertyTypes` — is refused here, which is QA **R52-2**'s defect closed for every
 * required field of every record class at once rather than for one. Part 8 residue 2 states the
 * trigger at which that stops being true: the first field `toJSON` transforms on the way out, at
 * which point this function parses the written form instead, and **no door changes**.
 *
 * **Module-internal. NOT on §2.10's surface** — exactly as `build/stops.ts`'s `reindex` is.
 *
 * Import direction is `build/ → serialize/` and it does not cycle: `fromJSON.ts` imports only
 * `model/*`, `serialize/parseError.ts` and `serialize/migrate.ts`. If a cycle ever appears, the fix
 * is to move the seven parsers into `serialize/parseRecords.ts` and have both files import it —
 * **not** to copy a parser into `build/`.
 */
import type {
  Booking, City, ConflictResolution, Day, Participant, PhotoAsset, Place, Stop,
} from '../model/types.ts';
import {
  parseBooking, parseCity, parseDay, parseParticipant, parsePhoto, parsePlace, parseResolution,
  parseStop,
} from '../serialize/fromJSON.ts';
import { TripParseError } from '../serialize/parseError.ts';

/**
 * The record classes a build door can write. One arm per exported parser; adding a **ninth**
 * record class to `Trip` adds an arm here and a collection to `build/commit.ts`'s walk.
 *
 * **`resolution` is the eighth, and it is why A-77 exists** (Part 3 rule 8). A-76's map had seven
 * arms and its census read `packages/core/src/build/*.ts`, so `conflict/resolve.ts`'s
 * `resolveConflict` — a door in another directory, writing an eighth record class — was invisible
 * to both. That is the case a table could not have found, and the reason the table is deleted.
 */
type StorableMap = {
  stop: Stop;
  day: Day;
  city: City;
  place: Place;
  booking: Booking;
  photo: PhotoAsset;
  participant: Participant;
  resolution: ConflictResolution;
};

export type StorableKind = keyof StorableMap;
export type StorableOf<K extends StorableKind> = StorableMap[K];

/**
 * `kind` → `fromJSON`'s own parser for that record class. This map is the *only* thing in `build/`
 * that knows a record class exists; nothing here knows a **field** exists, which is the whole
 * point — A-76 Part 2 option 2 (one shared `field → allowed values` table) was refused precisely
 * because it re-declares in `build/` what `fromJSON` already declares.
 */
const PARSERS: { [K in StorableKind]: (v: unknown, path: string) => StorableMap[K] } = {
  stop: parseStop,
  day: parseDay,
  city: parseCity,
  place: parsePlace,
  booking: parseBooking,
  photo: parsePhoto,
  participant: parseParticipant,
  resolution: parseResolution,
};

/**
 * The refusal, built once — shared by `assertStorable` below and by `build/commit.ts`'s
 * unconditional envelope parse, which asks `parseTripEnvelope` rather than a per-record parser and
 * would otherwise carry a second copy of this sentence.
 *
 * It is a **plain** `Error`, always, and never a `TripParseError`. That distinction is A-76 Part
 * 3's one hard prohibition and it is not cosmetic: `TripParseError` means *this stored document is
 * unopenable* to `store.ts` and to §2.9 **A-47**'s `noteOpenFailure`, so raising one from a build
 * door would put a live, healthy document into the unreadable-row path and would be a lie about
 * where the value came from. This is a problem caught **before** anything is stored. A plain
 * `Error` is §2.1's programmer-error channel.
 */
export function storableRefusal(where: string, noun: string, err: TripParseError, locator: string): Error {
  return new Error(
    `${where}: this ${noun} cannot be stored — ${err.message}. ` +
      `Saving it would produce a document that cannot be re-opened. (${locator})`,
  );
}

/**
 * Parses `record` with `fromJSON`'s own parser for its class and **returns what the parser
 * built** — refusing, with the door's name, anything this system could not store and read back.
 * Pure.
 *
 * **It returns rather than asserting, and that is §2.1 A-77 Part 3 rule 5 — QA R55-5.** A void
 * assertion validates one object and then lets the door commit *the caller's* object, so a getter
 * that flips on its second read, or a caller that mutates the object it passed in after the door
 * returned, still lands an unopenable record in the document. Every parser in `fromJSON` rebuilds
 * its record field by field, by name and by value, all the way down (`parseOpeningHours`
 * included), so the value that was **read** is the value that is **stored** — and
 * `build/commit.ts` substitutes it. `Trip.meta` and `City.meta` are the one exception and A-77
 * Part 10 residue 2 states it: `obj()` returns the bag it was given.
 *
 * `build/commit.ts` is its **only** caller. A door does not call it directly any more — a door
 * that names the record class it wrote is the enumeration A-77 deletes.
 *
 * @param where the calling build function's name, so the refusal names the door that raised it
 *              rather than a function the caller never called.
 * @param kind  the record class, which selects `fromJSON`'s parser for it.
 * @param record the record the door has just built, checked **before the door commits it**.
 * @param locator where in the produced document the record sits (`days[3].stops[0]`), appended to
 *              the message in parentheses. The parser is still called at `'$'`, so `$.category`
 *              and every other existing message pin survives unchanged; the locator is the second
 *              fact `commit` has and a door did not — *which* of the records it wrote is bad.
 *
 * @throws {Error} — a **plain** `Error`, never a `TripParseError`; see `storableRefusal`.
 */
export function assertStorable<K extends StorableKind>(
  where: string,
  kind: K,
  record: StorableOf<K>,
  locator: string,
): StorableOf<K> {
  try {
    // Rooted at the record — the path in the message is `$.category`, not `$.days[3].stops[7]
    // .category`, because the record's own path is what the door's reader needs and the position
    // in the document is the locator's job.
    return PARSERS[kind](record, '$') as StorableOf<K>;
  } catch (err) {
    // Anything that is not the parser's own refusal is someone else's bug and travels untouched:
    // a getter that throws, a `RangeError` from a cyclic structure (A-76 Part 8 residue 3).
    if (!(err instanceof TripParseError)) throw err;
    throw storableRefusal(where, kind, err, locator);
  }
}
