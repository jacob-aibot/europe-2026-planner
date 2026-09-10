/**
 * Lifetime travel statistics (ARCHITECTURE §8.4 clause 2, specified by **A-31**).
 *
 * **Every statistic is derived. Nothing counts anything into storage.** A stored
 * `countriesVisited: 47` is a second source of truth that can disagree with the trips it
 * summarises, and — the reason it matters for this product specifically — it is a number a user
 * can inflate by typing. Principle 1 says real-world travel is the source of truth, so a derived
 * statistic cannot drift from the travel it is derived from. The same rule pre-decides goals and
 * achievements (§8.8): a goal is a declarative target evaluated against `TravelStats`, never a
 * counter that is incremented.
 *
 * The input is the library's **summary rows** and not documents: §4.2's *"exactly ONE trip in
 * memory at a time"* is not negotiable, and the lifetime map is precisely the screen that would
 * want forty. Everything this function needs was minted inside the write that carried each
 * document (§8.4 clause 1) and stamped with `SUMMARY_VERSION` (clause 3).
 *
 * Zero dependencies, no ambient clock: `today` is injected, exactly as `lifecycle`'s is.
 */
import type { CountryCode, IsoDate } from '../model/ids.ts';
import type { AttributionCensus, TripSummaryRow } from './summary.ts';
import { dayNumber, fromDayNumber } from './summary.ts';
import { lifecycle } from './lifecycle.ts';
// By module path, exactly as `normalizeCityName` below is: `isIsoDate` is already on §2.10's
// surface (76 → 77, §2.9 A-46 Part 2) for `packages/client`'s row gates, and §8.4 **A-59** adds
// no symbol to it. This is core calling core, and the import shape does not grow the surface.
import { isIsoDate } from '../model/ids.ts';
// By module path on purpose. `normalizeCityName` is deliberately **off** `index.ts` (§2.14
// A-14): nothing outside `packages/core` needs to fold a city name, and §2.10's surface does
// not grow to let one module inside core call another.
import { normalizeCityName } from '../model/cityName.ts';

export type TravelStatsCountry = {
  code: CountryCode;
  /** The `startDate` of the earliest travelled trip carrying this code. */
  firstVisit: IsoDate;
  /** The clamped end of the latest travelled trip carrying it — never after `today`. */
  lastVisit: IsoDate;
  /** In canonical row order. `TripSummaryRow.id` is a plain `string`, so this is too. */
  tripIds: string[];
  /**
   * **A-34.** True when no `completed` trip contributed this row.
   *
   * A-31 Part 5 residue 2 licenses an `active` trip contributing **all** of its countries,
   * un-clamped by the day it has actually reached, because the row carries no day-level
   * attribution. That licence holds only because the contribution is **marked**: a surface
   * renders a provisional row visibly differently and never as a visited fact with dates.
   * It is a caveat — *"the evidence is from a trip you are on"* — and not a negation.
   */
  provisional: boolean;
};

export type TravelStatsCity = {
  /** `normalizeCityName(name)` — a grouping key, never a `CityKey`, never `''`. */
  nameKey: string;
  /** The raw display name from the first member in canonical row order. */
  name: string;
  countryCode: CountryCode | null;
  tripIds: string[];
  /** **A-34.** True when no `completed` trip contributed this row. See `TravelStatsCountry`. */
  provisional: boolean;
  /**
   * **§8.4 A-56** Part 7. The earliest `cities[].firstDay` over the contributing rows, clamped
   * exactly as a country's is — and this is what closes **A-31 Part 5 residue 1 for cities**.
   *
   * A row that carries no day range for the city (`firstDay === null`, or a version-4 row with
   * no such key) falls back to **the trip's own range**: *"this city has no days"* is not
   * *"this city has no dates"*. The answer is then never worse than residue 1's own behaviour,
   * and a past trip recorded without a day skeleton still gets a date on its stamp.
   *
   * **That fallback has three triggers, not one** — §8.4 **A-59** Part 2 (a stored edge that is
   * present and not an `IsoDate`, counted in `unreadableCityDates`) and **A-60** Part 2 (an
   * edge pair the row's own clamp interval does not intersect) each take the same answer, for
   * the same stated reason: the row carries nothing usable about *when*, so the trip's own
   * range is what there is to say.
   *
   * **A `null` or absent edge is a VALUE and keeps its per-field `??`** (§8.4 **A-60 Part
   * 6.2**): a city supplying exactly one readable edge reports that edge, with the trip's own
   * corresponding end standing in for the other. Only *unreadable* evidence poisons the field
   * beside it. **Trigger 3 is read over the edges the entry supplied** (Part 6.3) — a lone
   * `lastDay` before the window is disjoint even though the substitute for its missing
   * `firstDay` would have landed inside it.
   *
   * **The ceiling, §8.4 A-60 Part 6.4, superseding Part 2's:** every day a city line names lies
   * inside its row's `[a, b]`, so no city line ever escapes the country line beside it at the
   * same clock; and every range a city line names either is `[a, b]` entire or has at least one
   * end the row actually supplied. It is **not** a claim about width — a city line may be
   * legitimately narrower than its country's, and that precision is what A-56 bought.
   */
  firstVisit: IsoDate;
  /** The latest `lastDay`, clamped — never after `today`, never before `firstVisit`. */
  lastVisit: IsoDate;
};

/**
 * What there was to attribute, and what could not be — the same three record classes twice.
 *
 * These fields are count-shaped and live in `packages/core`, so ROADMAP exit criterion 6b's scan
 * finds them; they are allow-listed there as the **return type of a pure function**, which has no
 * storage representation at all. That is the criterion rather than an exception to it, and the
 * allow-list's own reasoning — including the two entries A-31 Part 6 did not enumerate — is
 * BUILD-NOTES **KD-64**. `test/stats-storage.test.ts` pins the thing it rests on: nothing under
 * `ports/`, `serialize/` or `store` may import `TravelStats`.
 */
export type TravelRecordCensus = { cities: number; places: number; stops: number };

/**
 * One stored value the derivation could not read — §8.4 **A-87** Part 4.
 *
 * **This is what makes a row nameable on the SUCCESS path.** Before it, a row was nameable only
 * if something threw: `travelHistory`'s `rowId`/`unreadableRows` are computed inside its own
 * `catch`, so the moment a fault was *absorbed* rather than fatal — which is the direction A-59
 * Part 2 and A-86 Part 4 correctly pushed every one of these — nothing anywhere said which row it
 * was on. Attribution stops being a property of the failure path.
 *
 * A new gate adds a **row to this list**, never a field to `TravelStats`, and that is the
 * property that closes the class (A-86 Part 8 residue 1's own trigger, fired).
 */
export type TravelStatsAbsorption = {
  /** The library row it was found on — `TripSummaryRow.id`, whatever the row's lifecycle. */
  rowId: string;
  /**
   * Where on the row, as a path: `cities`, `cities[3]`, `cities[3].name`, `countryCodes[1]`,
   * `attribution.places.located`. Stable enough for a surface to print; **never parsed by core**.
   */
  path: string;
  /**
   * The level the value failed at. `list` — a container that is not an array; `entry` — a list
   * member that is not an object; `field` — one stored scalar of a record; `date` — the
   * entry-scoped `firstDay`/`lastDay` pair (A-59 Part 2's *one end unreadable makes the pair
   * unusable*, which is why it is one absorption at the entry and never two); `census` — the
   * `attribution` subtree.
   */
  kind: 'list' | 'entry' | 'field' | 'date' | 'census';
};

