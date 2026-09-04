/**
 * The domain model of ARCHITECTURE §2.2. Types only — no runtime code, no dependencies.
 *
 * Everything here is immutable by convention: build functions return new objects and
 * never mutate their input.
 */
import type {
  BookingId, CityKey, ClockTime, ConflictId, Currency, DayId, IsoDate,
  ParticipantId, PhotoId, PlaceId, RuleId, StopId, TripId, UserId,
} from './ids.ts';

export type LatLng = { lat: number; lng: number };

export type StopCategory = 'sight' | 'food' | 'night' | 'trip' | 'transit' | 'stay' | 'suggest';

export type TravelMode =
  | 'walk' | 'transit' | 'metro' | 'taxi' | 'bus' | 'coach' | 'boat'
  | 'speedboat' | 'flight' | 'train' | 'funicular' | 'bike';

export type Link = { label: string; href: string };

// ---------------------------------------------------------------- money (§2.6)

export type MoneyBasis = 'per_person' | 'per_party';

export type Money = { lo: number; hi: number; currency: Currency; basis: MoneyBasis };

export type CostEstimate = {
  /** May hold several products — "gardens free · palace €15–24" is two entries. */
  amounts: Money[];
  /** The legacy display string, preserved verbatim. UIs show this; core computes from `amounts`. */
  display: string | null;
  note?: string;
};

// ------------------------------------------------------------ provenance (§2.8)

export type ProvenanceSource = 'user' | 'email' | 'friend' | 'system';
export type ProvenanceState = 'candidate' | 'accepted' | 'rejected';
export type ProvenanceConfidence = 'confirmed' | 'asserted' | 'inferred';

export type Provenance = {
  source: ProvenanceSource;
  state: ProvenanceState;
  confidence: ProvenanceConfidence;
  origin?: {
    mailAccountId?: string;
    messageId?: string;
    friendUserId?: UserId;
    sourceTripId?: TripId;
    sourceStopId?: StopId;
    ruleId?: string;
  };
  addedAt: IsoDate;
  acceptedAt: IsoDate | null;
  actorUserId: UserId | null;
};

// --------------------------------------------------------------- photos (§10)

/** §10.1. One stored derivative's shape and weight. Never the original — §10.4. */
export type PhotoDerivative = {
  /** Pixel dimensions of THIS derivative, after downscale and after orientation is baked in. */
  w: number;
  h: number;
  /** Byte length of the stored encoding. Carried so a surface can budget without a read. */
  bytes: number;
};

/**
 * §8.6: exactly one trip, and at most one of a stop, a day or a place. `'trip'` is the
 * "somewhere on this trip, I do not know where" case and is a real answer, not a default.
 *
 * `'place'` is permitted by §8.6 and is NOT built in the first increment — A-57 Part 3: the
 * moment `Place` gains a second referent kind, §2.13 **A-6a**'s single-row prune must become a
 * reference-counted delete with a user-visible affordance, and that is its own ruling with its
 * own tests. The union carries the arm so adding it is a build change and not a schema one;
 * `build/photos.ts` refuses it until that pass lands.
 *
 * Named, rather than inlined on `PhotoAsset`, because §10.6's `photosFor(state, ref)` takes one
 * and a second spelling of the same union is how two readers come to disagree.
 */
export type PhotoAttachRef =
  | { kind: 'trip' }
  | { kind: 'day'; dayId: DayId }
  | { kind: 'stop'; stopId: StopId }
  | { kind: 'place'; placeId: PlaceId };

/**
 * §10.1. **The record lives in the document; the bytes never do** — `Trip.photos` is metadata,
 * a few hundred bytes per photo, so it rides the existing autosave, the existing undo history,
 * the existing export and the existing §2.2a write fence. The derivatives live in object stores
 * of their own (§10.3).
 *
 * **There is no `status` field**, and that is point 4 of §10.1 rather than an oversight:
 * liveness is not a document fact. §2.9 **A-47** already ruled this shape once for
 * `openFailures` — *"the fact is written when a real open fails, and it is an observation, not
 * a record."* Import progress, decode failure and missing bytes are session-scoped or derived,
 * and §10.6's three selectors are where they live.
 */
