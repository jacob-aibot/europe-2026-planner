/**
 * Hand-rolled parsing and validation (ARCHITECTURE, ROADMAP "hard constraints": zero
 * runtime dependencies — no zod).
 *
 * Every failure carries the JSON path that caused it, because "invalid trip" with no path
 * is useless when a document has 112 stops.
 */
import type {
  Booking, City, CostEstimate, DatePrecision, Day, Money, OpeningHours, PhotoAsset,
  PhotoAttachRef, PhotoDerivative, Place, PlaceLink,
  Provenance, Stop, StopPlacement, Ticket, Trip, ConflictResolution,
} from '../model/types.ts';
import { DATE_PRECISIONS, SCHEMA_VERSION } from '../model/types.ts';
import { isClockTime } from '../model/openingHours.ts';
import { isIsoDate } from '../model/ids.ts';
import { TripParseError } from './parseError.ts';
import { migrateDoc } from './migrate.ts';

// It is defined in `parseError.ts` since QA R45-1 (see that file for why) and re-exported here,
// so `index.ts` and every existing importer are unchanged.
export { TripParseError };

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
/**
 * A **trip id**, refused if it carries U+0000 — QA **R46-6**.
 *
 * Ids are opaque (§2.1) and this refuses one character rather than imposing a shape: no
 * alphabet, no length, no case. The character is the one that cannot be carried through a
 * flattened compound key. §10.3 keys photo bytes by `[tripId, photoId]`, and a store that
 * cannot hold an array key — `packages/client`'s in-memory `PhotoPort`, and any future port
 * whose backing store is a string map — has to flatten it with a separator no id contains.
 * `IdFactory` mints no NUL, but `fromJSON` does not take its ids from `IdFactory`: it takes
 * them from a file, and `store.importDoc` calls it on a backup the user can hand-edit. So the
 * one value that can forge a tenancy collision is refused where every document passes.
 *
 * **Only the trip id.** It is the tenancy half of that key, and the half a collision is
 * dangerous in — a `photoId` carrying the separator is still exactly its own trip's record,
 * in the engine (`qa/r46-idb-keys.mjs` §C) and in the double. Widening this to every id in the
 * document would be a migration risk with no defect behind it.
 */
function tripId(v: unknown, path: string): string {
  const s = str(v, path);
  if (s.includes('\u0000')) {
    throw new TripParseError('a trip id may not contain the character U+0000', path);
  }
  return s;
}
/**
 * A date field, refused unless it is a real calendar date — A-45.
 *
 * A-20: *"`fromJSON` decides whether a document IS a `Trip`; `validateTrip` decides whether a
 * `Trip` says something wrong."* §2.1 **A-32** states `IsoDate`'s domain (proleptic Gregorian,
 * `0000-01-01` … `9999-12-31`), so `2026-02-30` is not an `IsoDate` and a document carrying one
 * is not a `Trip`. This calls `isIsoDate` — the ONE date validator in core (`model/ids.ts`) —
 * for the same reason `clockOrNull` below calls `isClockTime`: a second copy of the predicate
 * is exactly the defect A-20 is treating, and the shape-only regex that used to live here was
 * that second copy, weaker by a calendar.
 *
 * `validateTrip`'s `invalid_calendar_date` is **not** superseded: it stays as defence in depth
 * for `Trip`s that never met this parser (the legacy importer, `migrateDoc`, hand-built trips).
 */
function isoDate(v: unknown, path: string): string {
  const s = str(v, path);
  if (!isIsoDate(s)) throw new TripParseError('expected a real calendar date in YYYY-MM-DD', path);
  return s;
}
function clockOrNull(v: unknown, path: string): string | null {
  if (v === null || v === undefined) return null;
  const s = str(v, path);
  // A-20: the clock-shape regex lives in `model/openingHours.ts` and nowhere else in
  // `packages/core`. A second copy of the predicate is exactly the defect A-20 is treating.
  if (s !== '' && !isClockTime(s)) throw new TripParseError('expected HH:MM', path);
  return s;
}
/**
 * `HH:MM`, with no empty string (A-20). `clockOrNull` allows `''` because a stop's time may be
 * blank; an opening time that exists is a time.
 */