export type TravelStats = {
  countries: TravelStatsCountry[];
  cities: TravelStatsCity[];
  trips: { planned: number; active: number; completed: number };
  daysTravelled: number;
  /**
   * **What there WAS, per record class, counted as RECORDS** — §8.4 **A-84** Part 7 item 1
   * (QA **R61-6**). `seen − located` is the number of records with no coordinate at all, and it
   * is the only way that number is derivable: `cities` groups by `nameKey` **across trips**, so
   * two trips each holding an unlocated Paris subtract to **1** where there are **2** records.
   *
   * **`seen`, not `unlocated`** — two stored counts that can disagree is the defect, not the fix.
   * The type's own invariant is `unattributed <= located <= seen`, per class, and it holds by
   * construction: every summand below is clamped to the `located` it sits beside.
   *
   * **All three classes are exact, from generation 8 (§8.4 A-85 Part 3, QA R62-1).** Cities come
   * from `cities[]`, record by record; stops from `stopCount + poolCount`; and places from
   * **`placeCount`**, which the row gained precisely because the *"`places` is a lower bound"*
   * disclosure that stood here was a column whose denominator the row did not hold — so
   * `seen − located` for places was `0` always, the one number `seen` exists to make derivable.
   * A row minted before generation 8 carries no `placeCount`, reads 0 through `countOf`, and is
   * held at its own `located` by the clamp until the rescan reaches it.
   *
   * **No version moves for this field.** `TravelStats` is derived and never stored (A-34's
   * precedent, already load-bearing for `provisional` and `unnamedCities`), and
   * `test/stats-storage.test.ts`'s 6b-5 pins it.
   */
  seen: TravelRecordCensus;
  /** What there was to attribute. The denominator, and the *"no places yet"* test. */
  located: TravelRecordCensus;
  /** The honest hole, on screen. Never greater than `located`, per class. */
  unattributed: TravelRecordCensus;
  /**
   * **Every stored value the derivation could not read, over the WHOLE library** — §8.4 **A-87**
   * Part 4. In the canonical row order this function already computes (`startDate`, then `id`),
   * and within a row in the order the reader visits its fields; deterministic for the same reason
   * every other output here is.
   *
   * **Lifecycle-blind, and that is A-87 Part 5's ruling rather than an oversight.** A-31 Part 3's
   * travelled-only rule governs the **lifetime map** and its argument is about *inflation* — a
   * country you have not been to is not on the map of everywhere you have been. An absorption is
   * not inflatable by planning: a corrupt `planned` row is corrupt **today**, its repair is
   * available today, and it will be travelled later carrying the same corruption. So absorptions
   * accumulate over every row the library holds, while every count that is about **travel** —
   * `countries`, `cities`, `daysTravelled`, `seen`, `located`, `unattributed`, `unnamedCities` —
   * stays travelled-only.
   *
   * **A new gate adds a row here, never a field to this type.** `unreadableCityDates` and
   * `unreadableCityLists` below are computed **from this list at one site**, so they cannot drift
   * from it; A-86 Part 8 residue 1's *"all three fold in"* is deliberately not applied literally
   * (A-87 Part 4), and `unnamedCities` does not fold in at all because it is a **census** fact and
   * not a storage one.
   *
   * **Residue (A-87 Part 4):** the two scalars have no reader `absorbed` could not serve.
   * **Trigger:** the first surface that reads `absorbed` — at that moment they have no consumer
   * and they go. **Residue (A-87 Part 10 item 1):** this list is bounded by what the user stored
   * and by nothing else. **Trigger:** the first surface that renders the list rather than a count,
   * which caps its own display and says it is capping.
   */
  absorbed: readonly TravelStatsAbsorption[];
  /**
   * Cities whose name folds to `''` — counted, never merged into a blank row.
   *
   * **§8.4 A-87 Part 3 rule 3 widens the population by one clause:** the stored `name` folded to
   * `''`, **or was not a string at all**. An unreadable `name` is a *field* gate and not an entry
   * gate, so it behaves exactly as a name folding to `''` already does — the entry still counts in
   * `seen.cities`, still counts in `located`/`unattributed` if its centre is readable, produces no
   * city row, and lands here. The absorption itself is on `absorbed`.
   *
   * **Travelled-only, and it is the control that proves A-87 Part 5 is a line and not a
   * convenience.** This counts what the **census** lost; `absorbed` records what the **storage**
   * cannot say. A planned row's cities are never folded, so nothing about them was dropped from
   * the census and there is nothing here to count.
   */
  unnamedCities: number;
  /**
   * §8.4 **A-59**. City entries whose STORED `firstDay`/`lastDay` was present and unreadable,
   * and, where the row is travelled, the entry took the trip's range. Counted **per entry**, not
   * per field: the maximum is one per `cities[]` entry across the whole library. `null` and absent
   * are values, not defects, and are NOT counted — a version-4 row the rescan has not reached
   * carries neither key, and A-56 Part 7 clause 2 is its correct answer.
   *
   * **A view of `absorbed`, computed at one site** (§8.4 **A-87** Part 4): the number of `date`
   * absorptions. Computed rather than counted, it cannot drift from the channel. Its consequence
   * clause is scoped rather than stated flatly because absorption is now lifecycle-blind (A-87
   * Part 5) — on a *planned* row nothing falls back, and the old sentence would be false.
   *
   * This is `unnamedCities`' own idiom, one field over, and for its stated reason: skipping it
   * without counting would be silent loss, which is why the count is a field. A-37 Part 5
   * residue 2 is the mistake it exists not to repeat.
   *
   * **`SUMMARY_VERSION` does not move for it.** `TravelStats` is derived and never stored
   * (A-34's precedent for `provisional`), and `test/stats-storage.test.ts`'s 6b-5 pins that.
   */
  unreadableCityDates: number;
  /**
   * §8.4 **A-86** Part 4 (QA **R63-9**). **Library** rows whose STORED `cities` was **present and
   * not an array**, so the row contributed **no** cities to the census at all. Counted **per
   * row**: a row says *"these are my cities"* once, and a single unreadable answer is one
   * absorption however many entries it was meant to hold.
   *
   * **`Library`, not *"travelled"* — §8.4 A-87 Part 5 (QA R64-3 §C2/§C3) changed this word and it
   * is the one behaviour change on this field.** The count used to be accumulated inside the
   * travelled walk on A-31 Part 3's authority, so the same corrupt row was reported when the trip
   * was `completed` and silent when it was `planned` — which is exactly the non-uniformity this
   * walk's own `attribution` comment already condemns about QA R28-3. A-31 Part 3 governs the
   * lifetime map and never governed absorption. It is now the number of distinct rows carrying a
   * `list` absorption at path `cities` on `absorbed` above, computed **at one site**.
   *
   * **`undefined` and `null` are values, not defects, and are NOT counted** — a row minted
   * before summary generation 3 carries no `cities` key, and contributing none is its correct
   * answer. That three-way split is exactly the one `packages/client`'s `rowStatsReadable`
   * already draws — **and since A-87 Part 6 the predicate IS one call to this function**, so the
   * agreement A-86 Part 4 item 2 had to buy with an assertion is now an identity and the
   * assertion beside it is a tripwire (`packages/client/test/row-stats-readable.test.ts`).
   *
   * **Why a count and not the throw it replaced.** `I-24` Part 4's `Array.isArray` guard is
   * right and is not reopened: A-59 Part 2's line is *a stored value that gates the record's
   * participation throws; a stored value the record has a documented fallback for takes the
   * fallback*, and `cities` has one. What the guard traded is a **loud** failure for a
   * **silent** one — `travelHistory` now returns `ok: true` with no banner and no named row —
   * and A-59 Part 3 already ruled that class: a silently absorbed value is A-37 Part 5 residue
   * 2's mistake repeated, which is why the count is a field.
   *
   * **`SUMMARY_VERSION` does not move for it.** `TravelStats` is derived and never stored
   * (A-34's precedent for `provisional`), and `test/stats-storage.test.ts`'s 6b-5 pins that.
   */
  unreadableCityLists: number;
};

/**
 * `null` is a distinct group key. The country goes FIRST in the composite key and is always
 * exactly two characters — **because the value has been read through `isMintedCode` below and
 * is either two ASCII capitals or this two-character sentinel** — so the split is unambiguous
 * whatever the folded city name contains.
 *
 * §8.4 **A-37** Part 3. This docstring used to cite the *mint* (*"a `CountryCode` is
 * `/^[A-Za-z]{2}$/`, §8.4 A-29's gate"*), which is a true statement about a **document** and a
 * false one about a row: A-29's gate runs at the mint and nothing revalidates a stored row on
 * the way back in. A stored `'--'` collided with this sentinel exactly. The guarantee is made
 * true by the gate rather than withdrawn, because withdrawing it leaves the key ambiguous.
 */
const NO_COUNTRY = '--';

// ---------------------------------------------------------------------------
// §8.4 **A-37** — the two read gates. A `TripSummaryRow` is not a validated document: it is
// read out of storage by `listTrips()`, it passes through no parser and no validator on the
// way in, and `SUMMARY_VERSION` tells a reader WHEN a row was minted, never THAT it is
// well-formed. Every claim this function makes about a field value it read is discharged here,
// on the read. Both are module-private: no new export, no new type, no `Issue` channel, no
// throw, and no `SUMMARY_VERSION` bump — a gate on the read of a field is not a change to the
// field, and `tripSummary` is unchanged (residue 3).
// ---------------------------------------------------------------------------