export type PhotoAsset = {
  id: PhotoId;
  attach: PhotoAttachRef;
  /**
   * What the user typed. Free text, and therefore subject to §6.6's redactor on every path
   * that crosses a boundary — exactly as `Stop.note` is (§2.14 A-15/A-18).
   */
  caption: string;
  /**
   * When the photograph was taken, as the photograph says. **Local wall-clock, no zone** —
   * which is what EXIF `DateTimeOriginal` actually is, and already core's model for every other
   * time (§2.1). `null` when the file carried no usable date, which on iOS Safari is the common
   * case (§10.2, A-58 Part 2).
   *
   * This is NOT "when it was imported" and there is deliberately no field for that: an import
   * timestamp is a fact about our software, and §0.6's subject is exactly that class of second
   * fact.
   */
  capturedAt: { date: IsoDate; time: ClockTime } | null;
  /**
   * Where the photograph says it was taken. `null` when absent, refused, or stripped by the
   * platform before we ever saw the bytes. **Never inferred** — not from the stop it is attached
   * to, not from the day's cities, not from anything. A photo whose coordinate we guessed is a
   * photo that will one day contradict the trace §8.5 records.
   */
  at: LatLng | null;
  /**
   * How `at` and `capturedAt` were obtained. `'exif'` — read out of the file. `'user'` — the
   * person typed or corrected it. `null` — there is nothing to say because both are null.
   * Nothing may *gate* on this, for §8.4 A-29's reason about `countrySource`.
   */
  metaSource: 'exif' | 'user' | null;
  /** The source file's own pixel dimensions, before any downscale. `null` if undecodable. */
  source: { w: number; h: number } | null;
  /** §10.4. Both are minted at import and both are stored. Neither is ever the original. */
  thumb: PhotoDerivative;
  display: PhotoDerivative;
  /**
   * §2.8, in full, exactly as `Stop`, `Day` and `Booking` carry it. A-57 Part 4: Phase 6's
   * suggestion queue needs the candidate state, and retrofitting provenance onto a record class
   * after a user has five hundred of them is the migration this project has refused four times.
   */
  provenance: Provenance;
};

// --------------------------------------------------------- participants (§8.3)

/**
 * §8.3. `'self'` is the trip owner appearing in their own participant list; everyone else is a
 * `'contact'`. Two members, and there is deliberately no `'friend'`: a social relationship is a
 * `Connection` (§8.7) and is a different edge entirely.
 */
export type ParticipantKind = 'self' | 'contact';

/** The two legal values, in one place, so the parser and the builder cannot disagree. */
export const PARTICIPANT_KINDS: readonly ParticipantKind[] = ['self', 'contact'];

/**
 * §8.3 — *"principle 3's first entity, shipped before there is anything to grant"*.
 *
 * **Participation grants nothing. Not a read, not a comment, not a coordinate.** A participant
 * is a statement about *who was on the trip*. Access is `TripMember`/`TripShare`, visibility of
 * a location trace is `LocationShare`, a social relationship is `Connection` — five edges
 * (§8.7) that may never be collapsed into one another. This ships now **precisely because**
 * there is nothing to grant yet: the separation is free today and is a migration the day it is
 * not. Nothing in `access/predicates.ts` reads this type, and nothing may: `Relationship`
 * carries no participant field, which is the structural form of that sentence.
 */
export type Participant = {
  id: ParticipantId;
  /**
   * A person's only identity here, and therefore the field `participant_name_empty` (§2.9,
   * §8.3) protects: *a participant with no name renders as a ghost row and can never be
   * re-identified.* Emptiness is the rule — a name in any script, including one that is only an
   * emoji, is a name.
   */
  displayName: string;
  kind: ParticipantKind;
  /**
   * §8.3: `null` *"until that person has an account AND the user links them"*. There are no
   * accounts before Phase 3, so **every participant this build writes carries `null`, and that
   * is correct rather than a gap** — `addParticipant` does not read a supplied one and
   * `updateParticipant` refuses the key. The field is carried and round-trips so that linking
   * an account is a build change and not a schema migration, exactly as `PhotoAttachRef`'s
   * unbuilt `'place'` arm is (§10.1, A-57 Part 3).
   *
   * §8.3's *"cross-trip identity is therefore derived"*: a surface groups by this where it is
   * non-null and by a normalised `displayName` otherwise, **and says that is what it is doing**.
   */
  userId: UserId | null;
  note?: string;
};

