/**
 * Trip construction (ARCHITECTURE §2.10 `build`).
 *
 * Every build function is pure: `(trip, args) => Trip`. Nothing mutates in place and every
 * one of them bumps `Trip.revision`, which is what the client's derived-cache invalidation
 * keys off (§4.2 rule 3).
 */
import type { City, CityPick, DatePrecision, Trip, TripMeta } from '../model/types.ts';
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
  /**
   * **Optional, and its default is `null` since §8.4 A-83 Part 8 (I-22).** It used to be
   * `{lat: 0, lng: 0}`, which is a real place in the Gulf of Guinea and was never a measurement.
   * A form that collects a name and no coordinate now records an honest hole.
   *
   * **§8.4 A-85 Part 2 (QA R62-2, ROADMAP I-24): the default is `null` only when there is no
   * `pick` beside it.** Absent beside a pick means *the point the pick names*; written out —
   * `null` included — it is honoured verbatim. See `pick` below for why the two cases cannot be
   * told apart anywhere except here.
   */
  centre?: { lat: number; lng: number } | null;
  /**
   * What the user **picked** out of the gazetteer, recorded whole (§8.4 **A-84** Part 3).
   * Defaults to `null`, which is what a typed city has. **Nothing in this repository may fill it
   * from a name match** — A-82 Part 6 forbids it, and clause 4 makes that a signature: the only
   * mint is `cityPickFromRow(row)`, so a caller who does not hold a row cannot produce one.
   *
   * Its shape is **not checked here**. `commit` routes every city this function writes through
   * `fromJSON`'s own `parseCity`, which is where the rule lives and where every other door
   * inherits it (§2.1 A-77…A-81).
   *
   * **THE OBLIGATION ON ANY FUTURE DOOR THAT ACCEPTS A `CityInit` — §8.4 A-85 Part 2, and it is
   * written here because this docstring is what such a builder reads.** A pick carries the
   * coordinate of the row the user chose, and a door that takes a `pick` **without** a `centre`
   * beside it must stand the city on a **copy** of `pick.centre`. Dropping it stores a pick that
   * is stale by A-84 Part 3 clause 3 **on the day it is written** — inert forever, attributing
   * nothing, with no default, no `Issue` and no parse refusal. That was QA R62-2, measured
   * against the shortest call a picker screen makes.
   *
   * **The mirror obligation: a `centre` the caller WROTE is honoured verbatim, `null` included.**
   * Clearing a picked city's coordinate is A-84 Part 3 clause 3's *erase* case — a legal shipped
   * user action, in which the pick is kept and inert — and in the *stored document* the
   * born-stale case and the erase case are the same two fields. The distinction exists **only at
   * a door**, where a key can be absent rather than `null`. That is why this is not a parser rule
   * and why `fromJSON` still opens `{centre: null, pick: {…}}`.
   *
   * `setTripMeta` is deliberately not in this obligation: its patch takes `City[]`, whose
   * `centre` is **required**, so a caller there has to write `centre: null` out loud.
   */
  pick?: CityPick | null;
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
  // **QA R64-1 (MAJOR) — ONE normalisation pass, and every caller-owned property is read into a
  // local exactly once.** This map used to be two: a record map that read `c.centre` twice (the
  // ternary short-circuits, so it is two reads and not one) and a second `(init.cities ?? [])
  // .map(...)` below it that read `c.centre` a third time to compute `wroteCentre`. Measured,
  // the door read `CityInit.centre` **three** times per city and `init.cities` **twice**, and a
  // caller-owned object may be reactive — a `Proxy`, a framework store, a form model — so reads
  // that can disagree are reads that do:
  //
  //   - a `centre` getter yielding `undefined` on the first read and a real coordinate on the
  //     second stored `{centre: null, pick: live}` and reported `{null, null}` — R62-2's own
  //     reproduction string, reached through the door built to prevent it, with nobody writing
  //     `null`;
  //   - `wroteCentre` was index-aligned to the **second** read of `init.cities` while
  //     `standOnPicks` maps the first, so a `cities` getter returning a shorter array the second
  //     time silently moved a city the caller **did** locate onto its pick's coordinate and then
  //     attributed it `{CH, picked}` with confidence — the worse of the two, and it needs no
  //     disagreement about `undefined` at all.
  //
  // **§8.4 A-86 Part 2's trigger names the fix in as many words** — *"bind the value once, write
  // it into both fields"* — and this is it, applied to every field rather than to `centre`.
  // §2.1 **A-23**'s standing rule is the general form: *within one traversal, a field of a
  // caller-supplied value is read exactly once; the value that was checked is the value that is
  // used, compared, redacted and emitted.* `packages/core/test/pickCentre.test.ts` measures it
  // with a counting accessor on all seven `CityInit` fields, on all eleven of `TripInit`'s, and
  // on `init.cities` itself. **Nothing below this pass may reach for `init` or `c` again.**
  const cityInits = init.cities ?? [];
  const minted = cityInits.map((c, i) => {
    // The seven reads. Everything downstream — the record, `wroteCentre`, `standOnPicks` — takes
    // the local, so no two consumers can be handed different answers to the same question.
    const key = c.key;
    const name = c.name;
    const countryCode = c.countryCode;
    const centre = c.centre;
    const pick = c.pick;
    const order = c.order;
    const meta = c.meta;
    //
    // §8.4 A-83 Part 8 / A-82 Part 7. `{0,0}` used to stand in for a missing `centre`; it is
    // *"a value nobody measured, wearing the shape of one"*, and every hand-entered city was a
    // summary row claiming 0°N 0°E. The honest hole is `null`.
    //
    // **§8.4 A-85 Part 2 (QA R62-2, ROADMAP I-24), and the shape of the test is the ruling.**
    // `c.centre ?? null` stood here and it is what made the shortest call a picker screen writes
    // — `{name, pick}`, no `centre` — store a well-formed pick on a city with no coordinate:
    // stale at birth by A-84 Part 3 clause 3, attributing nothing, forever.
    //
    // **This is a test on PRESENCE and it may never become `??`.** `??` collapses *absent* and
    // *written `null`* into one value, and those are the two cases this whole ruling separates:
    // absent beside a pick means *the point the pick names*; a written `null` beside a pick is
    // A-84 Part 3 clause 3's **erase** case, in which the pick is kept and inert and the city
    // reports `{null, null}`. In the stored document they are the same two fields — only a door
    // can tell them apart, so the rule lives at the door.
    //
    // **The presence test is `centre !== undefined`. There is ONE spelling and this is it —
    // §8.4 A-86 Part 1 (QA R63-7, ROADMAP I-25 Part 2)**, and since R64-1 there is also one
    // **expression**: this constant is what the record and `wroteCentre` both consume, so the
    // two can no longer be computed over two different reads. A-85 Part 2's *"does not carry a
    // `centre` key"* read as `'centre' in c`, and I-24 Part 1 wrote the rule both ways; the two
    // differ on exactly one input, `{name, centre: undefined, pick}`, which `in` refuses at
    // `$.cities[0].centre` and `!== undefined` defaults. A-86 Part 1 rules `!== undefined`, and
    // `'centre' in c` may not be reintroduced, for three reasons:
    //
    //   - **the declared type cannot tell the two apart, so the door may not.** `CityInit.centre`
    //     is optional and this project does not set `exactOptionalPropertyTypes`, so `{name,
    //     pick}` and `{name, centre: undefined, pick}` are the SAME type — and a door whose
    //     behaviour splits on a distinction its own signature does not carry is a door whose
    //     contract cannot be read off the contract;
    //   - **`in` refuses a call that type-checks and is correct.** `{...defaults, ...patch}`
    //     leaves `centre: undefined` behind whenever `patch` carries no centre — the ordinary
    //     shape of a form's submit handler, which is the caller the picker will be;
    //   - **it is already this door's settled convention**, stated below for `datePrecision` and
    //     recorded as BUILD-NOTES **KD-101**: absent and `undefined` mean *take the default*, and
    //     `null` is a value the caller supplied. A second convention on a neighbouring field of
    //     the same object is how the next reader gets it wrong.
    //
    // **This is a read of the PROPERTY, not of the own-property table — A-86 Part 2, and it is
    // written here so nobody adds a guard.** An INHERITED `centre` (`Object.create({centre:
    // null})`) is the caller's value and is honoured exactly as a written one: the `null` erases,
    // the pick is kept and inert, and nothing is minted onto a point the caller did not confirm.
    // **`hasOwnProperty` may not be introduced at this door.** The parser one line later reads
    // the chain, so an own-key guard above a chain read is R63-1's shape exactly — the quality of
    // an answer depending on *where* a key lives rather than on *what* it says — and it would
    // have to be applied to all five of `centre`, `pick`, `order`, `meta` and `key` rather than
    // to one.
    //
    // Which cities the caller wrote a `centre` for is captured HERE, beside the record it is
    // aligned with, because it is the INIT that holds the distinction and the stored document
    // does not (A-85 Part 2 clause 2) — and because an alignment computed in a second traversal
    // is an alignment a second traversal can lose (R64-1's second shape).
    const wroteCentre = centre !== undefined;
    //
    // **The pick's coordinate is NOT read here — QA R63-1 (MAJOR) and R63-2.** The record used to
    // be built from `c.pick ? {lat: c.pick.centre.lat, lng: c.pick.centre.lng} : null`, which put
    // a raw dereference in FRONT of the parser that A-84 Part 3 clause 2 says refuses a malformed
    // pick *"at a named JSON path, at every door"*. Two harms, both measured:
    //
    //   - a pick with **no `centre`** — clause 2's own case, *"a pick without a coordinate is not
    //     a pick"* — left this door as `TypeError: Cannot read properties of undefined (reading
    //     'lat')`, with no path, no city and no row id, **whenever the caller had not written a
    //     `centre` key**. Written `centre: null` beside the same value was refused correctly, so
    //     the quality of the refusal depended on a key the malformed value has nothing to do with;
    //   - reading `pick.centre` here and again in the parser is **two reads of a caller-owned
    //     object**, so a getter-backed (reactive, `Proxy`) init could mint a city whose `centre`
    //     disagreed with the `pick.centre` stored beside it — a pick **stale at birth**, which is
    //     the exact state A-85 Part 2 exists to prevent, reached without anyone writing `null`.
    //
    // So the door writes the honest hole here and stands the city on the pick **below the commit**
    // (`standOnPicks`), off the record the parser returned. One rule, one read, and the refusal
    // path no longer depends on whether `centre` was written.
    const city: City = {
      // §2.2 A-10. `??` and not `||`: an explicit key is honoured verbatim, and `''` is a key
      // the document already carries — minting over it would silently orphan every
      // `Day.primaryCity`, `Place.cityKey` and pool placement pointing at it. `validateTrip`
      // is what says such a document is broken (§2.9); `createTrip` does not repair it.
      key: key ?? ctx.ids.newId('city'),
      name,
      countryCode: countryCode ?? '',
      centre: wroteCentre ? centre : null,
      pick: pick ?? null,
      order: order ?? i,
      ...(meta ? { meta } : {}),
    };
    return { city, wroteCentre };
  });
  const cities: City[] = minted.map((m) => m.city);
  const wroteCentre: readonly boolean[] = minted.map((m) => m.wroteCentre);
  // The trip's own two multi-read fields, bound for R64-1's reason and no other: the record
  // below read `init.datePrecision` twice (the `=== undefined` test and the else-branch) and
  // `init.meta` twice (the guard and the spread). Same class as `c.centre`'s three reads, same
  // fix — bound once here, consumed once below.
  const datePrecision = init.datePrecision;
  const tripMeta = init.meta;
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
    datePrecision: datePrecision === undefined ? 'exact' : datePrecision,
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
    ...(tripMeta ? { meta: tripMeta } : {}),
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
  // §8.4 **A-85 Part 2**, after the parse rather than before it (QA **R63-1**/**R63-2**).
  const stood = standOnPicks(checked, wroteCentre);
  const ready = stood === checked ? checked : commit('createTrip', checked, stood);
  return commit('createTrip', ready, ensureDays(ready, ctx));
}