/** `IsoDate`'s domain, computed from A-32 Part 4's statement rather than transcribed as two
 * magic integers, so it cannot drift from the statement it implements. */
const DOMAIN_MIN = dayNumber('0000-01-01' as IsoDate); // -719528
const DOMAIN_MAX = dayNumber('9999-12-31' as IsoDate); //  2932896
/** §8.4 A-37 Part 2. A row is not a document: its dates carry no issues and were never revalidated. */
const inDomain = (n: number): number => Math.min(DOMAIN_MAX, Math.max(DOMAIN_MIN, n));

/**
 * §8.4 A-37 Part 3. A *minted* `cities[].countryCode` is `/^[A-Z]{2}$/` — A-29's gate checks
 * `/^[A-Za-z]{2}$/`, uppercases, and then requires index membership, so uppercase is the shape
 * the mint emits. A *stored* one is whatever is in the database. This is deliberately the
 * MINT'S OUTPUT shape and not A-29's acceptance shape: they are different rules on different
 * sides, and sharing one predicate would make a lowercase stored code a second city row.
 *
 * Index membership is NOT re-checked here: `travelStats` takes no index, stays pure and
 * index-free (A-31 Part 4), and membership is the mint's job.
 */
const isMintedCode = (v: unknown): v is CountryCode => typeof v === 'string' && /^[A-Z]{2}$/.test(v);

/**
 * **§8.4 A-84 Part 7 item 1 + A-37 Part 3's idiom, one field over.** A stored count, read as a
 * count or as nothing.
 *
 * `stopCount` and `poolCount` have been on the row since generation 1, but a stored row is not a
 * validated document: a hand-edited one can carry `'12'`, `-1`, `1.5` or `NaN`. Every one of
 * those is **one answer** — *this row does not say how many records it had* — and contributes
 * `0`, which the `Math.max` at the accumulation site then floors at the row's own `located`.
 *
 * **§8.4 A-86 Part 5 (QA R63-6) — recorded residue: a stored count is BELIEVED. It is floored
 * at zero and at the row's own `located`, and it is capped by nothing** — a row hand-edited to
 * `placeCount: 4000` publishes `seen.places` 4000 for a document holding 95, and `1e21`
 * publishes `1e+21`. **No ceiling is added, and the reason is that there is nothing to derive
 * one from**: for places the row *is* the denominator (unlike `cities[]`, which the row carries
 * record by record), so a cap would be A-82 Part 7's *"a value nobody measured, wearing the
 * shape of one"* applied to a bound. `stopCount + poolCount` has had the identical property
 * since generation 1. **First trigger to reopen, and it is the one that will actually fire: the
 * first surface that renders `seen − located` as a SENTENCE** — *"n places have no coordinate"*
 * — rather than as two numbers side by side, which is a claim about the user's own data that a
 * corrupt row can make arbitrarily large; that surface owes the recompute affordance beside it
 * (A-59 Part 5). **Second: the first time a stored count drives a decision rather than a
 * display** — a filter, a sort, a threshold, a streak — at which point the decision defines a
 * bound and one stops being arbitrary. `cli.ts stats` prints the two numbers on separate lines
 * and is a developer surface, so neither has fired.
 */
const countOf = (v: unknown): number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0;

/**
 * **§8.4 A-83 Part 8 + A-37 Part 3's idiom.** Whether a stored `cities[].centre` is a coordinate.
 *
 * A stored summary row is not a validated document, so this is a check on **shape** and not on
 * presence: `null` (a version-6 row for a city nobody located), `undefined` (a version-4 row,
 * which had no such key at all), a string, an array and `{lat: NaN}` are all **one answer** —
 * *this row does not say where the city is*, therefore the city is not located. Module-private:
 * §2.10's export surface does not move for it, and it is reachable through `travelStats`.
 */
const isLocatedCentre = (v: unknown): boolean => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const o = v as { lat?: unknown; lng?: unknown };
  return typeof o.lat === 'number' && Number.isFinite(o.lat)
    && typeof o.lng === 'number' && Number.isFinite(o.lng);
};

/**
 * §8.4 **A-59** Part 2 — the third read gate, and the one A-37 never reached.
 *
 * A stored `cities[].firstDay`/`lastDay` that is **present and not an `IsoDate`** is read as
 * *"this city has no usable day edge"* — exactly what `null` means — and takes A-56 Part 7
 * clause 2's fallback to the trip's own range. It does not throw, and the reason it does not is
 * not a reversal of A-37 Part 2's grandfathered `startDate`/`endDate` throw: **a stored value
 * that gates the record's participation throws; a stored value the record has a documented
 * fallback for takes the fallback.** The row's own dates decide whether it is classified,
 * counted, mapped and dated at all, and there is nothing to degrade to; a city's cached day
 * edge decides none of that, and a corrupt edge is strictly *less* informative than an absent
 * one, so treating it as absent invents nothing.
 *
 * `null`/absent is `false` here — it is not *unreadable*, it is a value — and the caller reads
 * the two apart. **`core.isIsoDate` and nothing else** (A-46 Part 2's rule): a hand-rolled
 * calendar check is the second-implementation defect A-20, A-21, A-37 and A-45 each treated
 * once. It is deliberately stricter than the throw it replaces — a calendar-invalid
 * `'2026-02-30'` would have normalised through A-32 Part 4 to `2026-03-02`, a date nobody
 * typed, and a declared fallback beats a guessed date (residue 2).
 */
const isUnreadableDay = (v: unknown): boolean => v !== null && v !== undefined && !isIsoDate(v);

// ---------------------------------------------------------------------------
// §8.4 **A-87** — the derive-path read rule, and the ONE reader that discharges it.
//
// > A function on the derive path that reads a **stored** record reads each field it uses
// > through a gate that is **total over `unknown`**, and reads it **exactly once**. A gate is
// > three-way: absent or `null` is a **value** (the documented fallback applies and nothing is
// > counted); the declared shape is the value; anything else present is a **defect** taking the
// > **same** documented fallback and **reported**. A container fails at its own level and takes
// > everything below it with it, reported once at that level. **No derive-path expression may
// > dereference a stored field that has not been through its gate — and a method call is a
// > dereference** (`.normalize`, `.replace`, `for…of`). The obligation is discharged **per record
// > class, at one reader**, never per call site.
//
// `readRow` below is that reader. It runs once per row over the **whole library**, returns the
// gated values the folds need plus the absorptions it made, and **the folds read only its
// output** — which is what makes *"read exactly once"* structural rather than counted: a consumer
// that reads the reader's output cannot re-read the stored field.
//
// Five things a builder does not get to decide (A-87 Part 3), all of them here:
//   1. One absorption per failing value, at the level the value failed. `seen.cities` is
//      unchanged — it stays the length of the stored array, absorbed entries included, because
//      an unreadable entry is still a record the row carries (A-85 Part 3).
//   2. The date pair is entry-scoped (A-59 Part 2's *one end unreadable makes the pair
//      unusable*): one `date` absorption per entry, never two.
//   3. `name` is a FIELD gate, not an entry gate — a reader that kills the entry on `name` and
//      degrades it on `centre` is A-86 Part 1 reason 3's second convention on a neighbouring
//      field of one object.
//   4. `attribution` is gated at all three levels and its numbers go through `countOf`, so a
//      `'5'`, a `NaN` and a `-1` are all 0 and none of them can reach an output. A-86 Part 5's
//      *no ceiling* stands: `countOf` floors and does not cap, and nothing here adds a cap.
//      **§8.4 A-88 Parts 5 and 6 correct this rule in place:** the three object levels are gated
//      by a real stored-record test (`isStoredRecord`), and the two census numbers are gated
//      **independently** — an absent half is a value and the readable half beside it survives.
//      The same ruling brings `stopCount`/`poolCount`/`placeCount` inside this reader, which
//      were the last stored numbers read outside it and reported by nothing.
//   5. The value arm is `undefined` **and** `null`, uniformly, on every field. `countryCodes:
//      null` therefore stops throwing and starts contributing nothing, uncounted — the one
//      behaviour change here that is not a repair. A field whose `null` is a defect beside a
//      field whose `null` is a value is the second convention A-86 Part 1 reason 3 refused, and
//      the observable outcome of `countryCodes: null` is identical to `countryCodes: []`, a row
//      that legitimately visited nowhere. **Residue, re-worded by §8.4 A-88 Part 7 (QA R65-7),
//      because the original trigger was written in the direction that can never fire:** on a
//      field every generation has written, the value arm has **no population**, and its cost is
//      real — `countryCodes: null` makes a row's stored country list vanish from the lifetime
//      map, uncounted. The arm is kept because uniformity across neighbouring fields is worth
//      more than the one shape it costs. **Trigger:** a `SUMMARY_VERSION` generation that
//      **omits** a field it used to write — which is what gives the arm its population, and is
//      why the arm is right for `cities` (arrived at version 2) and empty for `countryCodes`
//      (version 1). **Second trigger:** the first surface that must distinguish *"visited
//      nowhere"* from *"says nothing"* — carried by `absorbed`, per row and per path, not by a
//      per-field convention. *(The old trigger read "a measurement that a shipped write path can
//      produce it": a write path producing `null` is exactly what would make `null` a **value**,
//      so it argued the opposite of what the residue records.)*
//
// **`key` and `countrySource` get no gate**, because no derivation reads them. That is safe
// because `test/stats-storage.test.ts`' covering table **asserts** them inert: the day a
// derivation starts reading one, its cell's expectation changes and the test demands the gate.
// ---------------------------------------------------------------------------

