/**
 * `importLegacyDays` — the `DAYS` → core migration of ARCHITECTURE §2.11.
 *
 * The legacy data is *adjacent, not copied*: `tools/extract-legacy.mjs` reads the live
 * planner read-only and hands the constant block to this function. Nothing here writes to
 * the live app and no copy of `DAYS` is committed.
 *
 * Pure apart from consuming ids from the injected factory. It never throws on odd data —
 * everything it could not do cleanly comes back as an `Issue`.
 */
import type {
  Booking, City, CostEstimate, Day, Issue, Link, Place, PlaceLink, Provenance, Stop, Ticket, Trip,
} from '../model/types.ts';
import type { CityKey, IdFactory, IsoDate } from '../model/ids.ts';
import { LOCAL_OWNER, SCHEMA_VERSION } from '../model/types.ts';
import { costFromDisplay, currenciesOf } from '../model/money.ts';
import { systemSuggestion, userProvenance } from '../model/provenance.ts';
import { cityRange } from '../derive/summary.ts';

// ---- the shape of the legacy constant block (structural, not imported) -------

export type LegacyStop = {
  t?: string; n: string; cat: string; lat?: number; lng?: number; note?: string;
  cost?: string; c?: [number, number]; book?: { l: string; u: string };
  move?: { mode: string; mins: number; label?: string };
  sug?: boolean; badge?: string; ticket?: boolean; id?: string;
  addHint?: { day: string; t: string };
};
export type LegacyDay = {
  id: string; dow?: string; d?: number; city: string; cities: string[];
  title: string; sub: string; stops: LegacyStop[]; flag?: boolean; sugDay?: boolean;
};
export type LegacyPlace = { n: string; cat: string; lat: number; lng: number; note?: string; book?: { l: string; u: string } };
export type LegacyConstants = {
  DAYS: LegacyDay[];
  OPTIONAL: Record<string, { title: string; note: string; stops: LegacyStop[] }>;
  CITY_PLACES: Record<string, LegacyPlace[]>;
  CITY_META: Record<string, { name: string; flag?: string; color?: string }>;
  CITY_ORDER: string[];
  CITY_RANGE: Record<string, string>;
  cityStops: Array<{ name: string; tab: string; lat: number; lng: number; note?: string }>;
};

export type ImportOpts = {
  ids: IdFactory;
  /** Calendar year for the `MM-DD` legacy day ids. */
  year: number;
  /** `addedAt` stamped on every imported item. Injected, never a clock read. */
  now: IsoDate;
  tripId?: string;
  title?: string;
  ownerId?: string;
  homeCurrency?: string;
  party?: { adults: number; children: number };
  /** ISO country codes per city key; missing keys import with an empty code. */
  countryCodes?: Record<string, string>;
  /** Bookings transcribed from `docs/BOOKINGS.md`, plus how they attach to stops. */
  bookings?: LegacyBookingFixture[];
  /** Source file hash, recorded in `trip.meta.sourceHash`. */
  sourceHash?: string;
};

export type LegacyBookingFixture = Omit<Booking, 'id' | 'tripId' | 'provenance'> & {
  key: string;
  provenance?: Partial<Provenance>;
  /** `{ day: "08-15", nameStartsWith: "Smartwings" }` — how this booking finds its stop(s). */
  linkTo?: Array<{ day: string; nameStartsWith: string }>;
  supersedesKey?: string;
};

export type ImportResult = {
  trip: Trip;
  /** Everything the import could not do cleanly. `warn` is expected; `error` is not. */
  issues: Issue[];
  /** Derived `cityRange()` vs the hardcoded `CITY_RANGE`, per §2.11. */
  cityRangeCheck: Array<{ cityKey: string; derived: string | null; legacy: string; ok: boolean }>;
  /** Stop names that matched no `CITY_PLACES` entry and were inlined. */
  unmatchedNames: string[];
};

const CATEGORIES = new Set(['sight', 'food', 'night', 'trip', 'transit', 'stay', 'suggest']);
const MODES = new Set(['walk', 'transit', 'metro', 'taxi', 'bus', 'coach', 'boat', 'speedboat', 'flight', 'train', 'funicular', 'bike']);

/** URL prefixes that mean "a file we host in this repo" rather than a vendor link. */
const BUNDLED_PREFIX = 'tickets/';

