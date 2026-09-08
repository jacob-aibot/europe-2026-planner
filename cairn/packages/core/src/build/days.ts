/**
 * Day skeleton maintenance (ARCHITECTURE §2.3).
 *
 * Days are stored, because editorial city assignment, day-level prose, empty days and
 * day-level provenance are all things nothing derives. The dangerous half of "stored" is
 * drift, so: `days` MUST be dense over `[startDate,endDate]` and `Day.id === Day.date`,
 * and every function that touches the range comes through here.
 */
import type { Day, Trip } from '../model/types.ts';
import type { CityKey, DayId, IsoDate } from '../model/ids.ts';
import { addDays, dayNumber } from '../derive/summary.ts';
import { userProvenance } from '../model/provenance.ts';
import { reattachDanglingPhotos } from './photos.ts';
import { commit } from './commit.ts';
import type { BuildCtx } from './createTrip.ts';

/**
 * The widest day skeleton `ensureDays` will mint: ten Gregorian years, inclusive
 * (`2020-01-01 … 2029-12-31` is exactly this). §2.3 **A-35**, QA R29-2.
 *
 * Module-private and **not exported**: §2.10's surface does not move, and no view needs the
 * number — the forms learn about the bound the way they already learn about a non-calendar
 * date, by catching the throw (`PastTripForm.submit` and `Library`'s `NewTrip.submit` both
 * already wrap `store.createTrip` in `try { … } catch (err) { onError(...) }`).
 */
const MAX_TRIP_SPAN_DAYS = 3653;

/**
 * A blank day. Pure.
 *
 * **Not a door** — §2.1 **A-77** Part 6.1: it returns a `Day`, not a `Trip`. A-76 exempted it with
 * the reason *"reads no caller value into a record field"* and **QA R55-2 proved that reason
 * false**: `blankDay(date, city, ctx.now)` writes the CALLER's `ctx.now` into `provenance.addedAt`,
 * and `createTrip(init, {…now: 42})` produced a document unopenable at
 * `$.days[0].provenance.addedAt`. A-77 needs no reason at all — the days this mints are new
 * objects, and `ensureDays`' `commit` parses every one of them.
 */
export function blankDay(date: IsoDate, primaryCity: CityKey | 'transit', at: IsoDate): Day {
  return {
    id: date,
    date,
    primaryCity,
    cities: primaryCity === 'transit' ? ['transit'] : [primaryCity],
    title: '',
    subtitle: '',
    stops: [],
    provenance: userProvenance(at),
  };
}

/**
 * Makes `trip.days` dense over `[startDate, endDate]`, sorted, with `Day.id === Day.date`.
 *
 * Existing days are preserved by date. A day that falls outside the range is dropped if it
 * is empty; if it still holds stops the trip's range is WIDENED to keep it rather than
 * silently destroying content. Pure.
 *
 * **A door** (§2.1 **A-77** Part 6.1 — it returns a `Trip`), and A-76's exemption of it was one of
 * the two reasons QA R55-2 disproved. It returns through `commit`, which parses exactly the days
 * this minted. `MAX_TRIP_SPAN_DAYS` below is A-35's span cap, a different property, and stays.
 *
 * **Day identity is preserved** (A-77 Part 9): a day whose `id` already equals its `date` is
 * reused rather than rebuilt as `{...d, id: d.date}`. Without that, every range change destroys
 * the identity of every day it did not change and `commit` re-parses the whole skeleton — which is
 * what the `setTripMeta`-over-3,653-days budget is bought with. It is required by the ruling, not
 * an optimisation.
 *
 * @param alreadyBumped internal — set when the caller has already incremented `revision`.
 */