/**
 * **A stored record** — §8.4 **A-88** Part 6. Not `null`, not an array, and its prototype is
 * `Object.prototype` or `null`. **One predicate at all three object gates**: a `cities` entry,
 * the `attribution` container, and each census.
 *
 * Its predecessor was called `isPlainObject` and was not one — it asked `typeof v === 'object' &&
 * v !== null && !Array.isArray(v)` and nothing more. A-87 Part 7 excused that with *"storage
 * returns plain data from structured clone or `JSON.parse`"*, and **the "plain data" half of that
 * premise is false**: structured clone carries `Date`, `Map`, `Set`, `RegExp`, `BigInt` and
 * `Error`. Measured at `ede933f`, `attribution: new Date()` read as *"this row carries no
 * census"* and dropped both censuses in silence, and `cities: [new Error('boom')]` put a city
 * named `"Error"` on the lifetime map through `Error.prototype.name` — both of them A-87 Part 2
 * arm 3 not being honoured, reported one level down and not at their own level.
 *
 * **The prototype test has no false positive**, verified in this Node:
 * `structuredClone(Object.create(null))` comes back carrying `Object.prototype`, so nothing a
 * storage port returns is refused by it — and a genuinely null-prototype object, which
 * `JSON.parse` with a reviver can build, is accepted because it *is* a record.
 *
 * A-87 Part 7's scope-limit sentence is corrected with it: the population the covering table does
 * not reach is a stored value behind an **accessor**, and the reason is that neither structured
 * clone nor `JSON.parse` can produce one.
 */
const isStoredRecord = (v: unknown): v is Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const proto: unknown = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/** `countOf`'s own predicate, split out so the gate can tell *"not a count"* from *"zero"*. */
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** One city entry, after the gate. Every field is the declared shape or its documented fallback. */
type GatedCity = {
  /** The raw display name, or `''` where the stored one was unusable. */
  name: string;
  /** `normalizeCityName(name)`; `''` means *"no usable name"* and produces no city row. */
  nameKey: string;
  countryCode: CountryCode | null;
  /** A-83 Part 8: a centre that is not a coordinate — for any reason — is unlocated. */
  located: boolean;
  /** The edges the entry SUPPLIED. Unreadable is `null`, exactly as absent is (A-59 Part 2). */
  firstDay: IsoDate | null;
  lastDay: IsoDate | null;
};

/** One library row, after the gate. */
type GatedRow = {
  row: TripSummaryRow;
  /** The length of the stored `cities` array — A-85 Part 3's *total records the row carries*. */
  cityRecords: number;
  cities: GatedCity[];
  countryCodes: CountryCode[];
  /** `null` where the row carries no census for that class — A-31 Part 3's own answer. */
  places: AttributionCensus | null;
  stops: AttributionCensus | null;
  /**
   * **A-88 Part 6.** The three stored counts, gated here rather than at the fold, and carried as
   * the two totals the fold actually consumes: `stopCount + poolCount`, and `placeCount`.
   *
   * **Named `…Records` and not `…Count` deliberately**, exactly as the fold's own locals already
   * are: `test/stats-storage.test.ts`' name-based source tripwire classifies `stopCount: number`
   * outside `TripSummaryRow` as a stored lifetime count, and this is neither stored nor a
   * lifetime number — it is one row's own gated read, on the return path of a pure function
   * (6b-5 pins that nothing which persists anything imports this module). Widening that
   * allow-list is an architect's ruling; not tripping a false positive is not.
   */
  stopRecords: number;
  placeRecords: number;
};

/**
 * `attribution.places` / `attribution.stops`, gated at its own level and then **per number,
 * independently** — §8.4 **A-88** Part 5 (QA **R65-3**).
 *
 * A value present and not a stored record fails at its own level: one absorption at
 * `attribution.places`, and the documented fallback is A-31 Part 3's *"a row minted before
 * `SUMMARY_VERSION` 4 carries no census and contributes none"*.
 *
 * Otherwise **each number is gated three ways on its own, exactly as every other field on this
 * path is**: absent or `null` → `0`, uncounted, **no absorption**; a count → the count; anything
 * else present → `0` and one absorption at `attribution.places.located` / `.attributed`, through
 * `countOf`'s own predicate, so a `'5'`, a `NaN` and a `-1` are all `0`. **The pair is not a unit
 * for the value arm.**
 *
 * The arm this replaces — *"a census that does not carry both of its declared numbers is not a
 * census"* — inverted A-87 Part 2 arm 1 for one record class: `{located: 5}` reported a defect
 * for an **absent** number and discarded the readable observation beside it. A-87 Part 3 rule 5's
 * own argument decides it: **the value arm's outcome must equal the outcome of the legitimate
 * value it stands in for**, and `{located: 5}` ≡ `{located: 5, attributed: 0}` — five located
 * records, none recorded as attributed — which publishes `unattributed.places` **5**, the honest
 * hole. Deleting the 5 invents *"this row has no census"* out of a row that plainly has half of
 * one, which is the move A-60 Part 6.2 refused a whole record over.
 *
 * **Consequence, by ruling and not by accident:** `{places: {}}` is **inert** — neither number is
 * declared, so neither is counted, which is the same answer as `places: null` and as a
 * pre-`SUMMARY_VERSION`-4 row.
 */
function readCensus(
  value: unknown,
  path: string,
  absorb: (path: string, kind: TravelStatsAbsorption['kind']) => void,
): AttributionCensus | null {
  if (value === undefined || value === null) return null;
  if (!isStoredRecord(value)) {
    absorb(path, 'census');
    return null;
  }
  const rawLocated = value.located;
  const rawAttributed = value.attributed;
  let located = 0;
  let attributed = 0;
  if (isCount(rawLocated)) located = rawLocated;
  else if (rawLocated !== undefined && rawLocated !== null) absorb(`${path}.located`, 'census');
  if (isCount(rawAttributed)) attributed = rawAttributed;
  else if (rawAttributed !== undefined && rawAttributed !== null) absorb(`${path}.attributed`, 'census');
  return { located, attributed };
}

/**
 * A stored **count** — `stopCount`, `poolCount`, `placeCount` — §8.4 **A-88** Part 6's closing
 * clause. Absent or `null` → `0`, uncounted; a count → the count; anything else present → `0`
 * **and one `field` absorption at its own path**.
 *
 * These three were the reader's last exception: read through `countOf` outside the gate, a stored
 * `'x'` read `0` and was **reported by nothing** — a third convention for a stored number, beside
 * the census numbers, which absorb. **The published value is unchanged**: `countOf` still floors
 * and does not cap, so A-86 Part 5's *no ceiling* is untouched. What is added is the report.
 */
function readCount(
  value: unknown,
  path: string,
  absorb: (path: string, kind: TravelStatsAbsorption['kind']) => void,
): number {
  if (!isCount(value) && value !== undefined && value !== null) absorb(path, 'field');
  // The value stays `countOf`'s, deliberately: this adds the report and changes nothing else.
  return countOf(value);
}