/**
 * Ticket links whose target was fetched and confirmed by an earlier session (recorded in
 * `docs/BOOKINGS.md`), versus the one Jacob confirmed by hand because the proxy blocked it.
 * Verification provenance is data, per the root `CLAUDE.md`.
 */
const USER_VERIFIED_HOSTS = ['gyg.me', 'getyourguide.com'];

function legacyDateToIso(id: string, year: number): string {
  return `${year}-${id}`;
}

function toLink(book: { l: string; u: string } | undefined): Link[] | undefined {
  if (!book) return undefined;
  return [{ label: book.l.replace(/\s*↗\s*$/, ''), href: book.u }];
}

function makeTicket(s: LegacyStop): Ticket | null {
  if (!s.ticket || !s.book) return null;
  const label = s.book.l.replace(/\s*↗\s*$/, '');
  if (s.book.u.startsWith(BUNDLED_PREFIX)) return { kind: 'bundled', path: s.book.u, label };
  const host = /^https?:\/\/([^/]+)/.exec(s.book.u)?.[1] ?? '';
  const byUser = USER_VERIFIED_HOSTS.some((h) => host.endsWith(h));
  return { kind: 'url', href: s.book.u, label, verifiedAt: null, verifiedBy: byUser ? 'user' : 'fetch' };
}

/**
 * Imports the live planner's constant block into a `Trip`.
 *
 * Pure apart from id generation. Never throws for data reasons.
 */
