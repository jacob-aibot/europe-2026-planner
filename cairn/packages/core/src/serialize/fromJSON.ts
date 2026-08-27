/**
 * Hand-rolled parsing and validation (ARCHITECTURE, ROADMAP "hard constraints": zero
 * runtime dependencies — no zod).
 *
 * Every failure carries the JSON path that caused it, because "invalid trip" with no path
 * is useless when a document has 112 stops.
 */
import type {
  Booking, City, CostEstimate, DatePrecision, Day, Money, Place, PlaceLink, Provenance, Stop,
  StopPlacement, Ticket, Trip, ConflictResolution,
} from '../model/types.ts';
import { DATE_PRECISIONS, SCHEMA_VERSION } from '../model/types.ts';

/** Thrown by `fromJSON` for any malformed document. Carries a JSON path. */
export class TripParseError extends Error {
  path: string;
  constructor(message: string, path: string) {
    super(`${message} (at ${path || '$'})`);
    this.name = 'TripParseError';
    this.path = path;
  }
}

type Obj = Record<string, unknown>;

function obj(v: unknown, path: string): Obj {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new TripParseError('expected an object', path);
  return v as Obj;
}
function arr(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) throw new TripParseError('expected an array', path);
  return v;
}
function str(v: unknown, path: string): string {
  if (typeof v !== 'string') throw new TripParseError('expected a string', path);
  return v;
}
function strOrNull(v: unknown, path: string): string | null {
  if (v === null || v === undefined) return null;
  return str(v, path);
}
function numOf(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new TripParseError('expected a finite number', path);
  return v;
}
function numOrNull(v: unknown, path: string): number | null {
  if (v === null || v === undefined) return null;
  return numOf(v, path);
}
function boolOpt(v: unknown, path: string): boolean | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'boolean') throw new TripParseError('expected a boolean', path);
  return v;
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[], path: string): T {
  const s = str(v, path);
  if (!(allowed as readonly string[]).includes(s)) {
    throw new TripParseError(`expected one of ${allowed.join('|')}, got ${JSON.stringify(s)}`, path);
  }
  return s as T;
}
/**
 * §8.1. Absent means a document written before Phase 2 I-2 — the default is `'exact'` and it
 * is total, so this can never fail on an older document. Anything else present is refused
 * with the JSON path, exactly as every other hand-validated field is.
 */
function datePrecision(v: unknown, path: string): DatePrecision {
  if (v === undefined) return 'exact';
  if (typeof v !== 'string' || !DATE_PRECISIONS.includes(v as DatePrecision)) {
    throw new TripParseError(`expected one of ${DATE_PRECISIONS.map((p) => JSON.stringify(p)).join(', ')}`, path);
  }
  return v as DatePrecision;
}
function isoDate(v: unknown, path: string): string {
  const s = str(v, path);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new TripParseError('expected YYYY-MM-DD', path);
  return s;
}
function clockOrNull(v: unknown, path: string): string | null {
  if (v === null || v === undefined) return null;
  const s = str(v, path);
  if (s !== '' && !/^\d{1,2}:\d{2}$/.test(s)) throw new TripParseError('expected HH:MM', path);
  return s;
}

const CATEGORIES = ['sight', 'food', 'night', 'trip', 'transit', 'stay', 'suggest'] as const;
const TRAVEL_ROLES = ['transfer', 'journey', 'unknown'] as const;
const MODES = ['walk', 'transit', 'metro', 'taxi', 'bus', 'coach', 'boat', 'speedboat', 'flight', 'train', 'funicular', 'bike'] as const;
const SOURCES = ['user', 'email', 'friend', 'system'] as const;
const STATES = ['candidate', 'accepted', 'rejected'] as const;
const CONFIDENCES = ['confirmed', 'asserted', 'inferred'] as const;
const BASES = ['per_person', 'per_party'] as const;
const BOOKING_KINDS = ['flight', 'bus', 'train', 'ferry', 'lodging', 'tour', 'ticket', 'other'] as const;
const BOOKING_STATUS = ['active', 'superseded', 'cancelled'] as const;
const RESOLUTION_STATES = ['acknowledged', 'accepted_booking', 'accepted_plan', 'dismissed'] as const;