/**
 * The reader. Pure apart from appending to the `absorbed` list it is handed, module-private, and
 * the **only** place any of these nine stored fields is read.
 *
 * Field order is the order absorptions are reported in for one row: `cities` and its entries,
 * then `countryCodes`, then `attribution`.
 */
function readRow(row: TripSummaryRow, absorbed: TravelStatsAbsorption[]): GatedRow {
  const rowId = row.id;
  const absorb = (path: string, kind: TravelStatsAbsorption['kind']): void => {
    absorbed.push({ rowId, path, kind });
  };

  // --- `cities` -----------------------------------------------------------
  // The list, then each entry, then each entry's five read fields. A list that is not an array
  // fails at its own level: the entries are not there to fail. **QA R62-6 / I-24 Part 4's
  // `Array.isArray` guard is not reopened** — what it owed was the report, which is here now.
  const storedCities: unknown = row.cities;
  const cities: GatedCity[] = [];
  let cityRecords = 0;
  if (storedCities !== undefined && storedCities !== null) {
    if (!Array.isArray(storedCities)) {
      absorb('cities', 'list');
    } else {
      cityRecords = storedCities.length;
      for (let i = 0; i < storedCities.length; i++) {
        const entry: unknown = storedCities[i];
        // **§8.4 A-88 Part 6.** One predicate — `isStoredRecord` — at this gate and at the two
        // `attribution` gates below. A-87's shipped comment defended admitting an array here
        // ("it then fails on its fields, one level down"); the defence does not hold, because
        // `[]` has no fields to fail, so it absorbed **nothing** and inflated `unnamedCities`
        // instead. One entry, one convention. `unnamedCities` falls to 0 for these shapes,
        // because an entry that fails at its own level is not asked for its `name` (rule 1) —
        // the same treatment `cities: [42]` already gets, which is the point.
        if (!isStoredRecord(entry)) {
          absorb(`cities[${i}]`, 'entry');
          continue;
        }
        const c = entry as Record<string, unknown>;
        // `name` — a FIELD gate (rule 3). Unreadable behaves exactly as a fold to `''`.
        let name = '';
        let nameKey = '';
        const rawName = c.name;
        if (typeof rawName === 'string') {
          name = rawName;
          nameKey = normalizeCityName(rawName);
        } else if (rawName !== undefined && rawName !== null) {
          absorb(`cities[${i}].name`, 'field');
        }
        // `countryCode` — A-37 Part 3's `isMintedCode`, now three-way. A `'--'` (which collided
        // with the composite key's sentinel), a `''`, an `'A|'`, an `'hr'` or a `42` is null AND
        // reported; absent and `null` are null and are not.
        let countryCode: CountryCode | null = null;
        const rawCode = c.countryCode;
        if (isMintedCode(rawCode)) countryCode = rawCode;
        else if (rawCode !== undefined && rawCode !== null) absorb(`cities[${i}].countryCode`, 'field');
        // `centre` — A-83 Part 8 stands verbatim (`null` is *unlocated*, first-class); this adds
        // the third arm, present-and-not-a-coordinate, which is a defect and not a value.
        const rawCentre = c.centre;
        let located = false;
        if (isLocatedCentre(rawCentre)) located = true;
        else if (rawCentre !== undefined && rawCentre !== null) absorb(`cities[${i}].centre`, 'field');
        // The date PAIR — A-59 Part 2, entry-scoped, at most one absorption per entry. Gated for
        // every entry, including one whose name folded away: the absorption is a fact about the
        // stored value, not about whether a consumer went on to use it.
        //
        // **QA R65-4, and the fix is R64-1's own: bind the value once.** These two were read
        // twice each — once by the predicate, once to build the entry — inside the increment
        // whose rule is *reads it exactly once*.
        const rawFirstDay: unknown = c.firstDay;
        const rawLastDay: unknown = c.lastDay;
        const unreadableDays = isUnreadableDay(rawFirstDay) || isUnreadableDay(rawLastDay);
        if (unreadableDays) absorb(`cities[${i}]`, 'date');
        cities.push({
          name,
          nameKey,
          countryCode,
          located,
          firstDay: unreadableDays ? null : ((rawFirstDay as IsoDate | null | undefined) ?? null),
          lastDay: unreadableDays ? null : ((rawLastDay as IsoDate | null | undefined) ?? null),
        });
      }
    }
  }

  // --- `countryCodes` -----------------------------------------------------
  // The container gate is the one nothing had: a string is **iterable**, so the unguarded
  // `for…of` read its CHARACTERS, every one failed `isMintedCode`, and the row's whole country
  // list vanished in silence (A-87 Part 1 shape 4). The entry gate is A-37 Part 3's read 2,
  // which now reports rather than skipping silently — A-31 Part 5 residue 2, discharged.
  const storedCodes: unknown = row.countryCodes;
  const countryCodes: CountryCode[] = [];
  if (storedCodes !== undefined && storedCodes !== null) {
    if (!Array.isArray(storedCodes)) {
      absorb('countryCodes', 'list');
    } else {
      for (let i = 0; i < storedCodes.length; i++) {
        const code: unknown = storedCodes[i];
        if (isMintedCode(code)) countryCodes.push(code);
        else absorb(`countryCodes[${i}]`, 'field');
      }
    }
  }

  // --- `attribution` ------------------------------------------------------
  const storedAttribution: unknown = row.attribution;
  let places: AttributionCensus | null = null;
  let stops: AttributionCensus | null = null;
  if (storedAttribution !== undefined && storedAttribution !== null) {
    if (!isStoredRecord(storedAttribution)) {
      absorb('attribution', 'census');
    } else {
      places = readCensus(storedAttribution.places, 'attribution.places', absorb);
      stops = readCensus(storedAttribution.stops, 'attribution.stops', absorb);
    }
  }

  // --- the three stored counts --------------------------------------------
  // **§8.4 A-88 Part 6's closing clause.** Read through the gate here rather than through a bare
  // `countOf` at the fold, so a stored `'x'` still publishes 0 and is no longer reported by
  // nothing. Last in the field order, so they are last in the row's absorption order.
  const stopRecords = readCount(row.stopCount, 'stopCount', absorb) + readCount(row.poolCount, 'poolCount', absorb);
  const placeRecords = readCount(row.placeCount, 'placeCount', absorb);

  return { row, cityRecords, cities, countryCodes, places, stops, stopRecords, placeRecords };
}