export function importLegacyDays(legacy: LegacyConstants, opts: ImportOpts): ImportResult {
  const issues: Issue[] = [];
  const unmatchedNames: string[] = [];
  const warn = (code: Issue['code'], ref: Issue['ref'], message: string, params: Issue['params']) =>
    issues.push({ level: 'warn', code, ref, message, params });

  // ---- cities -----------------------------------------------------------------
  const centres = new Map(legacy.cityStops.map((c) => [c.tab, { lat: c.lat, lng: c.lng }]));
  const cities: City[] = legacy.CITY_ORDER.map((key, i) => {
    const meta = legacy.CITY_META[key] ?? { name: key };
    const centre = centres.get(key);
    if (!centre) {
      warn('unknown_city_key', { kind: 'trip', id: key }, `No map centre found for city "${key}".`, { cityKey: key });
    }
    return {
      key,
      name: meta.name,
      countryCode: opts.countryCodes?.[key] ?? '',
      centre: centre ?? { lat: 0, lng: 0 },
      order: i,
      meta: { ...(meta.flag ? { flagEmoji: meta.flag } : {}), ...(meta.color ? { color: meta.color } : {}) },
    };
  });

  // ---- places -----------------------------------------------------------------
  const places: Place[] = [];
  const placeByCityName = new Map<string, Place>();
  for (const key of legacy.CITY_ORDER) {
    for (const p of legacy.CITY_PLACES[key] ?? []) {
      const hasCoords = typeof p.lat === 'number' && typeof p.lng === 'number';
      const place: Place = {
        id: opts.ids.newId('place'),
        cityKey: key,
        name: p.n,
        at: hasCoords ? { lat: p.lat, lng: p.lng } : null,
        category: CATEGORIES.has(p.cat) ? (p.cat as Place['category']) : 'sight',
        ...(p.note ? { note: p.note } : {}),
        ...(toLink(p.book) ? { links: toLink(p.book) } : {}),
      };
      if (!hasCoords) {
        warn('lat_lng_out_of_range', { kind: 'place', id: place.id }, `Curated place "${p.n}" (${key}) has no coordinates in the source.`, {
          name: p.n,
          cityKey: key,
        });
      }
      places.push(place);
      placeByCityName.set(`${key}|${p.n}`, place);
    }
  }

  const matchPlace = (name: string, cityKeys: string[]): Place | null => {
    for (const k of cityKeys) {
      const hit = placeByCityName.get(`${k}|${name}`);
      if (hit) return hit;
    }
    return null;
  };

  // ---- stops ------------------------------------------------------------------
  const buildCost = (s: LegacyStop, stopId: string): { cost: CostEstimate | null; inferred: boolean } => {
    const cost = costFromDisplay(s.cost ?? null);
    if (!cost) return { cost: null, inferred: false };
    if (cost.amounts.length === 0) {
      warn('cost_basis_mixed', { kind: 'stop', id: stopId }, `Could not read a price out of "${s.cost}".`, {
        display: s.cost ?? '',
      });
      return { cost, inferred: true };
    }
    const nonEur = currenciesOf(cost).filter((c) => c !== 'EUR');
    if (nonEur.length > 0) {
      warn(
        'cost_basis_mixed',
        { kind: 'stop', id: stopId },
        `"${s.n}" displays ${nonEur.join('/')} but the legacy numeric cost was recorded in EUR ` +
          `at an unrecorded rate; keeping the displayed currency.`,
        { display: s.cost ?? '', currencies: nonEur.join('/'), legacyLo: s.c?.[0] ?? '', legacyHi: s.c?.[1] ?? '' },
      );
      return { cost, inferred: true };
    }
    return { cost, inferred: false };
  };

  const buildStop = (
    s: LegacyStop,
    placementCities: string[],
    placement: Stop['placement'],
    dayRef: string,
  ): Stop => {
    const id = s.id ?? opts.ids.newId('stop');
    const matched = matchPlace(s.n, placementCities);
    let place: PlaceLink;
    if (matched) {
      place = { kind: 'place', placeId: matched.id };
    } else if (s.lat != null && s.lng != null) {
      place = { kind: 'inline', at: { lat: s.lat, lng: s.lng } };
      unmatchedNames.push(s.n);
      warn('place_ref_dangling', { kind: 'stop', id }, `"${s.n}" matched no curated place; kept as an inline pin.`, {
        name: s.n,
        dayId: dayRef,
      });
    } else {
      place = { kind: 'none' };
      unmatchedNames.push(s.n);
      warn('place_ref_dangling', { kind: 'stop', id }, `"${s.n}" has no coordinates and matched no curated place.`, {
        name: s.n,
        dayId: dayRef,
      });
    }

    const { cost, inferred } = buildCost(s, id);
    const flags: string[] = [];
    if (s.badge === 'free') flags.push('free');
    if (s.cat === 'trip') flags.push('daytrip');

    let provenance: Provenance = s.sug
      ? systemSuggestion(opts.now, 'inferred')
      : userProvenance(opts.now, opts.ownerId ?? LOCAL_OWNER);
    if (inferred && provenance.confidence === 'confirmed') provenance = { ...provenance, confidence: 'inferred' };

    if (s.move && !MODES.has(s.move.mode)) {
      warn('provenance_missing', { kind: 'stop', id }, `Unknown travel mode "${s.move.mode}" on "${s.n}".`, {
        mode: s.move.mode,
      });
    }
    const ticket = makeTicket(s);
    return {
      id,
      placement,
      name: s.n,
      category: CATEGORIES.has(s.cat) ? (s.cat as Stop['category']) : 'sight',
      place,
      note: s.note ?? '',
      cost,
      arrival: s.move ? ({ mode: s.move.mode, mins: s.move.mins } as NonNullable<Stop['arrival']>) : null,
      bookingId: null,
      flags,
      provenance,
      durationMins: null,
      ...(ticket ? { ticket } : {}),
      ...(!ticket && s.book ? { links: toLink(s.book) } : {}),
    };
  };

  // ---- days -------------------------------------------------------------------
  const days: Day[] = legacy.DAYS.map((d) => {
    const date = legacyDateToIso(d.id, opts.year);
    const stops = d.stops.map((s, i) =>
      buildStop(s, d.cities, { kind: 'scheduled', dayId: date, time: s.t && s.t !== '—' ? s.t : null, order: i }, date),
    );
    return {
      id: date,
      date,
      primaryCity: d.city,
      cities: d.cities.slice(),
      title: d.title,
      subtitle: d.sub,
      stops,
      provenance: d.sugDay ? systemSuggestion(opts.now, 'inferred') : userProvenance(opts.now, opts.ownerId ?? LOCAL_OWNER),
      ...(d.flag ? { legacyFlag: true } : {}),
    };
  });

  // ---- pool -------------------------------------------------------------------
  const pool: Stop[] = [];
  const poolNotes: Record<CityKey, { title: string; note: string }> = {};
  for (const cityKey of Object.keys(legacy.OPTIONAL)) {
    const section = legacy.OPTIONAL[cityKey];
    poolNotes[cityKey] = { title: section.title, note: section.note };
    for (const s of section.stops) {
      const hint = s.addHint
        ? { dayId: legacyDateToIso(s.addHint.day, opts.year), time: s.addHint.t }
        : undefined;
      pool.push(
        buildStop(s, [cityKey], { kind: 'pool', cityKey, ...(hint ? { hint } : {}) }, `pool:${cityKey}`),
      );
    }
  }

  // ---- trip -------------------------------------------------------------------
  const tripId = opts.tripId ?? opts.ids.newId('trip');
  const trip: Trip = {
    id: tripId,
    title: opts.title ?? 'Europe 2026',
    ownerId: opts.ownerId ?? LOCAL_OWNER,
    startDate: days[0]?.date ?? `${opts.year}-01-01`,
    endDate: days[days.length - 1]?.date ?? `${opts.year}-01-01`,
    homeCurrency: opts.homeCurrency ?? 'EUR',
    party: opts.party ?? { adults: 1, children: 0 },
    cities,
    days,
    pool,
    places,
    bookings: [],
    resolutions: [],
    revision: 0,
    schemaVersion: SCHEMA_VERSION,
    meta: { poolNotes, ...(opts.sourceHash ? { sourceHash: opts.sourceHash } : {}) },
  };

  // ---- bookings ---------------------------------------------------------------
  const withBookings = opts.bookings ? attachBookings(trip, opts.bookings, opts, issues) : trip;

  // ---- CITY_RANGE parity ------------------------------------------------------
  const cityRangeCheck = legacy.CITY_ORDER.map((key) => {
    const derived = cityRange(withBookings, key);
    const legacyValue = legacy.CITY_RANGE[key];
    const ok = derived === legacyValue;
    if (!ok) {
      issues.push({
        level: 'error',
        code: 'days_not_dense',
        ref: { kind: 'trip', id: key },
        message: `cityRange("${key}") derived ${JSON.stringify(derived)} but the legacy CITY_RANGE says ${JSON.stringify(legacyValue)}.`,
        params: { cityKey: key, derived: derived ?? '', legacy: legacyValue },
      });
    }
    return { cityKey: key, derived, legacy: legacyValue, ok };
  });

  return { trip: withBookings, issues, cityRangeCheck, unmatchedNames };
}

