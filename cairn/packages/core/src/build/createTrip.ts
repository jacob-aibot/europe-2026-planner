/**
 * Trip construction (ARCHITECTURE §2.10 `build`).
 *
 * Every build function is pure: `(trip, args) => Trip`. Nothing mutates in place and every
 * one of them bumps `Trip.revision`, which is what the client's derived-cache invalidation
 * keys off (§4.2 rule 3).
 */
import type { City, Trip, TripMeta } from '../model/types.ts';
import type { CityKey, Currency, IdFactory, IsoDate, UserId } from '../model/ids.ts';
import { LOCAL_OWNER, SCHEMA_VERSION } from '../model/types.ts';
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
  party?: { adults: number; children: number };
  cities?: CityInit[];
  meta?: TripMeta;
};

/**
 * Creates a trip with a dense day skeleton over `[startDate, endDate]`.
 *
 * Pure apart from consuming ids from the injected factory.
 * @throws {Error} programmer error only: a malformed date, or `endDate` before `startDate`.
 */
export function createTrip(init: TripInit, ctx: BuildCtx): Trip {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(init.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(init.endDate)) {
    throw new Error('createTrip: startDate and endDate must be YYYY-MM-DD');
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

export type TripMetaPatch = Partial<
  Pick<Trip, 'title' | 'startDate' | 'endDate' | 'homeCurrency' | 'party' | 'cities' | 'ownerId' | 'meta'>
>;

/**
 * Patches trip-level metadata. Changing the date range re-runs `ensureDays`, so days can
 * never drift out of density (§2.3). Pure.
 *
 * @throws {Error} if the patch would put `endDate` before `startDate`.
 */
export function setTripMeta(trip: Trip, patch: TripMetaPatch, ctx: BuildCtx): Trip {
  const next: Trip = { ...trip, ...patch, revision: trip.revision + 1 };
  if (next.endDate < next.startDate) {
    throw new Error(`setTripMeta: endDate ${next.endDate} precedes startDate ${next.startDate}`);
  }
  if (patch.startDate || patch.endDate) return ensureDays(next, ctx, /*alreadyBumped*/ true);
  return next;
}