/**
 * Everywhere the traveller has actually been, derived from the library's summary rows. Pure.
 *
 * **The population is the travelled rows only** (§8.4 A-31 Part 3). `lifecycle(row, today)`
 * partitions every row three ways for `trips`; a `planned` trip then contributes **no country,
 * no city, no day and nothing to either census** — a country you have not been to is not on the
 * map of everywhere you have been, and a trip booked for next spring is the same inflation
 * clause 2 refuses `countriesVisited: 47` for, reached by planning instead of by typing.
 *
 * **An `active` trip is clamped at `today`.** A 14-day trip on its second day contributes 2 days
 * to `daysTravelled`, not 14, and its `lastVisit` is `today`. It does contribute all of its
 * countries and cities, unclamped: refining that needs day-level attribution, which the row does
 * not carry and §8.5's `Visit` has not been built (A-31 Part 5 residue 2).
 *
 * **A row whose `endDate` precedes its `startDate` degenerates to its start day.**
 * `validateTrip` reports it and does not reject it, and `fromJSON` accepts it, so it reaches
 * here and this function may not throw on it. Counting zero would make a malformed row
 * *invisible*, which is worse than counting it small.
 *
 * `daysTravelled` is the **union** of the trips' date intervals, not their sum: two trips
 * overlapping in time are not two days of your life. `trips.completed` still counts them
 * separately, and that is not a discrepancy — they are counts of different things, and the
 * alternative is the one that inflates (residue 5).
 *
 * **A row is not a validated document** (§8.4 **A-37**). It is read out of storage by
 * `listTrips()`, it passes through no parser and no validator on the way in, and
 * `SUMMARY_VERSION` tells a reader *when* a row was minted, never *that it is well-formed*. So
 * the two shapes this function used to take on trust are checked on the read: a day number it
 * derives from a string it did not mint is clamped into `IsoDate`'s domain (`inDomain`), and a
 * stored `countryCode` is read through the mint's own output shape (`isMintedCode`) — a
 * non-matching one is `null` for a city (counted in `unattributed.cities`) and skipped for a
 * `countryCodes[]` entry. Read-side only: `tripSummary` is unchanged.
 *
 * **A row out of storage is never a reason to throw** (QA R28-3, R28-4). A row minted before
 * `SUMMARY_VERSION` 4 carries no `attribution` census and contributes none; a row whose census
 * is impossible (`attributed > located`) contributes `0` to `unattributed` and its `located` as
 * given. Both used to be a throw or a negative number, and both are reachable without a caller
 * bug — `refreshLibrary()` installs the stored rows and the rescan brings them current
 * *afterwards*, so the library legitimately holds a stale row in between.
 *
 * **Every stored field this function reads passes a gate, once** — §8.4 **A-87**. The gate is
 * three-way (absent/`null` is a value, the declared shape is the value, anything else present is
 * a defect taking the same documented fallback and reported on `absorbed`), it is discharged in
 * **one** module-private reader rather than per call site, and **a method call is a
 * dereference**: `.normalize`, `.replace` and `for…of` are the shapes QA round 64 found this
 * class through, all of them a stored value dereferenced before anything asked what it was.
 *
 * @throws {Error} programmer error only — a duplicate row id, or a malformed **trip** date
 *         (`startDate`/`endDate`, A-37 Part 2's grandfathered throw, which stands: those two
 *         fields decide whether the row is classified at all and there is nothing to degrade
 *         to). **Two, and the list is exhaustive over the REACHABLE population** — plain data,
 *         which is what structured clone and `JSON.parse` return. The qualifier is A-87 Part 7's
 *         and it is not a hedge: a value reached through a **hostile accessor** — a `Proxy` whose
 *         `length` getter throws — still throws, and no storage port can produce one. The
 *         covering table in `test/stats-storage.test.ts` is what says the list is exhaustive,
 *         over `Record<keyof TripSummaryRow, true>` and `Record<keyof TripSummaryCity, true>`,
 *         so a field added to either breaks the build until the table covers it.
 */