function attachBookings(
  trip: Trip,
  fixtures: LegacyBookingFixture[],
  opts: ImportOpts,
  issues: Issue[],
): Trip {
  const idByKey = new Map<string, string>();
  const bookings: Booking[] = fixtures.map((f) => {
    const id = opts.ids.newId('booking');
    idByKey.set(f.key, id);
    const { key, linkTo, supersedesKey, provenance, ...rest } = f;
    return {
      ...(rest as Omit<Booking, 'id' | 'tripId' | 'provenance'>),
      id,
      tripId: trip.id,
      provenance: {
        source: 'user',
        state: 'accepted',
        confidence: 'confirmed',
        addedAt: opts.now,
        acceptedAt: opts.now,
        actorUserId: opts.ownerId ?? LOCAL_OWNER,
        ...provenance,
      } as Booking['provenance'],
    };
  });
  for (let i = 0; i < fixtures.length; i++) {
    const sk = fixtures[i].supersedesKey;
    if (sk && idByKey.has(sk)) bookings[i] = { ...bookings[i], supersedesId: idByKey.get(sk) };
  }

  const linkMap = new Map<string, string>(); // `${dayId}|${namePrefix}` -> bookingId
  fixtures.forEach((f, i) => {
    for (const l of f.linkTo ?? []) {
      linkMap.set(`${opts.year}-${l.day}|${l.nameStartsWith}`, bookings[i].id);
    }
  });

  const used = new Set<string>();
  const days = trip.days.map((day) => ({
    ...day,
    stops: day.stops.map((s) => {
      for (const [k, bookingId] of linkMap) {
        const [dayId, prefix] = k.split('|');
        if (dayId === day.id && s.name.startsWith(prefix)) {
          used.add(k);
          return { ...s, bookingId };
        }
      }
      return s;
    }),
  }));

  for (const k of linkMap.keys()) {
    if (!used.has(k)) {
      issues.push({
        level: 'warn',
        code: 'booking_ref_orphan',
        ref: { kind: 'trip', id: trip.id },
        message: `Booking link "${k}" matched no stop.`,
        params: { link: k },
      });
    }
  }
  return { ...trip, bookings, days };
}