export function ensureDays(trip: Trip, ctx: BuildCtx, alreadyBumped = false): Trip {
  const byDate = new Map<IsoDate, Day>();
  // A-77 Part 9: reuse `d` when its id is already right. `{...d, id: d.date}` unconditionally
  // would mint a new object for every day of the trip and make `commit` re-parse all of them.
  for (const d of trip.days) byDate.set(d.date, d.id === d.date ? d : { ...d, id: d.date });

  let start = trip.startDate;
  let end = trip.endDate;
  for (const d of byDate.values()) {
    if (d.stops.length === 0) continue;
    if (dayNumber(d.date) < dayNumber(start)) start = d.date;
    if (dayNumber(d.date) > dayNumber(end)) end = d.date;
  }

  const span = dayNumber(end) - dayNumber(start);
  // §2.3 **A-35**. AFTER the widening loop, because the span that matters is the one that will
  // actually be minted; BEFORE the allocation loop, because the harm is the allocation and the
  // refusal has to precede it. `span + 1`, because the loop below mints `span + 1` days.
  //
  // Not an `Issue`: by the time `validateTrip` could report one the 664,377 records exist. Not
  // a floor on `IsoDate` either (A-32 Part 4) — a year floor would not have caught this, since
  // `1900-01-01 → 2500-12-31` is 219,000 days of entirely ordinary years. The disease is span.
  if (span + 1 > MAX_TRIP_SPAN_DAYS) {
    throw new Error(
      `ensureDays: this trip would cover ${span + 1} days (${start} → ${end}), and one trip may ` +
        `cover at most ${MAX_TRIP_SPAN_DAYS} (about ten years). Check the year in the dates.`,
    );
  }
  const days: Day[] = [];
  for (let i = 0; i <= span; i++) {
    const date = addDays(start, i);
    const existing = byDate.get(date);
    days.push(existing ?? blankDay(date, 'transit', ctx.now));
  }
  // §10.3: this is the ONE function in core that can make a `dayId` stop existing (an empty day
  // outside the range is dropped above). A photo pointing at a dropped day falls back to
  // `{kind:'trip'}` rather than being deleted — A-57 Part 9 residue 2. It does not bump
  // `revision` a second time, and it returns the trip by reference when nothing dangles.
  return commit('ensureDays', trip, reattachDanglingPhotos({
    ...trip,
    startDate: start,
    endDate: end,
    days,
    revision: alreadyBumped ? trip.revision : trip.revision + 1,
  }));
}

export type DayMetaPatch = Partial<Pick<Day, 'primaryCity' | 'cities' | 'title' | 'subtitle' | 'provenance' | 'legacyFlag' | 'tzId'>>;

/**
 * Exactly `DayMetaPatch`'s `Pick`, at runtime — §2.1 **A-77** Part 5, on `updateStop`'s,
 * `updatePhoto`'s and `updateParticipant`'s model (QA **R52-6**'s pattern).
 *
 * **This is the half of R55-1 that `commit` does NOT subsume, and it is not optional.** A `stops`
 * key smuggled onto an `any`-shaped patch has two harms. The first — a stop the parser refuses —
 * `commit` closes by construction, because the smuggled record is a new object the identity diff
 * parses. The second it cannot: the key can carry a stop that **already exists on another day**,
 * a perfectly parseable record and the *same object* the document already holds, so no parse
 * refuses it and the document then reports `duplicate_id` and `scheduled_stop_has_no_day` on an
 * edit the user never made. That is §2.1's **patch-allowlist** property — *may this caller rewrite
 * this field at all* — which is orthogonal to whether the result parses.
 *
 * `setDayMeta` is the one patch door that never had one. It is stated as an ALLOWLIST because
 * that is what A-77 Part 5 requires (*"refusing every key outside `DayMetaPatch`'s `Pick`"*): a
 * forbidden-key list would have to be re-enumerated every time `Day` gains a field, which is the
 * shape this whole ruling deletes.
 *
 * **`Record<keyof DayMetaPatch, true>` is the pin, and it is not decoration** (QA **R56-6**). Shipped
 * as a `readonly string[]` this was a hand-maintained SECOND COPY of the `Pick` above with nothing
 * holding the two together: a field added to `DayMetaPatch` and not to this list makes a legal
 * patch silently refused, and today's agreement was the only thing keeping it honest. The type
 * names both directions — a missing key and an undeclared one each fail `npm run typecheck` on the
 * commit that writes them — and it is the shape `readOnce.test.ts`'s four `CENSUS_*_FIELDS` maps
 * already use for exactly this problem, rather than a new mechanism.
 *
 * The lookup below is `hasOwnProperty`, never `in`: `in` would make `toString` a patchable key.
 */
