/**
 * Trip construction (ARCHITECTURE §2.10 `build`).
 *
 * Every build function is pure: `(trip, args) => Trip`. Nothing mutates in place and every
 * one of them bumps `Trip.revision`, which is what the client's derived-cache invalidation
 * keys off (§4.2 rule 3).
 */
import type { City, DatePrecision, Trip, TripMeta } from '../model/types.ts';
import type { CityKey, Currency, IdFactory, IsoDate, UserId } from '../model/ids.ts';
import { LOCAL_OWNER, SCHEMA_VERSION } from '../model/types.ts';
import { isIsoDate } from '../model/ids.ts';
import { ensureDays } from './days.ts';

export type BuildCtx = {
  ids: IdFactory;
  /** `YYYY-MM-DD` — injected, never read from a clock inside core. */
  now: IsoDate;
  actorUserId?: UserId | null;
};

export type CityInit = {
  key: CityKey;
  name: string;
  countryCode?: string;
  centre?: { lat: number; lng: number };
  order?: number;
  meta?: { flagEmoji?: string; color?: string };
};

export type TripInit = {
  id?: string;
  title: string;
  startDate: IsoDate;
  endDate: IsoDate;
  ownerId?: UserId;
  homeCurrency?: Currency;
  homeBase?: { name: string; at: { lat: number; lng: number } } | null;
  party?: { adults: number; children: number };
  cities?: CityInit[];
  /** §8.1. Defaults to `'exact'` — display reads it and nothing else. */
  datePrecision?: DatePrecision;
  meta?: TripMeta;
};

/**
 * Creates a trip with a dense day skeleton over `[startDate, endDate]`.
 *
 * Pure apart from consuming ids from the injected factory.
 * @throws {Error} programmer error only: a malformed date, or `endDate` before `startDate`.
 */
export function createTrip(init: TripInit, ctx: BuildCtx): Trip {
  // The calendar, not the shape: `2026-13-45` matches /^\d{4}-\d{2}-\d{2}$/ and rolls over
  // through Date.UTC into a 2-day trip starting 2027-02-14 that validates clean (F-11).
  // `fromJSON` is NOT guarded the same way — BUILD-NOTES §1, KD-12.
  if (!isIsoDate(init.startDate) || !isIsoDate(init.endDate)) {
    throw new Error(
      `createTrip: startDate and endDate must be real calendar dates in YYYY-MM-DD, got ` +
        `${JSON.stringify(init.startDate)} and ${JSON.stringify(init.endDate)}`,
    );
  }
  if (init.endDate < init.startDate) {
    throw new Error(`createTrip: endDate ${init.endDate} precedes startDate ${init.startDate}`);
  }
  const cities: City[] = (init.cities ?? []).map((c, i) => ({
    key: c.key,
    name: c.name,
    countryCode: c.countryCode ?? '',
    centre: c.centre ?? { lat: 0, lng: 0 },
    order: c.order ?? i,
    ...(c.meta ? { meta: c.meta } : {}),
  }));
  const base: Trip = {
    id: init.id ?? ctx.ids.newId('trip'),
    title: init.title,
    ownerId: init.ownerId ?? LOCAL_OWNER,
    startDate: init.startDate,
    endDate: init.endDate,
    homeCurrency: init.homeCurrency ?? 'EUR',
    datePrecision: init.datePrecision ?? 'exact',
    homeBase: init.homeBase ?? null,
    party: init.party ?? { adults: 1, children: 0 },
    cities,
    days: [],
    pool: [],
    places: [],
    bookings: [],
    resolutions: [],
    revision: 0,
    schemaVersion: SCHEMA_VERSION,
    ...(init.meta ? { meta: init.meta } : {}),
  };
  return ensureDays(base, ctx);
}

/**
 * §8.9: the allowlist gains `datePrecision` and nothing else. It adds no build function —
 * the field is data, not a capability.
 */
export type TripMetaPatch = Partial<
  Pick<Trip, 'title' | 'startDate' | 'endDate' | 'datePrecision' | 'homeCurrency' | 'homeBase' | 'party' | 'cities' | 'ownerId' | 'meta'>
>;

/**
 * Patches trip-level metadata. Changing the date range re-runs `ensureDays`, so days can
 * never drift out of density (§2.3). Pure.
 *
 * @throws {Error} if the patch would put `endDate` before `startDate`.
 */
export function setTripMeta(trip: Trip, patch: TripMetaPatch, ctx: BuildCtx): Trip {
  const next: Trip = { ...trip, ...patch, revision: trip.revision + 1 };
  if (!isIsoDate(next.startDate) || !isIsoDate(next.endDate)) {
    throw new Error(
      `setTripMeta: startDate and endDate must be real calendar dates in YYYY-MM-DD, got ` +
        `${JSON.stringify(next.startDate)} and ${JSON.stringify(next.endDate)}`,
    );
  }
  if (next.endDate < next.startDate) {
    throw new Error(`setTripMeta: endDate ${next.endDate} precedes startDate ${next.startDate}`);
  }
  if (patch.startDate || patch.endDate) return ensureDays(next, ctx, /*alreadyBumped*/ true);
  return next;
}