function parseProvenance(v: unknown, path: string): Provenance {
  const o = obj(v, path);
  const origin = o.origin === undefined ? undefined : obj(o.origin, `${path}.origin`);
  return {
    source: oneOf(o.source, SOURCES, `${path}.source`),
    state: oneOf(o.state, STATES, `${path}.state`),
    confidence: oneOf(o.confidence, CONFIDENCES, `${path}.confidence`),
    ...(origin
      ? {
          origin: {
            ...(origin.mailAccountId !== undefined ? { mailAccountId: str(origin.mailAccountId, `${path}.origin.mailAccountId`) } : {}),
            ...(origin.messageId !== undefined ? { messageId: str(origin.messageId, `${path}.origin.messageId`) } : {}),
            ...(origin.friendUserId !== undefined ? { friendUserId: str(origin.friendUserId, `${path}.origin.friendUserId`) } : {}),
            ...(origin.sourceTripId !== undefined ? { sourceTripId: str(origin.sourceTripId, `${path}.origin.sourceTripId`) } : {}),
            ...(origin.sourceStopId !== undefined ? { sourceStopId: str(origin.sourceStopId, `${path}.origin.sourceStopId`) } : {}),
            ...(origin.ruleId !== undefined ? { ruleId: str(origin.ruleId, `${path}.origin.ruleId`) } : {}),
          },
        }
      : {}),
    addedAt: str(o.addedAt, `${path}.addedAt`),
    acceptedAt: strOrNull(o.acceptedAt, `${path}.acceptedAt`),
    actorUserId: strOrNull(o.actorUserId, `${path}.actorUserId`),
  };
}

function parseMoney(v: unknown, path: string): Money {
  const o = obj(v, path);
  return {
    lo: numOf(o.lo, `${path}.lo`),
    hi: numOf(o.hi, `${path}.hi`),
    currency: str(o.currency, `${path}.currency`),
    basis: oneOf(o.basis, BASES, `${path}.basis`),
  };
}

function parseCost(v: unknown, path: string): CostEstimate | null {
  if (v === null || v === undefined) return null;
  const o = obj(v, path);
  return {
    amounts: arr(o.amounts, `${path}.amounts`).map((a, i) => parseMoney(a, `${path}.amounts[${i}]`)),
    display: strOrNull(o.display, `${path}.display`),
    ...(o.note !== undefined ? { note: str(o.note, `${path}.note`) } : {}),
  };
}

function parsePlaceLink(v: unknown, path: string): PlaceLink {
  const o = obj(v, path);
  const kind = oneOf(o.kind, ['place', 'inline', 'none'] as const, `${path}.kind`);
  if (kind === 'place') return { kind, placeId: str(o.placeId, `${path}.placeId`) };
  if (kind === 'inline') {
    const at = obj(o.at, `${path}.at`);
    return { kind, at: { lat: numOf(at.lat, `${path}.at.lat`), lng: numOf(at.lng, `${path}.at.lng`) } };
  }
  return { kind: 'none' };
}

function parsePlacement(v: unknown, path: string): StopPlacement {
  const o = obj(v, path);
  const kind = oneOf(o.kind, ['scheduled', 'pool'] as const, `${path}.kind`);
  if (kind === 'scheduled') {
    return {
      kind,
      dayId: str(o.dayId, `${path}.dayId`),
      time: clockOrNull(o.time, `${path}.time`),
      order: numOf(o.order, `${path}.order`),
    };
  }
  const hint = o.hint === undefined ? undefined : obj(o.hint, `${path}.hint`);
  return {
    kind,
    cityKey: str(o.cityKey, `${path}.cityKey`),
    ...(hint
      ? {
          hint: {
            dayId: str(hint.dayId, `${path}.hint.dayId`),
            time: str(hint.time, `${path}.hint.time`),
            ...(hint.order !== undefined ? { order: numOf(hint.order, `${path}.hint.order`) } : {}),
          },
        }
      : {}),
  };
}