// ---------------------------------------------------------------- trip (§2.2)

export type City = {
  key: CityKey;
  name: string;
  countryCode: string;
  centre: LatLng;
  order: number;
  meta?: { flagEmoji?: string; color?: string };
};

export type OpeningHours = {
  /** Simple weekly ranges only (§7). Index 0 = Sunday. Missing day = unknown, never a conflict. */
  weekly: Array<{ day: number; open: ClockTime; close: ClockTime } | null>;
  note?: string;
};

export type Place = {
  id: PlaceId;
  cityKey: CityKey;
  name: string;
  /**
   * `null` means the source had no coordinates. The live planner has exactly one such
   * entry ("Windsor Great Park / Long Walk") and it silently produces an undefined Leaflet
   * bound there; importing it honestly and letting `validateTrip` report it is the point.
   */
  at: LatLng | null;
  category: StopCategory;
  note?: string;
  links?: Link[];
  hours?: OpeningHours;
};

export type PlaceLink =
  | { kind: 'place'; placeId: PlaceId }
  | { kind: 'inline'; at: LatLng }
  | { kind: 'none' };

export type StopPlacement =
  | { kind: 'scheduled'; dayId: DayId; time: ClockTime | null; order: number }
  /**
   * `hint.order` is an addition to §2.2: without the index a stop cannot come back out of
   * the pool to the *position* it left from, which the roadmap requires to be lossless.
   */
  | { kind: 'pool'; cityKey: CityKey; hint?: { dayId: DayId; time: ClockTime; order?: number } };

export type MoveOverride = { mode: TravelMode; mins: number; label?: string };

/**
 * What `Stop.arrival` describes, and therefore what `placement.time` means (§2.12).
 *
 * The legacy `move` field carried two different meanings and always has: on Aug 8 the
 * Frankfurt→Vienna flight stop sits at 14:30 with `move:{flight, 80}` — 14:30 is when the
 * aircraft LEAVES Frankfurt and 80 minutes is the flight, not the walk to the gate. Every
 * rule that reasoned about time inherited the ambiguity.
 *
 * The real flight designator used to be written out here as the example, and a sourcemap
 * embeds `sourcesContent`, so it shipped in `apps/web/dist`. Illustrative values in this
 * repo's comments are invented (`XX0000`), never transcribed from the live planner —
 * BUILD-NOTES KD-27.
 *
 * Purely additive: `computeLegs` MUST NOT read it, which is what keeps `legacy-legs.json`
 * parity on all 16 days. Only conflict rules and the view layer read it.
 */
export type TravelRole =
  /** `arrival` is the journey INTO this stop; `time` is when you arrive. The default. */
  | 'transfer'
  /**
   * This stop IS a vehicle run: `arrival` is the vehicle's own journey, `time` is when it
   * DEPARTS, and the coordinate is one endpoint of that run — the model does not claim to
   * know which end.
   */
  | 'journey'
  /** Travel information is present and its role could not be established. Degrades rules. */
  | 'unknown';

export type StopFlag = 'free' | 'daytrip' | string;

export type Stop = {
  id: StopId;
  placement: StopPlacement;
  name: string;
  category: StopCategory;
  place: PlaceLink;
  note: string;
  cost: CostEstimate | null;
  /** Describes the leg INTO this stop (§2.5). */
  arrival: MoveOverride | null;
  /** What `arrival` and `placement.time` mean (§2.12). Default `'transfer'`. */
  travelRole: TravelRole;
  bookingId: BookingId | null;
  flags: StopFlag[];
  provenance: Provenance;
  /** null = unknown; never guessed. */
  durationMins: number | null;
  links?: Link[];
  ticket?: Ticket | null;
};

