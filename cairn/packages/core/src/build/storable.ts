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
import type { Booking, City, Day, Participant, PhotoAsset, Place, Stop } from '../model/types.ts';
import {
  parseBooking, parseCity, parseDay, parseParticipant, parsePhoto, parsePlace, parseStop,
} from '../serialize/fromJSON.ts';
import { TripParseError } from '../serialize/parseError.ts';

/**
 * The record classes a build door can write. One arm per exported parser; adding an eighth record
 * class to `Trip` adds an arm here and a row to A-76 Part 5's table, and `test/storable.test.ts`'s
 * directory census is what makes forgetting the second one visible.
 */
type StorableMap = {
  stop: Stop;
  day: Day;
  city: City;
  place: Place;
  booking: Booking;
  photo: PhotoAsset;
  participant: Participant;
};

export type StorableKind = keyof StorableMap;
export type StorableOf<K extends StorableKind> = StorableMap[K];

/**
 * `kind` → `fromJSON`'s own parser for that record class. This map is the *only* thing in `build/`
 * that knows a record class exists; nothing here knows a **field** exists, which is the whole
 * point — A-76 Part 2 option 2 (one shared `field → allowed values` table) was refused precisely
 * because it re-declares in `build/` what `fromJSON` already declares.
 */
const PARSERS: { [K in StorableKind]: (v: unknown, path: string) => unknown } = {
  stop: parseStop,
  day: parseDay,
  city: parseCity,
  place: parsePlace,
  booking: parseBooking,
  photo: parsePhoto,
  participant: parseParticipant,
};

/**
 * Asserts that `record` is something this system could store and read back. Pure.
 *
 * @param where the calling build function's name, so the refusal names the door that raised it
 *              rather than a function the caller never called.
 * @param kind  the record class, which selects `fromJSON`'s parser for it.
 * @param record the record the door has just built, checked **before the door commits it**.
 *
 * @throws {Error} — a **plain** `Error`, always, and never a `TripParseError`. That distinction is
 *   A-76 Part 3's one hard prohibition and it is not cosmetic: `TripParseError` means *this stored
 *   document is unopenable* to `store.ts` and to §2.9 **A-47**'s `noteOpenFailure`, so raising one
 *   from a build door would put a live, healthy document into the unreadable-row path and would be
 *   a lie about where the value came from. This is a problem caught **before** anything is stored.
 *   A plain `Error` is §2.1's programmer-error channel and is what every other door guard throws.
 */
export function assertStorable<K extends StorableKind>(where: string, kind: K, record: StorableOf<K>): void {
  try {
    // Rooted at the record — the path in the message is `$.category`, not `$.days[3].stops[7]
    // .category`, because the door knows which record it just wrote and the index would be a
    // second, guessed fact about a document that does not exist yet.
    PARSERS[kind](record, '$');
  } catch (err) {
    // Anything that is not the parser's own refusal is someone else's bug and travels untouched:
    // a getter that throws, a `RangeError` from a cyclic structure (Part 8 residue 3).
    if (!(err instanceof TripParseError)) throw err;
    throw new Error(
      `${where}: this ${kind} cannot be stored — ${err.message}. ` +
        'Saving it would produce a document that cannot be re-opened.',
    );
  }
}
