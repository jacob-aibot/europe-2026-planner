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

const DATE_PRECISIONS: readonly string[] = ['exact', 'month', 'year'];

/**
 * §2.1: *"every `*Patch` type is enforced at runtime by an explicit key allowlist, not by
 * TypeScript"* — and the same holds for an enum-valued field, because the action and JSON
 * boundaries above core are untyped at runtime. `fromJSON` refuses anything outside the three
 * members (`$.datePrecision`); without this, `setTripMeta` accepted them, and the resulting
 * document **serializes but cannot be parsed back** — a trip that writes itself into a state
 * it cannot be opened from (QA P2-7). Throws on programmer error, per §2.1.
 */
function assertDatePrecision(where: string, value: unknown): void {
  if (typeof value !== 'string' || !DATE_PRECISIONS.includes(value)) {
    throw new Error(
      `${where}: datePrecision must be one of ${DATE_PRECISIONS.map((p) => `"${p}"`).join(', ')}, got ` +
        `${JSON.stringify(value) ?? String(value)}`,
    );
  }
}

export type CityInit = {
  /**
   * **Optional since §2.2 A-10** (revision 11, QA P2-2). A `CityKey` is an opaque id minted
   * by the injected `IdFactory`, exactly as every other id here is; it is never derived from
   * the display name and nothing may parse one. Omit it and `createTrip` mints
   * `ctx.ids.newId('city')`. Supply it and it is honoured **verbatim** — `import/legacyDays.ts`
   * passes `vienna`/`split`/… and every fixture and stored document keeps the keys it has.
   *
   * No caller outside `packages/core` constructs one. The two web forms used to slug the name
   * with `name.toLowerCase().replace(...)`, which deleted every non-ASCII-alphanumeric
   * character and collapsed 東京 and 京都 to the single key `"-"`.
   */
  key?: CityKey;
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
 * @throws {Error} programmer error only: a malformed date, `endDate` before `startDate`, or a
 *         range wider than `ensureDays`' ten-year span cap (§2.3 **A-35**) — the last of which
 *         is a *person's* mistype, so its message is written to be read on screen.
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
  if (init.datePrecision !== undefined) assertDatePrecision('createTrip', init.datePrecision);
  const cities: City[] = (init.cities ?? []).map((c, i) => ({
    // §2.2 A-10. `??` and not `||`: an explicit key is honoured verbatim, and `''` is a key
    // the document already carries — minting over it would silently orphan every
    // `Day.primaryCity`, `Place.cityKey` and pool placement pointing at it. `validateTrip`
    // is what says such a document is broken (§2.9); `createTrip` does not repair it.
    key: c.key ?? ctx.ids.newId('city'),
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
    // §10.1. Every trip has the field; an empty trip has none of them.
    photos: [],
    // §8.3. Same shape, same reason — and `createTrip` mints no `'self'` row: recording that
    // you were on your own trip is a statement the user makes, not one the system makes for
    // them (root `CLAUDE.md`: nothing the system added is presented as the user's own plan).
    participants: [],
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
 * @throws {Error} if the patch would put `endDate` before `startDate`, if it carries a
 *         `datePrecision` outside `'exact' | 'month' | 'year'`, or if the resulting range is
 *         wider than `ensureDays`' ten-year span cap (§2.3 **A-35**) — programmer error per
 *         §2.1, and the third is the one a person can cause by mistyping a year.
 */
export function setTripMeta(trip: Trip, patch: TripMetaPatch, ctx: BuildCtx): Trip {
  // The key's PRESENCE is what is checked, not its truthiness: `{datePrecision: undefined}`
  // spreads the field away entirely and is as unreadable a document as `'fortnight'` is.
  if (Object.prototype.hasOwnProperty.call(patch, 'datePrecision')) {
    assertDatePrecision('setTripMeta', patch.datePrecision);
  }
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