export function travelStats(summaries: readonly TripSummaryRow[], today: IsoDate): TravelStats {
  // **A-37 Part 2**, site 1 of 3. Every day number this function lets reach an output is
  // clamped into `IsoDate`'s domain, so every date it emits is `IsoDate`-shaped by construction
  // rather than by an argument about who validated the input. Everything downstream — the union
  // sweep, `firstVisit`, `lastVisit` — reads these three and inherits the property, so the four
  // `fromDayNumber` call sites need no change and cannot be forgotten one at a time.
  const todayNum = inDomain(dayNumber(today));

  // 1. Duplicate ids throw. A library is keyed by id, so two rows with one id is a caller bug,
  //    and a silent dedupe would make `trips.completed` quietly wrong for whoever built the
  //    list. §2.1: core throws on programmer error and returns `Issue[]` for everything else.
  const seen = new Set<string>();
  for (const r of summaries) {
    if (seen.has(r.id)) throw new Error(`travelStats: duplicate summary id ${JSON.stringify(r.id)}`);
    seen.add(r.id);
  }

  // 2. Canonical order, computed once. Everything downstream reads THIS array, so no output
  //    depends on the order the caller happened to pass — which is what makes the golden stable
  //    and the purity assertion meaningful. `slice()` before `sort()`: the input is `readonly`
  //    and comes back untouched.
  //    **A-37 Part 2, deliberately NOT clamped**: this comparator decides ORDER and never
  //    reaches an output, and `id` is the tie-break so the order stays total either way.
  const rows = summaries.slice().sort((x, y) => {
    const d = dayNumber(x.startDate) - dayNumber(y.startDate);
    if (d !== 0) return d;
    return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  });

  // 2a. **§8.4 A-87 Parts 2 and 3 — the gate, run ONCE per row over the WHOLE library, before
  //     anything computes with a stored value.** Every absorption this makes lands on
  //     `absorbed`, in canonical row order because `rows` is already in it, and the folds below
  //     read `gated` and never the row. **Lifecycle-blind on purpose** (Part 5): a corrupt
  //     `planned` row is corrupt today, and the walk's own `attribution` comment already
  //     condemns the alternative — *"this used to throw non-uniformly, because only travelled
  //     rows are walked, so the same stale row was fatal when the trip was `completed` and
  //     silent when it was `planned`."*
  const absorbed: TravelStatsAbsorption[] = [];
  const gatedRows = rows.map((row) => readRow(row, absorbed));

  // 3. `trips` — over EVERY row, using the existing `lifecycle` and not a second implementation
  //    of trip state (sequencing rule 1). `TripSummaryRow` structurally satisfies `DatedTrip`.
  const trips = { planned: 0, active: 0, completed: 0 };
  // 4. The travelled set: `active` or `completed`, with the clamped interval each contributes.
  const travelled: Array<{ g: GatedRow; row: TripSummaryRow; a: number; b: number; done: boolean }> = [];
  for (const g of gatedRows) {
    const row = g.row;
    // **A-37 Part 2, deliberately NOT clamped**: `lifecycle` decides how a row is CLASSIFIED,
    // which is a different function's contract, and clamping inside it would make an
    // out-of-domain row report as `active` forever.
    const stage = lifecycle(row, today);
    trips[stage]++;
    if (stage === 'planned') continue;
    // **A-37 Part 2**, sites 2 and 3 of 3.
    const a = inDomain(dayNumber(row.startDate));
    const rawB = inDomain(stage === 'active' ? Math.min(dayNumber(row.endDate), todayNum) : dayNumber(row.endDate));
    // `done` is A-34's evidence, carried once per row rather than re-derived per country and
    // per city: `lifecycle` is called exactly here, and the folds below only read this flag.
    travelled.push({ g, row, a, b: Math.max(a, rawB), done: stage === 'completed' });
  }

  // 5. `daysTravelled` — the size of the UNION of the intervals, by sort-and-sweep. Sweep and
  //    not a `Set` of day numbers because an `IsoDate` admits year `0001` and a hand-written row
  //    would otherwise allocate millions of entries.
  const spans = travelled.map((t) => ({ a: t.a, b: t.b })).sort((x, y) => x.a - y.a);
  let daysTravelled = 0;
  let cur: { a: number; b: number } | null = null;
  for (const s of spans) {
    if (cur === null) cur = { a: s.a, b: s.b };
    else if (s.a <= cur.b) cur.b = Math.max(cur.b, s.b);
    else {
      daysTravelled += cur.b - cur.a + 1;
      cur = { a: s.a, b: s.b };
    }
  }
  if (cur !== null) daysTravelled += cur.b - cur.a + 1;

  // 6. `countries` — first/last visit are the TRIP's range, not the country's (residue 1): the
  //    row carries no per-country dates and cannot without carrying the day→city edges.
  const countryMap = new Map<CountryCode, TravelStatsCountry & { firstNum: number; lastNum: number }>();
  for (const { g, row, a, b, done } of travelled) {
    // **§8.4 A-87 Part 2.** The reader has already gated the container and every entry, so this
    // is a walk over minted codes and re-reading `row.countryCodes` here would be the
    // second read the rule forbids. A non-minted entry is SKIPPED — `TravelStatsCountry.code` is
    // what I-8 looks up in the index and a code the index cannot contain has no honest rendering
    // — and it is now **reported** on `absorbed`, which discharges A-31 Part 5 residue 2's
    // *"there is no `unreadableCodes` counter"*.
    for (const code of g.countryCodes) {
      const hit = countryMap.get(code);
      if (!hit) {
        countryMap.set(code, {
          code,
          firstVisit: fromDayNumber(a),
          lastVisit: fromDayNumber(b),
          tripIds: [row.id],
          // **A-34**, accumulated in the fold rather than in a second pass: the row starts
          // provisional and stops being so the first time a `completed` trip contributes it.
          provisional: !done,
          firstNum: a,
          lastNum: b,
        });
        continue;
      }
      if (a < hit.firstNum) {
        hit.firstNum = a;
        hit.firstVisit = fromDayNumber(a);
      }
      if (b > hit.lastNum) {
        hit.lastNum = b;
        hit.lastVisit = fromDayNumber(b);
      }
      if (done) hit.provisional = false;
      if (hit.tripIds[hit.tripIds.length - 1] !== row.id) hit.tripIds.push(row.id);
    }
  }
  const countries: TravelStatsCountry[] = [...countryMap.values()]
    .sort((x, y) => (x.code < y.code ? -1 : x.code > y.code ? 1 : 0))
    .map((c) => ({
      code: c.code,
      firstVisit: c.firstVisit,
      lastVisit: c.lastVisit,
      tripIds: c.tripIds,
      provisional: c.provisional,
    }));

  // 7. `cities` — grouped on the pair `(nameKey, countryCode)`. A `CityKey` is opaque and
  //    per-trip (§2.2 A-10), so two trips to Tokyo carry two of them and only the name can join
  //    them; the country is in the key because the same name in two countries must be two rows.
  const cityMap = new Map<string, TravelStatsCity & { firstNum: number; lastNum: number }>();
  // **A-87 Part 5's control.** A CENSUS fact: it counts what the fold lost, so it is accumulated
  // in the travelled walk and stays travelled-only, unlike the two absorption views below.
  let unnamedCities = 0;
  let seenCities = 0;
  let seenStops = 0;
  let locatedCities = 0;
  let unattributedCities = 0;
  let seenPlaces = 0;
  let locatedPlaces = 0;
  let unattributedPlaces = 0;
  let locatedStops = 0;
  let unattributedStops = 0;
  for (const { g, row, a, b, done } of travelled) {
    // **QA R28-3.** A row minted before `SUMMARY_VERSION` 4 carries no `attribution`, and this
    // used to throw — non-uniformly, because only travelled rows are walked, so the same stale
    // row was fatal when the trip was `completed` and silent when it was `planned`. It is not a
    // caller bug: `refreshLibrary()` installs the stored rows and the rescan brings them current
    // *afterwards*, so between the two the library legitimately holds version-3 rows and §2.1
    // lets core throw on programmer error only. A missing census contributes **nothing** to
    // either side of the place/stop hole rather than being invented; the row's cities are still
    // walked, because `cities[]` has been on the row since version 3.
    // **A-84 Part 7 item 1.** `seen` is accumulated in the same walk, per row, and each summand
    // is clamped to the `located` beside it — R28-4's clamp, one field over: a row out of storage
    // that claims more located records than it carries would otherwise break
    // `located <= seen` for the whole library rather than for itself.
    //
    // **§8.4 A-88 Part 6's closing clause.** These three are read in `readRow` and never here.
    // They were the reader's last exception — `countOf` outside the gate, so a stored `'x'` read
    // `0` and was reported by **nothing**, a third convention for a stored number beside the
    // census numbers, which absorb. The published value is unchanged; the report is new.
    const stopRecords = g.stopRecords;
    // **§8.4 A-85 Part 3 (QA R62-1).** `placeCount` is the row's own total place count and it is
    // read exactly as `stopCount`/`poolCount` are — through `countOf` inside the gate, so a row
    // from before generation 8, which has no such key, contributes 0 and is floored at its own
    // `located` below, and a hand-edited `'95'`, `-1` or `NaN` does the same and says so.
    const placeRecords = g.placeRecords;
    //
    // **§8.4 A-87 Part 3 rule 4.** The census is read through the gate above and never here: a
    // row whose `attribution` is present and hostile used to publish `NaN` for `seen.places`,
    // `located.places` **and** `unattributed.places` — for the whole library, not the row — and a
    // stored `located: '5'` published `"05"` by string concatenation. Both numbers now come
    // through `countOf`, so a `'5'`, a `NaN` and a `-1` are all `0` and none of them can reach an
    // output. A-86 Part 5's *no ceiling* is untouched: `countOf` floors and does not cap.
    // **§8.4 A-88 Part 5** gates the two numbers independently, so `{located: 5}` publishes 5.
    let rowLocatedStops = 0;
    let rowLocatedPlaces = 0;
    if (g.places) {
      rowLocatedPlaces = g.places.located;
      locatedPlaces += g.places.located;
      // **QA R28-4**, A-31 Part 2's clamp, applied per row rather than to the total: a row out
      // of storage with `attributed > located` (hand-edited, half-migrated) would otherwise
      // make `unattributed` negative, or pay for another row's genuine hole.
      unattributedPlaces += Math.max(0, g.places.located - g.places.attributed);
    }
    if (g.stops) {
      rowLocatedStops = g.stops.located;
      locatedStops += g.stops.located;
      unattributedStops += Math.max(0, g.stops.located - g.stops.attributed);
    }
    seenStops += Math.max(stopRecords, rowLocatedStops);
    seenPlaces += Math.max(placeRecords, rowLocatedPlaces);
    // The city census is derivable from `cities[]` alone, which is why the row carries no city
    // census of its own.
    //
    // **§8.4 A-83 Part 8: a city with no `centre` is UNLOCATED**, and this used to be
    // `locatedCities++` unconditionally on the stated ground that `City.centre` was
    // non-nullable. It is not, and `{lat: 0, lng: 0}` was never a measurement — so the census
    // now takes exactly the shape `add()` already uses for a `Place` with no `at` one screen
    // down: a record with no coordinate is neither located nor unattributed. It is not in the
    // denominator, so it cannot be in the numerator, and `unattributed` stays *"never greater
    // than `located`, per class"* by construction.
    //
    // **§8.4 A-37 Part 3's idiom, read 2 of 2, and it is a check on SHAPE.** A stored row is not
    // a validated document: a version-4 row carries no `centre` key at all and a hand-edited one
    // can carry anything. A centre counts as located when it is a plain object with two finite
    // numbers, and `null`, `undefined`, `'0,0'` and `{}` are all one answer — unlocated. A
    // version-4 row therefore reports its cities as unlocated until the `SUMMARY_VERSION` 6
    // rescan reaches it, which is the honest answer for a row that does not say where the city
    // is (§8.4 clause 3's rescan is what closes the gap, and it runs before anything claims the
    // lifetime map is complete).
    //
    // **QA R62-6, ROADMAP I-24 Part 4, and §8.4 A-87 Parts 2 and 3.** The `Array.isArray` guard
    // is not reopened and is no longer *here*: the whole read — the list, each entry, and each
    // entry's five fields — happens once, in `readRow` above, and this fold reads only its
    // output. That is what makes *"read exactly once"* structural: a consumer that reads the
    // reader's output **cannot** re-read the stored field. What the guard owed (A-86 Part 4) was
    // the report, and the report is `absorbed`.
    //
    // **`seen.cities` is the length of the STORED array, absorbed entries included** (A-87 Part 3
    // rule 1): `seen` is A-85 Part 3's *total records the row carries*, an unreadable entry is
    // still a record the row carries, and `located <= seen` holds a fortiori because an absorbed
    // entry cannot be located.
    seenCities += g.cityRecords;
    for (const c of g.cities) {
      // **§8.4 A-83 Part 8: a city with no `centre` is UNLOCATED.** `{lat: 0, lng: 0}` was never
      // a measurement, so a record with no coordinate is neither located nor unattributed — not
      // in the denominator, therefore not in the numerator, which is what keeps `unattributed`
      // *"never greater than `located`, per class"* by construction.
      const located = c.located;
      if (located) locatedCities++;
      // **QA R28-5.** `null` and `undefined` are ONE answer — decided once, in the reader, so
      // the count, the group key and the emitted value cannot disagree the way they once did
      // (`=== null` decided the count while `?? NO_COUNTRY` decided the key).
      const countryCode = c.countryCode;
      if (located && countryCode === null) unattributedCities++;
      const nameKey = c.nameKey;
      // A name that folds to `''` is **not an identity** (§2.14 A-14 assertion 5). Grouping on
      // it would put every blank city in every trip into one row labelled with nothing; skipping
      // it without counting would be silent loss, which is why the count is a field.
      if (nameKey === '') {
        unnamedCities++;
        continue;
      }
      // **§8.4 A-56 Part 7 clause 1**, and the clamp is A-31 Part 4 step 4's, unchanged: the
      // row's own `[a, b]` is already `today`-clamped for an active trip and already collapsed
      // to its start day for a row whose `endDate` precedes its `startDate`. A city's dates are
      // then clamped INTO that interval, so an active trip cannot report a city visit in the
      // future and a hand-edited row whose `firstDay` sits outside its own trip cannot either.
      //
      // **Clause 2 is ONE fallback with THREE triggers** — *no day edge* (clause 2 itself),
      // *no readable day edge* (**A-59** Part 2), *no day edge inside the window* (**A-60**
      // Part 2) — and it is the same sentence each time: the row carries nothing usable about
      // when this city was visited, so the answer is what the trip itself says. `[a, b]` is
      // that answer, and it is exactly what the city's country line prints at the same clock.
      //
      // Trigger 1, clause 2's own. `firstDay === null` — or absent, on a version-4 row the
      // rescan has not reached yet — is *"this city has no days"*, not *"this city has no
      // dates"*. The trip has dates and the city is in it.
      //
      // Trigger 2, **A-59** Part 2. **One unreadable end makes the PAIR unusable**: not one end
      // clamped and the other invented. `tripSummary` sets both or neither, so a half-corrupt
      // pair is hand-edited storage and a range with one known end has an invented width. The
      // gate and the absorption are the reader's (A-87 Part 3 rule 2, entry-scoped, one per
      // entry) — by the time an edge is read here it is an `IsoDate` or it is `null`, and
      // `unreadableCityDates` is derived from `absorbed` below rather than incremented here.
      // **§8.4 A-60 Part 6.3** — and the ORDER below is the fix, not a rearrangement. Part 6.7
      // residue 3 names the defect it repairs, and it generalises: *decide what the row supplied
      // before computing with it.* A-60 was stated in prose about *"a range"* and then written as
      // pseudocode over two scalars that might be **substitutes**, so trigger 3 was applied to a
      // value the row never said. `obsA`/`obsB` are what the entry actually supplies; `rawA`/
      // `rawB` — which may be substitutes — are computed last and are read by the clamp alone.
      //
      // **A-60 Part 6.2**: `null` and an absent key are **values**, not defects, and they keep
      // A-56 Part 7 clause 1's per-field `??` below. The pair-wide reading of trigger 1 was
      // refused: it buys nothing on the missing end — the substitute is the same trip edge the
      // fallback would have printed — and pays for it by deleting the one real observation on
      // the end the row did supply. **Corrupted evidence poisons its pair; absent evidence does
      // not**, which is why A-59's `unreadableDays` is pair-wide here and `??` is per-field.
      const obsA: IsoDate | null = c.firstDay;
      const obsB: IsoDate | null = c.lastDay;
      // **A-37 Part 2**, sites 4 and 5. `inDomain` for the same reason `startDate` gets it: a
      // stored row is not a validated document and these two strings were never revalidated.
      // After A-59's gate every value reaching `dayNumber` here is `isIsoDate`-valid and the
      // clamp is a no-op — it **stays** anyway (A-59 Part 2, A-46 Part 5's precedent): deleting
      // a gate because the guard above it currently makes it unreachable is how the guard's
      // next narrowing becomes a defect. Trigger to remove it: none.
      const numA = obsA === null ? null : inDomain(dayNumber(obsA));
      const numB = obsB === null ? null : inDomain(dayNumber(obsB));
      // Triggers 1 and 2 together — the entry supplies no usable edge at all.
      const noEdge = numA === null && numB === null;
      // Trigger 3, **A-60** Part 2 as generalised by Part 6.3. A range the clamp interval does
      // not intersect would collapse onto whichever end of `[a, b]` it was clamped to — for a
      // city the traveller reaches next week, that is **today**, the one day in the window they
      // are provably somewhere else (QA R43-4). The country form of the same fact is the trip's
      // range, coarse and true; the finer granularity may not be the less honest one.
      //
      // Read over the SUPPLIED edges. Where both are supplied this is Part 2's test unchanged —
      // `numA` is Part 2's `rawA` and `max(numA, numB)` is its `rawB`, the same expression.
      // Where only one is supplied the entry bounds a **ray**, not an interval, and the ray is
      // what is tested: a lone `lastDay` before `a` is disjoint, a lone `firstDay` after `b` is
      // disjoint, and nothing else is. Both arms are STRICT — a range touching `[a, b]` at one
      // day names a real arrival or departure day, which is evidence and not an artefact.
      const disjoint =
        numA === null
          ? numB !== null && numB < a // the ray (−∞, lastDay]
          : numB === null
            ? numA > b // the ray [firstDay, +∞)
            : Math.max(numA, numB) < a || numA > b; // Part 2's test, unchanged
      const fallback = noEdge || disjoint;
      // A-56 Part 7 clause 1's clamp, over clause 1's per-field fallbacks — Part 6.2, unchanged.
      const rawA = inDomain(dayNumber(obsA ?? row.startDate));
      // An inverted stored pair still collapses onto its first — A-56 clause 1, unchanged.
      const rawB = Math.max(rawA, inDomain(dayNumber(obsB ?? row.endDate)));
      const cityA = fallback ? a : Math.min(b, Math.max(a, rawA));
      const cityB = fallback ? b : Math.max(cityA, Math.min(b, Math.max(a, rawB)));
      const key = `${countryCode ?? NO_COUNTRY}|${nameKey}`;
      const hit = cityMap.get(key);
      if (!hit) {
        // `provisional` accumulates as for a country (**A-34**), per row and not per city.
        cityMap.set(key, {
          nameKey,
          name: c.name,
          countryCode,
          tripIds: [row.id],
          provisional: !done,
          firstVisit: fromDayNumber(cityA),
          lastVisit: fromDayNumber(cityB),
          firstNum: cityA,
          lastNum: cityB,
        });
      } else {
        if (done) hit.provisional = false;
        // The earliest first and the latest last over every contributing row — the same fold a
        // country's dates take, one granularity down.
        if (cityA < hit.firstNum) {
          hit.firstNum = cityA;
          hit.firstVisit = fromDayNumber(cityA);
        }
        if (cityB > hit.lastNum) {
          hit.lastNum = cityB;
          hit.lastVisit = fromDayNumber(cityB);
        }
        if (hit.tripIds[hit.tripIds.length - 1] !== row.id) {
          // At most once per trip, even if the trip holds two cities that fold to the same key.
          hit.tripIds.push(row.id);
        }
      }
    }
  }
  const cities: TravelStatsCity[] = [...cityMap.values()]
    .sort((x, y) => {
      if (x.nameKey !== y.nameKey) return x.nameKey < y.nameKey ? -1 : 1;
      // `null` last: an unattributed row is the honest hole, and it sorts after the answer.
      if (x.countryCode === y.countryCode) return 0;
      if (x.countryCode === null) return 1;
      if (y.countryCode === null) return -1;
      return x.countryCode < y.countryCode ? -1 : 1;
    })
    // The two day numbers are the fold's own bookkeeping and are not on the type — projected
    // out here exactly as a country's are, so no output carries a field §2.10 does not name.
    .map((c) => ({
      nameKey: c.nameKey,
      name: c.name,
      countryCode: c.countryCode,
      tripIds: c.tripIds,
      provisional: c.provisional,
      firstVisit: c.firstVisit,
      lastVisit: c.lastVisit,
    }));

  // **§8.4 A-87 Part 4 — the two scalars are VIEWS of `absorbed`, computed at ONE site.**
  // A-86 Part 8 residue 1's *"all three fold into it"* is deliberately not applied literally:
  // these two are what three shipped assertions pin core against `packages/client` with, and
  // deleting them to replace them with a filter reddens two live `qa/` probes and three test
  // files for zero change in information. Computed rather than counted, they cannot drift from
  // the channel — which is the property that makes keeping them cost nothing.
  const unreadableCityLists = new Set(
    absorbed.filter((x) => x.kind === 'list' && x.path === 'cities').map((x) => x.rowId),
  ).size;
  const unreadableCityDates = absorbed.filter((x) => x.kind === 'date').length;

  return {
    countries,
    cities,
    trips,
    daysTravelled,
    // **A-84 Part 7 item 1, completed by A-85 Part 3.** All three classes now have a
    // denominator on the row — `cities[]`, `placeCount`, `stopCount + poolCount` — and each is
    // clamped at the `located` beside it, which is what keeps `located <= seen` true for every
    // class rather than for two of them.
    seen: {
      cities: Math.max(seenCities, locatedCities),
      places: Math.max(seenPlaces, locatedPlaces),
      stops: Math.max(seenStops, locatedStops),
    },
    located: { cities: locatedCities, places: locatedPlaces, stops: locatedStops },
    unattributed: {
      cities: unattributedCities,
      places: unattributedPlaces,
      stops: unattributedStops,
    },
    absorbed,
    unnamedCities,
    unreadableCityDates,
    unreadableCityLists,
  };
}
