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
 * **`isIsoDate` was here too, at both trip doors, and §2.1 A-78 Part 3 DELETES it** (QA R56-3).
 * A-77 kept it as *"stricter than the parser on purpose"* and that reason is **false against the
 * code**: §2.9 **A-45** made `isIsoDate` `fromJSON`'s *own* date check, the two predicates agree
 * on 19/19 values, and there is no value at which the door is stricter. The ordering defence —
 * the ground `assertBuiltAttach` survives on — is empty here, because **both doors commit the
 * envelope before minting days**, so `parseTripEnvelope` refuses a calendar-invalid date at
 * `$.startDate` before A-35's span cap can print its misleading *"this trip would cover N days"*.
 * `isIsoDate` **itself** is untouched: it is on §2.10's surface and seven other modules call it.
 *
 * **After A-78 Part 3 `build/` contains exactly ONE guard that is not the parser** —
 * `photos.ts`'s `assertBuiltAttach` — and adding a second is an architect's ruling. The two
 * checks that remain in this file are not guards of that kind: `endDate < startDate` is a
 * property the parser deliberately does not have, and `setTripMeta`'s `cities` `Array.isArray`
 * is the one shape `commit`'s per-collection walk cannot see.
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
  // §2.1 **A-78** Part 3 (QA R56-3): the `isIsoDate` guard that was here is **DELETED**. §2.9
  // A-45 made `isIsoDate` `fromJSON`'s own date check, so this was R16-2's *one property, two
  // guards* — and the ordering defence is empty, because `commit('createTrip', null, base)` below
  // runs BEFORE `ensureDays`, so `parseTripEnvelope` refuses `2026-13-45` at `$.startDate` before
  // A-35's span cap can print *"this trip would cover 258 days"*. The `endDate < startDate` check
  // stays — ordering is a property the parser deliberately does not have — but it moves BELOW the
  // commit (**BUILD-NOTES KD-108**), because a `<` between two strings one of which is not a date
  // answers a question nobody asked: `'2026-03-02' < '2026-13-45'` is true, so a mistyped MONTH
  // used to be reported as a reversed range. Parse first, ordering second, A-35's span cap third.
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
  // A-78 Part 3: ordering, after the parse and before `ensureDays`' span cap. `commit` is pure, so
  // running it first costs one O(1) `parseTripEnvelope` and buys the right message every time.
  if (checked.endDate < checked.startDate) {
    throw new Error(`createTrip: endDate ${checked.endDate} precedes startDate ${checked.startDate}`);
  }
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
 * Exactly `TripMetaPatch`'s `Pick`, at runtime — §2.1 **A-78** Part 4 (QA **R56-5** /
 * BUILD-NOTES **KD-104**), on `setDayMeta`'s model (A-77 Part 5) and `updateStop`'s before it.
 *
 * **`Record<keyof TripMetaPatch, true>` is the pin** (R56-6's shape, applied here): a field added
 * to the `Pick` above and not to this constant fails `npm run typecheck` in `src`, on the commit
 * that writes it, and an undeclared key here fails the same way.
 *
 * The lookup is `hasOwnProperty`, never `in`: `in` would make `toString` a patchable key.
 */
const TRIP_META_PATCH_KEYS: Record<keyof TripMetaPatch, true> = {
  title: true, startDate: true, endDate: true, datePrecision: true, homeCurrency: true,
  homeBase: true, party: true, cities: true, ownerId: true, meta: true,
};

/**
 * §2.1 **A-78** Part 4. Refuses two things:
 *
 *   **(a)** any key outside `TripMetaPatch`'s `Pick`;
 *   **(b)** any key of `TripMetaPatch` that is **present** with the value `undefined`.
 *
 * Clause (b) is stated separately precisely because the parser is tolerant here and correctly so.
 * `parseTripEnvelope` carries `fromJSON`'s tolerances verbatim — absent `ownerId` is `''`, absent
 * `datePrecision` is `'exact'`, absent `homeBase` is `null` — and those are right for a *document*
 * (an older file; a field that did not exist yet) and wrong for a *patch*, where a key's presence
 * is the caller saying *set this field to this value*. Deleting `assertDatePrecision` (A-77) left
 * exactly this hole: `setTripMeta(t, {datePrecision: undefined})` on a `'month'` trip silently
 * wrote `'exact'` — a precision **the user chose**, changed with no refusal and no notice. **Every
 * field with a parser tolerance is a hole of this shape**, which is why this is a family rule and
 * not a guard for one field. **A caller that means *leave this field alone* omits the key.**
 *
 * @throws {Error} on either shape — programmer error per §2.1, not a domain problem.
 */
function assertPatchable(patch: object): void {
  for (const k of Object.keys(patch)) {
    if (!Object.prototype.hasOwnProperty.call(TRIP_META_PATCH_KEYS, k)) {
      throw new Error(`setTripMeta: "${k}" may not be patched — it is not a field of TripMetaPatch`);
    }
    if ((patch as Record<string, unknown>)[k] === undefined) {
      throw new Error(
        `setTripMeta: "${k}" may not be patched to \`undefined\` — the parser tolerates an ABSENT ` +
          'field and would write its default over the value you have; omit the key to leave the ' +
          'field alone',
      );
    }
  }
}

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
 * §2.1 **A-78** Part 4: it opens with `assertPatchable`, which refuses a key outside
 * `TripMetaPatch` and a key of `TripMetaPatch` present with the value `undefined`.
 *
 * @throws {Error} if the patch carries a key outside `TripMetaPatch` or one present with
 *         `undefined`, if it would put `endDate` before `startDate`, if it carries a trip scalar
 *         or a `City` `fromJSON` would refuse, or if the resulting range is wider than
 *         `ensureDays`' ten-year span cap (§2.3 **A-35**) — programmer error per §2.1, and the
 *         last is the one a person can cause by mistyping a year.
 */
export function setTripMeta(trip: Trip, patch: TripMetaPatch, ctx: BuildCtx): Trip {
  assertPatchable(patch);
  if (Object.prototype.hasOwnProperty.call(patch, 'cities')) {
    // **This check STAYS** (A-78 Part 4): `assertPatchable` above now subsumes
    // `{cities: undefined}` — that key's PRESENCE used to spread `cities` away entirely — but the
    // `Array.isArray` half still refuses a NON-ARRAY `cities`, which is the one shape `commit`'s
    // per-collection walk cannot see: it walks a collection rather than parsing the `Trip` whole.
    if (!Array.isArray(patch.cities)) {
      throw new Error(`setTripMeta: cities must be an array, got ${JSON.stringify(patch.cities) ?? String(patch.cities)}`);
    }
  }
  const next: Trip = { ...trip, ...patch, revision: trip.revision + 1 };
  // §2.1 **A-78** Part 3 (QA R56-3): `isIsoDate` deleted here too, for `createTrip`'s reason —
  // `commit('setTripMeta', trip, next)` below runs before the conditional `ensureDays`.
  //
  // `createTrip`'s note: `ensureDays` is a door and commits on its own behalf, so the patch is
  // committed here first or a bad `title` is refused by a function the caller never called.
  const checked = commit('setTripMeta', trip, next);
  // A-78 Part 3: ordering, after the parse, for `createTrip`'s reason.
  if (checked.endDate < checked.startDate) {
    throw new Error(`setTripMeta: endDate ${checked.endDate} precedes startDate ${checked.startDate}`);
  }
  if (patch.startDate || patch.endDate) {
    return commit('setTripMeta', checked, ensureDays(checked, ctx, /*alreadyBumped*/ true));
  }
  return checked;
}