function parseTicket(v: unknown, path: string): Ticket | null {
  if (v === null || v === undefined) return null;
  const o = obj(v, path);
  const kind = oneOf(o.kind, ['bundled', 'url', 'attachment'] as const, `${path}.kind`);
  if (kind === 'bundled') return { kind, path: str(o.path, `${path}.path`), label: str(o.label, `${path}.label`) };
  if (kind === 'url') {
    return {
      kind,
      href: str(o.href, `${path}.href`),
      label: str(o.label, `${path}.label`),
      verifiedAt: strOrNull(o.verifiedAt, `${path}.verifiedAt`),
      verifiedBy: o.verifiedBy === null || o.verifiedBy === undefined ? null : oneOf(o.verifiedBy, ['fetch', 'user'] as const, `${path}.verifiedBy`),
    };
  }
  return {
    kind,
    mailMessageId: str(o.mailMessageId, `${path}.mailMessageId`),
    filename: str(o.filename, `${path}.filename`),
    label: str(o.label, `${path}.label`),
  };
}

function parseLinks(v: unknown, path: string) {
  if (v === undefined) return undefined;
  return arr(v, path).map((l, i) => {
    const o = obj(l, `${path}[${i}]`);
    return { label: str(o.label, `${path}[${i}].label`), href: str(o.href, `${path}[${i}].href`) };
  });
}

function parseStop(v: unknown, path: string): Stop {
  const o = obj(v, path);
  const links = parseLinks(o.links, `${path}.links`);
  const ticket = parseTicket(o.ticket, `${path}.ticket`);
  return {
    id: str(o.id, `${path}.id`),
    placement: parsePlacement(o.placement, `${path}.placement`),
    name: str(o.name, `${path}.name`),
    category: oneOf(o.category, CATEGORIES, `${path}.category`),
    place: parsePlaceLink(o.place, `${path}.place`),
    note: str(o.note, `${path}.note`),
    cost: parseCost(o.cost, `${path}.cost`),
    arrival:
      o.arrival === null || o.arrival === undefined
        ? null
        : (() => {
            const a = obj(o.arrival, `${path}.arrival`);
            return {
              mode: oneOf(a.mode, MODES, `${path}.arrival.mode`),
              mins: numOf(a.mins, `${path}.arrival.mins`),
              ...(a.label !== undefined ? { label: str(a.label, `${path}.arrival.label`) } : {}),
            };
          })(),
    // Absent means a document written before §2.12; 'transfer' is the specified default.
    travelRole: o.travelRole === undefined ? 'transfer' : oneOf(o.travelRole, TRAVEL_ROLES, `${path}.travelRole`),
    bookingId: strOrNull(o.bookingId, `${path}.bookingId`),
    flags: arr(o.flags, `${path}.flags`).map((f, i) => str(f, `${path}.flags[${i}]`)),
    provenance: parseProvenance(o.provenance, `${path}.provenance`),
    durationMins: numOrNull(o.durationMins, `${path}.durationMins`),
    ...(links ? { links } : {}),
    ...(ticket ? { ticket } : {}),
  };
}

function parseDay(v: unknown, path: string): Day {
  const o = obj(v, path);
  const legacyFlag = boolOpt(o.legacyFlag, `${path}.legacyFlag`);
  return {
    id: str(o.id, `${path}.id`),
    date: isoDate(o.date, `${path}.date`),
    primaryCity: str(o.primaryCity, `${path}.primaryCity`),
    cities: arr(o.cities, `${path}.cities`).map((c, i) => str(c, `${path}.cities[${i}]`)),
    title: str(o.title, `${path}.title`),
    subtitle: str(o.subtitle, `${path}.subtitle`),
    stops: arr(o.stops, `${path}.stops`).map((s, i) => parseStop(s, `${path}.stops[${i}]`)),
    provenance: parseProvenance(o.provenance, `${path}.provenance`),
    ...(legacyFlag !== undefined ? { legacyFlag } : {}),
    ...(o.tzId !== undefined ? { tzId: str(o.tzId, `${path}.tzId`) } : {}),
  };
}