/**
 * §8.4 **A-85 Part 2**, as amended by **A-86 Part 1**: a city whose init carried a `pick` and
 * whose `centre` is **`undefined`** — the key absent, or written as `undefined` — stands on the
 * point the pick names — a **copy** of `pick.centre`, never the pick's own object, because
 * aliasing would let a later in-place edit of `City.centre` silently move the one value A-84
 * Part 3 clause 3's staleness test compares against.
 *
 * **It runs on a trip `commit` has already parsed, and that placement is the ruling of QA R63-1.**
 * Every `pick` here came out of `parseCityPick`, so `pick.centre` is a `LatLng` this parser has
 * accepted — the dereference cannot throw, and a malformed pick never reaches this function at
 * all: it was refused one line up, at `$.cities[i].pick…`, with the city named, **whether or not
 * the caller wrote a `centre`**. It is also the **only** read of the pick's coordinate the door
 * makes, so a caller-owned object with a getter cannot be made to disagree with itself — the
 * value stored in `City.centre` is copied off the value stored in `City.pick`, not off a second
 * read of the caller's.
 *
 * Pure. Returns `trip` **by reference** when no city stands on a pick, so the common case mints no
 * object and `commit` has nothing to re-parse.
 *
 * @param wroteCentre index-aligned with `trip.cities`: was the *init*'s `centre` anything other
 *        than `undefined`? (A-86 Part 1's one spelling; an INHERITED `centre` counts, A-86
 *        Part 2.) Such a `centre` is honoured verbatim, `null` included — that is A-84 Part 3
 *        clause 3's erase case, and it is a distinction only a door can see.
 *        **The alignment is structural since QA R64-1**: both this array and `trip.cities` come
 *        out of the SAME traversal of the same single read of `init.cities`, so there is no
 *        second read for the two to be aligned against differently.
 */
function standOnPicks(trip: Trip, wroteCentre: readonly boolean[]): Trip {
  let moved = false;
  const cities = trip.cities.map((city, i) => {
    if (wroteCentre[i] === true) return city;
    const pick = city.pick;
    if (pick === null) return city;
    moved = true;
    return { ...city, centre: { lat: pick.centre.lat, lng: pick.centre.lng } };
  });
  return moved ? { ...trip, cities } : trip;
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