export type Day = {
  id: DayId;
  date: IsoDate;
  primaryCity: CityKey | 'transit';
  cities: CityKey[];
  title: string;
  subtitle: string;
  stops: Stop[];
  provenance: Provenance;
  legacyFlag?: boolean;
  /** Deferred (§7): nothing reads this yet. Present so adding timezones is not a migration. */
  tzId?: string;
};

export type Ticket =
  | { kind: 'bundled'; path: string; label: string }
  | { kind: 'url'; href: string; label: string; verifiedAt: IsoDate | null; verifiedBy: 'fetch' | 'user' | null }
  | { kind: 'attachment'; mailMessageId: string; filename: string; label: string };

export type BookingKind =
  | 'flight' | 'bus' | 'train' | 'ferry' | 'lodging' | 'tour' | 'ticket' | 'other';

export type Booking = {
  id: BookingId;
  tripId: TripId;
  kind: BookingKind;
  operator: string;
  reference: string | null;
  route?: { fromName: string; toName: string };
  startsAt: { date: IsoDate; time: ClockTime | null };
  endsAt?: { date: IsoDate; time: ClockTime | null };
  price: CostEstimate | null;
  party: number | null;
  seat?: string;
  status: 'active' | 'superseded' | 'cancelled';
  supersedesId?: BookingId;
  /** Free-form issue date, used by `superseded_booking` to order two versions. */
  issuedAt?: IsoDate;
  ticket: Ticket | null;
  provenance: Provenance;
  sourceDoc?: string;
};

// ------------------------------------------------------------ conflicts (§2.7)

export type RefKind = 'trip' | 'day' | 'stop' | 'place' | 'booking';
export type Ref = { kind: RefKind; id: string };

export type ConflictKind =
  | 'schedule' | 'booking' | 'reference' | 'geography' | 'coverage' | 'editorial';

export type ConflictSeverity = 'blocker' | 'warning' | 'note';

export type ConflictResolution = {
  conflictId: ConflictId;
  state: 'acknowledged' | 'accepted_booking' | 'accepted_plan' | 'dismissed';
  by: UserId;
  at: IsoDate;
  note?: string;
  /**
   * Set by `syncResolutions` when the conflict this answers stops existing (§2.7).
   *
   * Content-addressing alone lets a dismissed conflict come back still dismissed when the
   * data reverts to its old value — 19:30 → 20:30 → 19:30 restores the original id and the
   * original dismissal. A dismissed BLOCKER re-arming with no user action is exactly what
   * §2.7 exists to prevent. Retirement is one-way; nothing un-retires.
   */
  retiredAt: IsoDate | null;
};

export type Conflict = {
  id: ConflictId;
  kind: ConflictKind;
  ruleId: RuleId;
  severity: ConflictSeverity;
  subjects: Ref[];
  summary: string;
  params: Record<string, string | number>;
  detail?: string;
  resolution: ConflictResolution | null;
};

// ----------------------------------------------------------- validation (§2.9)

/**
 * §2.9. `stop_far_from_city` is DELETED, not renamed: coordinate distance is a conflict
 * (`geo_outlier` over `derive/geoCheck.ts`), not a structural validity problem.
 */