function parseCity(v: unknown, path: string): City {
  const o = obj(v, path);
  const centre = obj(o.centre, `${path}.centre`);
  const meta = o.meta === undefined ? undefined : obj(o.meta, `${path}.meta`);
  return {
    key: str(o.key, `${path}.key`),
    name: str(o.name, `${path}.name`),
    countryCode: str(o.countryCode, `${path}.countryCode`),
    centre: { lat: numOf(centre.lat, `${path}.centre.lat`), lng: numOf(centre.lng, `${path}.centre.lng`) },
    order: numOf(o.order, `${path}.order`),
    ...(meta
      ? {
          meta: {
            ...(meta.flagEmoji !== undefined ? { flagEmoji: str(meta.flagEmoji, `${path}.meta.flagEmoji`) } : {}),
            ...(meta.color !== undefined ? { color: str(meta.color, `${path}.meta.color`) } : {}),
          },
        }
      : {}),
  };
}

function parsePlace(v: unknown, path: string): Place {
  const o = obj(v, path);
  const at = o.at === null || o.at === undefined ? null : obj(o.at, `${path}.at`);
  const links = parseLinks(o.links, `${path}.links`);
  return {
    id: str(o.id, `${path}.id`),
    cityKey: str(o.cityKey, `${path}.cityKey`),
    name: str(o.name, `${path}.name`),
    at: at ? { lat: numOf(at.lat, `${path}.at.lat`), lng: numOf(at.lng, `${path}.at.lng`) } : null,
    category: oneOf(o.category, CATEGORIES, `${path}.category`),
    ...(o.note !== undefined ? { note: str(o.note, `${path}.note`) } : {}),
    ...(links ? { links } : {}),
    ...(o.hours !== undefined ? { hours: o.hours as Place['hours'] } : {}),
  };
}

function parseBooking(v: unknown, path: string): Booking {
  const o = obj(v, path);
  const route = o.route === undefined ? undefined : obj(o.route, `${path}.route`);
  const startsAt = obj(o.startsAt, `${path}.startsAt`);
  const endsAt = o.endsAt === undefined ? undefined : obj(o.endsAt, `${path}.endsAt`);
  return {
    id: str(o.id, `${path}.id`),
    tripId: str(o.tripId, `${path}.tripId`),
    kind: oneOf(o.kind, BOOKING_KINDS, `${path}.kind`),
    operator: str(o.operator, `${path}.operator`),
    reference: strOrNull(o.reference, `${path}.reference`),
    ...(route
      ? { route: { fromName: str(route.fromName, `${path}.route.fromName`), toName: str(route.toName, `${path}.route.toName`) } }
      : {}),
    startsAt: { date: isoDate(startsAt.date, `${path}.startsAt.date`), time: clockOrNull(startsAt.time, `${path}.startsAt.time`) },
    ...(endsAt ? { endsAt: { date: isoDate(endsAt.date, `${path}.endsAt.date`), time: clockOrNull(endsAt.time, `${path}.endsAt.time`) } } : {}),
    price: parseCost(o.price, `${path}.price`),
    party: numOrNull(o.party, `${path}.party`),
    ...(o.seat !== undefined ? { seat: str(o.seat, `${path}.seat`) } : {}),
    status: oneOf(o.status, BOOKING_STATUS, `${path}.status`),
    ...(o.supersedesId !== undefined ? { supersedesId: str(o.supersedesId, `${path}.supersedesId`) } : {}),
    ...(o.issuedAt !== undefined ? { issuedAt: str(o.issuedAt, `${path}.issuedAt`) } : {}),
    ticket: parseTicket(o.ticket, `${path}.ticket`),
    provenance: parseProvenance(o.provenance, `${path}.provenance`),
    ...(o.sourceDoc !== undefined ? { sourceDoc: str(o.sourceDoc, `${path}.sourceDoc`) } : {}),
  };
}

