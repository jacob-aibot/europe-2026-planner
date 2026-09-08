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
import { commit } from './commit.ts';

export type BuildCtx = {
  ids: IdFactory;
  /** `YYYY-MM-DD` — injected, never read from a clock inside core. */
  now: IsoDate;
  actorUserId?: UserId | null;
};

/**
 * **`assertDatePrecision` was here and §2.1 A-77 Part 4 DELETES it.**
 *
 * A-76 kept it as its one *efficiency* exception — *"`datePrecision` is a trip-level scalar, not a
 * record class; there is no per-record parser to ask, and asking `parseTrip` would be Part 2
 * option 3's O(document) cost on `setTripMeta`."* `serialize/fromJSON.ts`'s `parseTripEnvelope` is
 * **O(1)** and asks exactly the parser, so the exception has no premise left: it is now R16-2's
 * *one property, two guards* and comes out on A-76's own test. The refusal does not weaken for any
 * value the parser refuses — `commit` runs `parseTripEnvelope` unconditionally on every commit, and
 * `$.datePrecision` is where it lands — but it **does** weaken for `undefined`, which §8.1 makes
 * the parser tolerate as *absent*: measured, and disclosed as **KD-104** (see also **KD-101** for
 * `null`, which is why the default below is written `=== undefined` and not `??`).
 *
 * **The two guards that remain in `build/` are named in A-77 Part 4 so nobody deletes them as
 * second opinions**, and one of them is below: `isIsoDate` at both trip doors, which is *stricter
 * than the parser on purpose* — `fromJSON`'s `isoDate` takes the shape, `2026-13-45` matches it,
 * rolls through `Date.UTC` and yields a trip starting 2027-02-14 (F-11, BUILD-NOTES KD-12). The
 * other is `photos.ts`'s `assertBuiltAttach`.
 */

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
    // **`=== undefined`, not `??`** — BUILD-NOTES **KD-101**, and it is KD-100's finding one
    // record over. A-77 Part 4 deletes `assertDatePrecision` on the ground that
    // `parseTripEnvelope` asserts the same property, and that is true for every value except
    // `null`: `??` coalesces `null` as well as `undefined`, the deleted guard ran for `null`
    // (`typeof null !== 'string'`), and the literal implementation would have turned a refusal
    // into a silent write of `'exact'` — a narrowing the ruling says does not happen, covered by a
    // shipped QA P2-7 test. Absent and `undefined` mean *take the default* for an INIT; `null` is
    // a value the caller supplied, so it reaches the record and the parser refuses it at
    // `$.datePrecision`.
    datePrecision: init.datePrecision === undefined ? 'exact' : init.datePrecision,
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
  // §2.1 **A-77**, twice, and the first one is about the message rather than the check.
  //
  // `before` is `null` — the base case of `commit`'s induction, and the honest one for a door that
  // constructs a document rather than editing one: every record is new, so every record is parsed.
  // That is `cities`, the whole minted day skeleton, and the trip's own eleven scalars (R55-3's
  // eight), with no statement here about which of them this door writes.
  //
  // **It commits `base` before `ensureDays` runs** because `ensureDays` is itself a door and
  // commits on its own behalf: without this, `createTrip({title: 42, …})` would be refused — by
  // `ensureDays`, naming a function the caller never called. The trip `commit` returns satisfies
  // the invariant (*every record in it has been parsed once*), so it is a legal `before` for the
  // second call and the day skeleton is the only thing that pass has to look at.
  const checked = commit('createTrip', null, base);
  return commit('createTrip', checked, ensureDays(checked, ctx));
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
 * §2.1 **A-77**: it returns through `commit`, which closes R55-3's **eight** unguarded trip-level
 * scalars (`title`, `homeCurrency`, `ownerId`, `party`, `meta`, `homeBase` and `datePrecision`,
 * every one of which `{...trip, ...patch}` used to write with no check of any kind) through one
 * O(1) `parseTripEnvelope`, and every `City` the patch carries through `parseCity` — without this
 * function saying that it writes cities.
 *
 * @throws {Error} if the patch would put `endDate` before `startDate`, if it carries a trip scalar
 *         or a `City` `fromJSON` would refuse, or if the resulting range is wider than
 *         `ensureDays`' ten-year span cap (§2.3 **A-35**) — programmer error per §2.1, and the
 *         last is the one a person can cause by mistyping a year.
 */
export function setTripMeta(trip: Trip, patch: TripMetaPatch, ctx: BuildCtx): Trip {
  if (Object.prototype.hasOwnProperty.call(patch, 'cities')) {
    // The key's PRESENCE, not its truthiness: `{cities: undefined}` spreads `cities` away
    // entirely, and `commit` walks a collection rather than parsing the `Trip` whole, so a missing
    // array is the one shape the diff cannot see. It is refused here, where the caller is.
    if (!Array.isArray(patch.cities)) {
      throw new Error(`setTripMeta: cities must be an array, got ${JSON.stringify(patch.cities) ?? String(patch.cities)}`);
    }
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
  // `createTrip`'s note: `ensureDays` is a door and commits on its own behalf, so the patch is
  // committed here first or a bad `title` is refused by a function the caller never called.
  const checked = commit('setTripMeta', trip, next);
  if (patch.startDate || patch.endDate) {
    return commit('setTripMeta', checked, ensureDays(checked, ctx, /*alreadyBumped*/ true));
  }
  return checked;
}