export type IssueCode =
  | 'days_not_dense' | 'day_id_mismatch' | 'duplicate_id' | 'primary_city_not_in_cities'
  | 'unknown_city_key' | 'place_ref_dangling' | 'lat_lng_out_of_range'
  | 'pool_stop_has_day' | 'pool_stop_unknown_city' | 'scheduled_stop_has_no_day' | 'booking_ref_orphan'
  | 'cost_basis_mixed' | 'provenance_missing' | 'accepted_without_timestamp' | 'owner_missing'
  | 'origin_stripped' | 'accepted_by_non_member' | 'stale_resolutions' | 'invalid_calendar_date'
  // §2.2 A-10 (revision 11, QA P2-2). A key that is minted is not thereby a key that is
  // trusted: all three arrive by import, by hand-edit, or from a build predating the ruling.
  | 'duplicate_city_key' | 'reserved_city_key' | 'city_name_empty'
  // §10.1 / A-57 Part 6. `photo_attach_dangling` is an ISSUE and **never a throw**: §10.3's
  // fallback-to-`trip` is the repair the *action* performs (`removeStop`, `ensureDays`), and
  // this reports the documents that never went through one — an import, a hand edit, a future
  // untyped writer. `photo_coords_out_of_range` is |lat| > 90 territory, exactly as
  // `lat_lng_out_of_range` is for a stop; it is a separate code because a photo's coordinate is
  // what the FILE said and a stop's is what the plan said, and a surface answers them
  // differently.
  | 'photo_attach_dangling' | 'photo_coords_out_of_range'
  // §8.3 / ROADMAP I-9. Both are ERRORS and both are reports rather than throws, for §2.9's
  // standing reason: a document already carrying one must **open**, so the user can see it and
  // act. `duplicate_participant_id` carries the third check too — *at most one `'self'`* —
  // because §8.3 says that check "rides on the first two's mechanism" and names no third code:
  // two rows both claiming to be the trip owner are two rows claiming one identity, which is
  // what this code already means. `participant_name_empty` is §8.3's own argument verbatim: a
  // participant with no name renders as a ghost row and can never be re-identified.
  | 'duplicate_participant_id' | 'participant_name_empty'
  // QA R15-2, **ratified by §2.14 A-20 (revision 15)** with its meaning narrowed: it means
  // *this in-memory document holds a `Place.hours` that `fromJSON` would refuse*. `parsePlace`
  // used to cast `hours` through unvalidated, so six shapes the parser accepted were not
  // `OpeningHours` at all; A-20 closed that, so the remaining population is a document built
  // past the type system — a cast, a future untyped writer, a native bridge. Not dead code:
  // `toJSON` re-emits such an `hours` faithfully and the export then fails to re-import at that
  // field, so without this the user learns their backup is unrestorable only at restore time.
  | 'place_hours_malformed';

export type Issue = {
  level: 'error' | 'warn';
  code: IssueCode;
  ref: Ref;
  message: string;
  params: Record<string, string | number>;
};

// --------------------------------------------------------------- derived (§2.5)

export type Leg = {
  mode: TravelMode;
  mins: number;
  km: number | null;
  source: 'override' | 'estimate';
  label?: string;
};

export type CostRollUp = {
  byCurrency: Record<Currency, { lo: number; hi: number }>;
  converted: { currency: Currency; lo: number; hi: number; rateSetId: string } | null;
  missingRates: Currency[];
  basisWarnings: string[];
};

export type DisplayStatus = 'own' | 'suggested' | 'candidate' | 'imported' | 'rejected';

// ------------------------------------------------------------------ the trip

/**
 * **2 → 3 at Phase 2 I-9a (§8.3, A-72).** The ledger, and the rule that decides it — which now
 * lives in `serialize/migrate.ts`'s docstring in three clauses, so the next record class needs no
 * ruling:
 *
 *   - **1** — Phase 1, and everything through I-12. `datePrecision` (§8.1) arrived inside it,
 *     because `migrate.ts`'s rule is that *"a field that is additive with a total default does
 *     not earn a bump — a bump is reserved for a value widening that an older client would
 *     silently drop."*
 *   - **2** — `Trip.photos`. `[]` is a total default, so the first half of that rule seems to
 *     apply and does not, on the second half's own words: §8.5's example earns a bump because
 *     an older client would *"silently drop records it does not understand"*, and `photos` **is
 *     records**. An old build opening a new document and saving it deletes the user's photo
 *     attachments *and* orphans megabytes of bytes it cannot see. `migrateDoc` gains a v1 → v2
 *     case supplying `photos: []`, and an older build refuses a v2 document loudly — which is
 *     the correct outcome and the one the existing *"Update the app."* message was written for.
 *   - **3** — `Trip.participants` (§8.3). The same decision, one record class later, and **A-72**
 *     is the ruling that generalises A-57 Part 5 rather than superseding it: an array of records
 *     on `TripDoc` **always** earns a bump. I-9 shipped the field without one (**KD-96**), which
 *     made the loss reachable and silent — a pre-I-9 build reads `schemaVersion: 2`, finds it
 *     equal to its own constant, takes `migrateDoc`'s pass-through exit, opens the document,
 *     drops the field it has never heard of, and writes the trip back without its people on the
 *     next save. Photos' equivalent channel was closed by `DB_VERSION` as well; participants add
 *     no object store, so **this constant is the only thing standing there**.
 */