function clock(v: unknown, path: string): string {
  const s = str(v, path);
  if (!isClockTime(s)) throw new TripParseError('expected HH:MM', path);
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

/**
 * `Place.hours` — a field like every other field (§2.14 **A-20**, revision 15).
 *
 * This used to be `o.hours as Place['hours']`, the only raw cast in this parser, and the root
 * cause of R15-1, R15-2 and R16-2. A-20's line: *"`fromJSON` decides whether a document IS a
 * `Trip`; `validateTrip` decides whether a `Trip` says something wrong."* `hours: 'mon-fri'` is
 * not an `OpeningHours` in any field, so it is `isoDate`'s case (refuse, with a path), not
 * `invalid_calendar_date`'s (report, as an `Issue`).
 *
 *   - **`hours: null` is refused.** `Place.hours` is optional and *not* nullable — the same
 *     treatment `links: null` and `note: null` already get, and the opposite of
 *     `cost`/`ticket`/`at`, whose types *are* nullable. Only `undefined` means absent.
 *   - **Each entry is rebuilt from three named fields**, so an unenumerated key — R15-1's
 *     actual carrier — cannot survive the parser at all. This is `parseLinks`' construction,
 *     applied one record over.
 *   - An `undefined` or `null` slot normalises to `null`: §7's *"missing day = unknown"*.
 *     The parser normalises **absence** and refuses every present-but-wrong value.
 */
function parseOpeningHours(v: unknown, path: string): OpeningHours {
  const o = obj(v, path);
  return {
    weekly: arr(o.weekly, `${path}.weekly`).map((w, i) => {
      if (w === null || w === undefined) return null;
      const e = obj(w, `${path}.weekly[${i}]`);
      return {
        day: numOf(e.day, `${path}.weekly[${i}].day`),
        open: clock(e.open, `${path}.weekly[${i}].open`),
        close: clock(e.close, `${path}.weekly[${i}].close`),
      };
    }),
    ...(o.note !== undefined ? { note: str(o.note, `${path}.note`) } : {}),
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
    ...(o.hours !== undefined ? { hours: parseOpeningHours(o.hours, `${path}.hours`) } : {}),
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

/**
 * §10.1's `PhotoAsset`, hand-validated like every other record here (no zod —
 * `cairn-constraints` §2). Every failure carries the JSON path, because *"invalid trip" with no
 * path is useless when a document has 112 stops* — and worse when it has 400 photos.
 *
 * Each field is rebuilt by name, so an unenumerated key cannot survive the parser at all —
 * `parseLinks`' construction, one record over, and §2.14 **A-20**'s line applied on the day the
 * record class is added rather than after a finding.
 *
 * **`place` is parsed even though it is not built** (A-57 Part 3): the union carries the arm so
 * that adding it is a build change and not a schema one, and a document written by a later build
 * must still be readable rather than refused at the parser. `build/photos.ts` is where the
 * deferral is enforced.
 */
function parseAttach(v: unknown, path: string): PhotoAttachRef {
  const o = obj(v, path);
  const kind = oneOf(o.kind, ['trip', 'day', 'stop', 'place'] as const, `${path}.kind`);
  if (kind === 'day') return { kind, dayId: str(o.dayId, `${path}.dayId`) };
  if (kind === 'stop') return { kind, stopId: str(o.stopId, `${path}.stopId`) };
  if (kind === 'place') return { kind, placeId: str(o.placeId, `${path}.placeId`) };
  return { kind: 'trip' };
}

function parseDerivative(v: unknown, path: string): PhotoDerivative {
  const o = obj(v, path);
  return {
    w: numOf(o.w, `${path}.w`),
    h: numOf(o.h, `${path}.h`),
    bytes: numOf(o.bytes, `${path}.bytes`),
  };
}

function parseWH(v: unknown, path: string): { w: number; h: number } | null {
  if (v === null || v === undefined) return null;
  const o = obj(v, path);
  return { w: numOf(o.w, `${path}.w`), h: numOf(o.h, `${path}.h`) };
}

function parsePhoto(v: unknown, path: string): PhotoAsset {
  const o = obj(v, path);
  const capturedAt = o.capturedAt === null || o.capturedAt === undefined ? null : obj(o.capturedAt, `${path}.capturedAt`);
  const at = o.at === null || o.at === undefined ? null : obj(o.at, `${path}.at`);
  return {
    id: str(o.id, `${path}.id`),
    attach: parseAttach(o.attach, `${path}.attach`),
    caption: str(o.caption, `${path}.caption`),
    // §10.1: local wall-clock, no zone — validated through the same two predicates every other
    // date and time in this parser goes through, and refused rather than repaired.
    capturedAt: capturedAt
      ? { date: isoDate(capturedAt.date, `${path}.capturedAt.date`), time: clock(capturedAt.time, `${path}.capturedAt.time`) }
      : null,
    at: at ? { lat: numOf(at.lat, `${path}.at.lat`), lng: numOf(at.lng, `${path}.at.lng`) } : null,
    metaSource:
      o.metaSource === null || o.metaSource === undefined
        ? null
        : oneOf(o.metaSource, ['exif', 'user'] as const, `${path}.metaSource`),
    source: parseWH(o.source, `${path}.source`),
    thumb: parseDerivative(o.thumb, `${path}.thumb`),
    display: parseDerivative(o.display, `${path}.display`),
    provenance: parseProvenance(o.provenance, `${path}.provenance`),
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
 * **The upcast runs here, and that placement is QA R45-1's fix.** `SCHEMA_VERSION` went 1 → 2 at
 * I-13 and `migrateDoc` shipped with **zero production callers**, so every document and every
 * exported backup written by the previous release was refused — the whole library read *"could
 * not be read"* and the I-8e rescue export was unrestorable. The five `core.fromJSON` call sites
 * in `store.ts` could each have gained a `migrateDoc(...)`, and that is the version a sixth
 * reader silently misses. This is the one entry point every reader already goes through, §2.10
 * exposes it, and putting the migration in front of the validation is what makes the refusal a
 * user sees the one written for a document from the **future** (*"Update the app."*) rather than
 * one written for their own file.
 *
 * `migrateDoc` is a pass-through for a current document and is idempotent, so a caller that
 * already ran it — `packages/core/test`, `test/stats-storage.test.ts`, `qa/` — is unaffected.
 *
 * Pure. @throws {TripParseError} on malformed JSON, an unmigratable schema version, a missing
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
  // Throws `TripParseError` at `$.schemaVersion` for a missing version, a version from the
  // future, and a version too old to have a path — all three of which used to be one message.
  const o = obj(migrateDoc(obj(raw, '$')), '$');
  const party = obj(o.party, '$.party');
  return {
    // R46-6: a trip id is refused for one character, U+0000 — see `tripId`.
    id: tripId(o.id, '$.id'),
    title: str(o.title, '$.title'),
    // §2.14 rule 1 refuses a document whose owner is "neither the local user … nor absent",
    // so ABSENT is an allowed input class and the parser may not refuse it before the
    // ownership check can run (QA `qa/r2-import.mjs`). The parser does not invent an owner
    // either: it cannot know who is signed in, and stamping `LOCAL_OWNER` on an ownerless
    // file inside a pure function would make it the local user's silently. Absence is carried
    // as `''`, which `validateTrip` already reports as `owner_missing`; `store.importDoc` —
    // the layer that knows the local user — is where absence becomes ownership. BUILD-NOTES
    // KD-40 records the reasoning; `store.ts`'s `importDoc` is the other half.
    ownerId: o.ownerId === undefined || o.ownerId === null ? '' : str(o.ownerId, '$.ownerId'),
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
    // §10.1, A-57 Part 5. **Absent is accepted and means `[]`** — not because the field is
    // optional (`SCHEMA_VERSION` went to 2 precisely because it is not), but because
    // `migrateDoc` is the layer that supplies it and this parser must stay callable on a
    // migrated object without depending on which of the two ran first. A PRESENT value is
    // hand-validated in full, exactly like every other array here.
    photos: o.photos === undefined ? [] : arr(o.photos, '$.photos').map((p, i) => parsePhoto(p, `$.photos[${i}]`)),
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
