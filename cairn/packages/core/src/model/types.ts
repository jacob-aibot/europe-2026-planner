/**
 * The domain model of ARCHITECTURE §2.2. Types only — no runtime code, no dependencies.
 *
 * Everything here is immutable by convention: build functions return new objects and
 * never mutate their input.
 */
import type {
  BookingId, CityKey, ClockTime, ConflictId, Currency, DayId, IsoDate,
  PlaceId, RuleId, StopId, TripId, UserId,
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
 * The legacy `move` field carried two different meanings and always has: on Aug 8 "Condor
 * DE4345 → Vienna" sits at 14:30 with `move:{flight, 80}` — 14:30 is when the aircraft
 * LEAVES Frankfurt and 80 minutes is the flight, not the walk to the gate. Every rule that
 * reasoned about time inherited the ambiguity.
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
  | 'pool_stop_has_day' | 'scheduled_stop_has_no_day' | 'booking_ref_orphan'
  | 'cost_basis_mixed' | 'provenance_missing' | 'accepted_without_timestamp' | 'owner_missing'
  | 'origin_stripped' | 'stale_resolutions' | 'invalid_calendar_date';

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

export const SCHEMA_VERSION = 1;

export type TripMeta = {
  /** Pool section headings, carried over from `OPTIONAL[city].title/note`. */
  poolNotes?: Record<CityKey, { title: string; note: string }>;
  sourceHash?: string;
  [k: string]: unknown;
};

export type Trip = {
  id: TripId;
  title: string;
  ownerId: UserId;
  startDate: IsoDate;
  endDate: IsoDate;
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
  revision: number;
  schemaVersion: 1;
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