function parseResolution(v: unknown, path: string): ConflictResolution {
  const o = obj(v, path);
  return {
    conflictId: str(o.conflictId, `${path}.conflictId`),
    state: oneOf(o.state, RESOLUTION_STATES, `${path}.state`),
    by: str(o.by, `${path}.by`),
    at: str(o.at, `${path}.at`),
    ...(o.note !== undefined ? { note: str(o.note, `${path}.note`) } : {}),
    // Absent means a document written before §2.7's retirement rule — a live resolution.
    retiredAt: o.retiredAt === undefined || o.retiredAt === null ? null : str(o.retiredAt, `${path}.retiredAt`),
  };
}

/**
 * Parses a trip document. Accepts a JSON string or an already-parsed object.
 *
 * Pure. @throws {TripParseError} on malformed JSON, a wrong schema version, a missing
 * required field, or an unknown enum value — always with the JSON path.
 */
export function fromJSON(input: string | unknown): Trip {
  let raw: unknown = input;
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input);
    } catch (e) {
      throw new TripParseError(`not valid JSON: ${(e as Error).message}`, '$');
    }
  }
  const o = obj(raw, '$');
  const version = o.schemaVersion;
  if (version !== SCHEMA_VERSION) {
    throw new TripParseError(
      `unsupported schemaVersion ${JSON.stringify(version)} — this build reads version ${SCHEMA_VERSION}`,
      '$.schemaVersion',
    );
  }
  const party = obj(o.party, '$.party');
  return {
    id: str(o.id, '$.id'),
    title: str(o.title, '$.title'),
    ownerId: str(o.ownerId, '$.ownerId'),
    startDate: isoDate(o.startDate, '$.startDate'),
    endDate: isoDate(o.endDate, '$.endDate'),
    datePrecision: datePrecision(o.datePrecision, '$.datePrecision'),
    homeCurrency: str(o.homeCurrency, '$.homeCurrency'),
    // Absent means a document written before §2.13. `null` is a legal value, not a defect.
    homeBase:
      o.homeBase === null || o.homeBase === undefined
        ? null
        : (() => {
            const h = obj(o.homeBase, '$.homeBase');
            const at = obj(h.at, '$.homeBase.at');
            return {
              name: str(h.name, '$.homeBase.name'),
              at: { lat: numOf(at.lat, '$.homeBase.at.lat'), lng: numOf(at.lng, '$.homeBase.at.lng') },
            };
          })(),
    party: { adults: numOf(party.adults, '$.party.adults'), children: numOf(party.children, '$.party.children') },
    cities: arr(o.cities, '$.cities').map((c, i) => parseCity(c, `$.cities[${i}]`)),
    days: arr(o.days, '$.days').map((d, i) => parseDay(d, `$.days[${i}]`)),
    pool: arr(o.pool, '$.pool').map((s, i) => parseStop(s, `$.pool[${i}]`)),
    places: arr(o.places, '$.places').map((p, i) => parsePlace(p, `$.places[${i}]`)),
    bookings: arr(o.bookings, '$.bookings').map((b, i) => parseBooking(b, `$.bookings[${i}]`)),
    resolutions: arr(o.resolutions, '$.resolutions').map((r, i) => parseResolution(r, `$.resolutions[${i}]`)),
    revision: numOf(o.revision, '$.revision'),
    schemaVersion: SCHEMA_VERSION,
    ...(o.meta !== undefined ? { meta: obj(o.meta, '$.meta') } : {}),
  };
}

/**
 * Thrown by `store.importDoc` for a document owned by somebody else (ARCHITECTURE §2.14).
 *
 * A named class rather than a bare `Error` because the Library has to tell those two cases
 * apart: "that file is not a Cairn trip" and "that trip belongs to someone else — open it
 * from their share instead" are different sentences with different next actions.
 *
 * It lives here, beside `TripParseError`, because it is a fact about a *document*.
 */
export class ForeignDocumentError extends Error {
  /** The `ownerId` on the incoming document. */
  ownerId: string;
  /** The local user the document was checked against. */
  localOwnerId: string;
  constructor(ownerId: string, localOwnerId: string) {
    super(
      `This trip belongs to someone else (${ownerId}) — open it from their share instead. ` +
        `Restore is for your own exported trips.`,
    );
    this.name = 'ForeignDocumentError';
    this.ownerId = ownerId;
    this.localOwnerId = localOwnerId;
  }
}