export const SCHEMA_VERSION = 3;

export type TripMeta = {
  /** Pool section headings, carried over from `OPTIONAL[city].title/note`. */
  poolNotes?: Record<CityKey, { title: string; note: string }>;
  sourceHash?: string;
  [k: string]: unknown;
};

/**
 * How certain the user is about `startDate`/`endDate` (§8.1). **Display reads this and
 * nothing else** — no conflict rule, no derive and no validation may branch on it, and
 * `packages/core/test/datePrecision.test.ts` enforces that as a greppable ceiling.
 *
 * `startDate`/`endDate` remain **real calendar dates** whatever this says, so every existing
 * rule, derive and golden is untouched. *"Japan, March 2019"* is stored as
 * `2019-03-01 … 2019-03-31, datePrecision:'month'` — the range is honest, and this records
 * that the user did not claim the 1st and the 31st specifically.
 */
export type DatePrecision = 'exact' | 'month' | 'year';

/** The three legal values, in one place, so the parser and the builder cannot disagree. */
export const DATE_PRECISIONS: readonly DatePrecision[] = ['exact', 'month', 'year'];

export type Trip = {
  id: TripId;
  title: string;
  ownerId: UserId;
  startDate: IsoDate;
  endDate: IsoDate;
  /**
   * §8.1. Default `'exact'`; absent in any document written before Phase 2 I-2, which
   * `migrateDoc` supplies. Stored because it is not derivable, and because retrofitting date
   * fuzziness after a user has entered forty trips is the expensive migration.
   */
  datePrecision: DatePrecision;
  homeCurrency: Currency;
  /**
   * Where the trip starts and ends from (§2.13). Nullable. It is a `geoCheck` anchor — it
   * is why "Arrive LAX", 9,321 km from anything else in the Europe trip, is not an outlier
   * — and it is real modelling rather than a patch: a trip starts and ends somewhere.
   */
  homeBase: { name: string; at: LatLng } | null;
  party: { adults: number; children: number };
  cities: City[];
  days: Day[];
  pool: Stop[];
  places: Place[];
  bookings: Booking[];
  resolutions: ConflictResolution[];
  /**
   * §10. Ordered by the user; the order is the order. Empty for every trip that has none.
   *
   * Metadata only — the bytes are in `photos`/`photoThumbs` object stores of their own
   * (§10.3). Base64 in the document would put megabytes into a JSON string rewritten on every
   * keystroke's debounce, snapshotted fifty deep in history and handed whole to `exportDoc`.
   */
  photos: PhotoAsset[];
  /**
   * §8.3. Ordered by the user; the order is the order. **At most one `'self'`**, which
   * `validateTrip` reports rather than the build functions refusing — a document that arrives
   * with two must open. Empty for every trip that has none, which is most of them.
   *
   * **Embedded in the document, not a second persisted structure.** §8.3 is explicit that a
   * store-level people record is §2.7 **A-5**'s rejected option verbatim: it buys cross-trip
   * identity and costs a second storage record, its own place in the §6.3 cascade, its own
   * export/round-trip parity, its own migration and its own index that can drift from the
   * documents. Embedding gives round-trip parity, deletion and undo for free — undo because
   * history is a `Trip` snapshot (§4.2 rule 5) and this is part of the `Trip`.
   */
  participants: Participant[];
  revision: number;
  schemaVersion: 3;
  meta?: TripMeta;
};

/** Read-only context some derive/conflict functions need. */
export type TripCtx = {
  trip: Trip;
  /** `today()` for the rules that need a horizon. Optional — rules that need it skip without it. */
  today?: IsoDate;
};

/** The local-only owner sentinel used until accounts exist (§2.2). */
export const LOCAL_OWNER: UserId = 'local:self';