const DAY_META_PATCH_KEYS: Record<keyof DayMetaPatch, true> = {
  primaryCity: true, cities: true, title: true, subtitle: true, provenance: true,
  legacyFlag: true, tzId: true,
};

/**
 * The three A-77 Part 5 names explicitly, because all three are **identity** and none is the
 * caller's to rewrite here — `stops` is the record list (`addStop`/`moveStop`/`removeStop` own
 * it), and `id`/`date` are what makes a day that day (`ensureDays` owns both, and §2.3 requires
 * `Day.id === Day.date`). Every other undeclared key is refused too; these get their own sentence.
 */
const FORBIDDEN_DAY_META_PATCH_KEYS: Record<string, string> = {
  stops: 'a day\'s stops are addStop / moveStop / removeStop\'s, and a stop that already exists ' +
    'elsewhere in the document would parse perfectly and duplicate an id',
  id: 'a day id is immutable and must equal its date (§2.3)',
  date: 'a day\'s date is the trip range\'s, and moving one is ensureDays\' (§2.3)',
};

/** @throws {Error} on any key outside `DayMetaPatch`, present even with an `undefined` value. */
function assertPatchable(patch: object): void {
  for (const k of Object.keys(patch)) {
    if (Object.prototype.hasOwnProperty.call(DAY_META_PATCH_KEYS, k)) continue;
    // Own-property on BOTH lookups, for the same reason: `FORBIDDEN_DAY_META_PATCH_KEYS['toString']`
    // reaches `Object.prototype.toString`, which is truthy, so `??` never fires and the refusal
    // prints a native function where its reason should be.
    const why = Object.prototype.hasOwnProperty.call(FORBIDDEN_DAY_META_PATCH_KEYS, k)
      ? FORBIDDEN_DAY_META_PATCH_KEYS[k]
      : 'it is not a field of DayMetaPatch';
    throw new Error(
      `setDayMeta: "${k}" may not be patched — ` + why,
    );
  }
}

/**
 * Patches a day's editorial fields. `cities` always ends up containing `primaryCity`
 * (an invariant `validateTrip` also checks). Pure.
 *
 * §2.1 **A-77**: it returns through `commit`, which parses the merged `Day` with `stops: []` and
 * its stops individually. That elision is now **structural**: the day's own fields come from the
 * day and the stops come from the identity diff, so one pre-existing bad stop cannot make the
 * day's title uneditable — an edit is never punished for data it did not write — and nothing a
 * patch smuggles into the `stops` slot can avoid being a new object the diff parses.
 *
 * @throws {Error} if `dayId` is not in the trip, if the patch carries a key outside
 *         `DayMetaPatch`, or if the merged day is one `fromJSON` would refuse — all programmer
 *         error, not a domain problem.
 */
export function setDayMeta(trip: Trip, dayId: DayId, patch: DayMetaPatch): Trip {
  assertPatchable(patch);
  const idx = trip.days.findIndex((d) => d.id === dayId);
  if (idx < 0) throw new Error(`setDayMeta: no such day ${dayId}`);
  const day = trip.days[idx];
  const merged: Day = { ...day, ...patch };
  const primary = merged.primaryCity;
  if (!merged.cities.includes(primary)) merged.cities = [primary, ...merged.cities];
  const days = trip.days.slice();
  days[idx] = merged;
  return commit('setDayMeta', trip, { ...trip, days, revision: trip.revision + 1 });
}

/** Looks up a day. Pure; returns null rather than throwing. */
export function findDay(trip: Trip, dayId: DayId): Day | null {
  return trip.days.find((d) => d.id === dayId) ?? null;
}
