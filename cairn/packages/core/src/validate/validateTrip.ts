/**
 * `validateTrip` (ARCHITECTURE §2.9).
 *
 * This generalises the scripted checks in `docs/PLANNER.md` at the repo root — the ones that
 * caught bugs nothing visible was showing, like Fisherman's Bastion 111 km north of Budapest.
 *
 * Structural problems are `error`. Things that are probably wrong but might be deliberate
 * are `warn`. Nothing here throws and nothing here mutates.
 */
import type { Issue, Participant, Provenance, Ref, Stop, Trip } from '../model/types.ts';
import { addDays, dayNumber } from '../derive/summary.ts';
import { attribution } from '../derive/display.ts';
import { inRange, stopLatLng } from '../derive/geo.ts';
import { TRANSIT_CITY_KEY, isIsoDate } from '../model/ids.ts';
import { isOpeningHours } from '../model/openingHours.ts';
import { currenciesOf, mixesBasis } from '../model/money.ts';

/**
 * Who may accept content on this trip's behalf — §2.14's `members(trip)`.
 *
 * Written membership-shaped rather than as `=== trip.ownerId` on purpose: a co-owner or an
 * editor accepting is legitimate the moment `TripMember` exists, so the narrow clause would
 * already be wrong in Phase 2. Phase 1 has no member list, so the set degenerates to the
 * owner and the two readings coincide. Pure.
 */
function members(trip: Trip): Set<string> {
  return new Set(trip.ownerId ? [trip.ownerId] : []);
}

/**
 * A city key resolved for a person (§2.2 **A-10**, QA **R13-7**) — `geoOutlier.ts`'s
 * `cityLabel`, with the same contract and the same reason for existing.
 *
 * A `CityKey` is a minted opaque id (`city-7`, not `vienna`), and `Issue.message` is the
 * sentence shown in the Issues panel, so a key interpolated into one puts an id in front of
 * the user. `City.name` is a city's only human identity. `null` means this trip has no name to
 * show for the key — either the city is absent (which is itself what the issue reports) or its
 * name is blank (`city_name_empty` reports that separately). The caller composes the fallback,
 * because no one phrase fits every sentence grammatically.
 *
 * Blank names collapse to `null` here where `geoOutlier`'s version does not: an issue reading
 * *"the day's primary city, "", is not listed"* is exactly the illegibility this fixes.
 * `params.cityKey` keeps the raw key at every site — it is structured data (§2.1). Pure.
 *
 * BUILD-NOTES **KD-46** records this and the one `params` addition it required, as KD-44 records
 * the same decision for `geoOutlier.ts`; A-10's change table pre-authorised only that one file.
 */
function cityLabel(trip: Trip, key: string): string | null {
  const name = trip.cities.find((c) => c.key === key)?.name.trim();
  return name ? name : null;
}

/** A city named for a person, or a phrase saying it has no name. Pure. */
function namePhrase(name: string): string {
  return name.trim() ? `"${name.trim()}"` : 'a city with no name';
}

/**
 * The phrase every "this key resolves to nothing" message shares, so the six sites read as one
 * voice and none of them prints the id. Deliberately the same words `geoOutlier.ts` uses.
 */
const NO_SUCH_CITY = 'a city this trip does not have';

/** Pure. Returns every problem found, in a deterministic order; never throws. */
export function validateTrip(trip: Trip): Issue[] {
  const out: Issue[] = [];
  const push = (i: Issue) => out.push(i);
  const memberIds = members(trip);

  /**
   * `accepted_by_non_member` (§2.9, added in revision 4 — QA R2-11).
   *
   * §2.14's invariant is that a **credited** record never renders as the user's own plan
   * unless a member of the trip accepted it. `displayStatus` cannot enforce that — it is a
   * pure function of one `Provenance`, it does not receive the trip, and a badge function
   * that needs the whole document is a badge function that gets called with the wrong
   * document. So the invariant is enforced here, as a claim about which documents may exist.
   *
   * It is an `Issue` and not a throw because this shape arrives from *inside* a document —
   * a restored backup, a hand-edited record, a Phase 2 sync — where throwing means an
   * unopenable trip. The *call* that would create one throws instead (§2.14, `requireActor`).
   *
   * Scoped to records with a non-null `attribution()`, which is exactly §2.14's subject:
   * `source:'user'` records carrying `actorUserId: null` assert no acceptance of anyone
   * else's content and stay outside the rule by design. That exemption is scoped by
   * ATTRIBUTION, not by nullness — which is the whole of QA R5-2.
   *
   * R5-2: the guard used to read `if (!actor || memberIds.has(actor)) return`, adding an
   * unstated fourth conjunct — "the actor must be truthy" — to §2.9's three. `null`,
   * `undefined` and `''` are members of nothing, so a credited, `state:'accepted'` record
   * with no accepter at all satisfied the rule as written and was exempted by the code: it
   * rendered as the user's own plan with nobody nameable as having accepted it, and
   * `''` is not even absent, it is a present non-member value of type `UserId` that
   * `requireActor` already refuses at construction. A missing actor is now flagged the same
   * as a wrong one; only a member short-circuits.
   */
  const checkActor = (p: Provenance | undefined, ref: Ref, label: string) => {
    if (!p || p.state !== 'accepted') return;
    if (!attribution(p)) return;
    // `undefined` reaches here from a hand-built record; `params` is Record<string, string |
    // number> (§2.1), so the absent case is carried as `''` rather than leaking a non-string.
    const actor = typeof p.actorUserId === 'string' && p.actorUserId !== '' ? p.actorUserId : null;
    if (actor !== null && memberIds.has(actor)) return;
    push({
      level: 'error',
      code: 'accepted_by_non_member',
      ref,
      message:
        actor === null
          ? `${label} is marked accepted, but records nobody as having accepted it.`
          : `${label} was accepted by ${actor}, who is not a member of this trip.`,
      params: { actorUserId: actor ?? '', ownerId: trip.ownerId ?? '', tripId: trip.id },
    });
  };

  if (!trip.ownerId) {
    push({
      level: 'error',
      code: 'owner_missing',
      ref: { kind: 'trip', id: trip.id },
      message: 'The trip has no owner.',
      params: { tripId: trip.id },
    });
  }

  /**
   * --- cities: distinct, non-reserved, named (§2.2 **A-10**, revision 11, QA P2-2) ---------
   *
   * Keys are minted now, so none of these is reachable by construction. All three are still
   * reachable by `importDoc`, by a hand-edit, and from a build that predates the ruling —
   * which is exactly why they are `Issue`s and not throws: a document already carrying the
   * `"-"` collision must **open**, so the user can see it and act. Refusing to parse it would
   * make it unopenable, which is the harm QA P2-7 describes. `fromJSON` is not the place for
   * any of these and `createTrip` does not throw on them (§2.1: domain problems are data).
   */
  // key -> the NAME of the first city that claimed it, so a collision can be reported as two
  // cities a person can recognise rather than as the id they happen to share (R13-7).
  const cityKeysSeen = new Map<string, string>();
  for (const c of trip.cities) {
    const first = cityKeysSeen.get(c.key);
    if (first !== undefined) {
      // Structurally broken, not merely untidy: `daysForCity` and `poolFor` return the same
      // rows for both entries, and a pooled stop under that key belongs to neither.
      push({
        level: 'error',
        code: 'duplicate_city_key',
        ref: { kind: 'trip', id: trip.id },
        message:
          `Two cities share one key — ${namePhrase(first)} and ${namePhrase(c.name)} — so every ` +
          `day, place and pooled stop under it is ambiguous.`,
        params: { cityKey: c.key },
      });
    } else cityKeysSeen.set(c.key, c.name);
    if (c.key === TRANSIT_CITY_KEY) {
      // A shadowed sentinel is silent corruption of `Day.primaryCity`'s meaning: the day
      // would claim to be a travel day and to be in this city at the same time.
      push({
        level: 'error',
        code: 'reserved_city_key',
        ref: { kind: 'trip', id: trip.id },
        message: `City "${c.name}" uses the reserved key "${TRANSIT_CITY_KEY}", which marks a day as travel-only.`,
        params: { cityKey: c.key, name: c.name },
      });
    }
    if (!c.name.trim()) {
      // Decoupling the key from the name makes the name the ONLY human identity a city has.
      // This is §8.3's `participant_name_empty` argument verbatim, true for cities from A-10.
      push({
        level: 'error',
        code: 'city_name_empty',
        ref: { kind: 'trip', id: trip.id },
        message:
          'A city on this trip has no name, so nothing can label it on a day, a map or the pool — ' +
          'its key is an opaque id nobody can read.',
        params: { cityKey: c.key },
      });
    }
  }

  // --- days dense, ids correct -------------------------------------------------
  const expected = trip.endDate >= trip.startDate ? dayNumber(trip.endDate) - dayNumber(trip.startDate) + 1 : 0;
  if (trip.days.length !== expected) {
    push({
      level: 'error',
      code: 'days_not_dense',
      ref: { kind: 'trip', id: trip.id },
      message: `Expected ${expected} days from ${trip.startDate} to ${trip.endDate}, found ${trip.days.length}.`,
      params: { expected, actual: trip.days.length, startDate: trip.startDate, endDate: trip.endDate },
    });
  }
  for (let i = 0; i < trip.days.length; i++) {
    const d = trip.days[i];
    if (d.id !== d.date) {
      push({
        level: 'error',
        code: 'day_id_mismatch',
        ref: { kind: 'day', id: d.id },
        message: `Day id ${d.id} does not equal its date ${d.date}.`,
        params: { dayId: d.id, date: d.date },
      });
    }
    const want = addDays(trip.startDate, i);
    if (i < expected && d.date !== want) {
      push({
        level: 'error',
        code: 'days_not_dense',
        ref: { kind: 'day', id: d.id },
        message: `Day ${i} should be ${want} but is ${d.date}.`,
        params: { index: i, expected: want, actual: d.date },
      });
    }
    if (!d.cities.includes(d.primaryCity)) {
      // Three sentences, because one phrase cannot cover three different facts (R13-7): the
      // trip has the city (name it), the trip does not (say so), or it is the transit sentinel,
      // which is not a city at all and must not read as a missing one.
      const label = cityLabel(trip, d.primaryCity);
      push({
        level: 'error',
        code: 'primary_city_not_in_cities',
        ref: { kind: 'day', id: d.id },
        message:
          d.primaryCity === TRANSIT_CITY_KEY
            ? `${d.date}: the day is marked travel-only, but the travel-only marker is not listed among the day's cities.`
            : label === null
              ? `${d.date}: the day's primary city is ${NO_SUCH_CITY}, and it is not listed among the day's cities either.`
              : `${d.date}: the day's primary city, "${label}", is not listed among the day's cities.`,
        // `primaryCity` was already the key and stays, verbatim, for anything that reads this
        // structurally; `cityKey` is added so all six city-key issues carry the key under the
        // one name `geoOutlier.ts` and the other five use.
        params: { dayId: d.id, primaryCity: d.primaryCity, cityKey: d.primaryCity, cities: d.cities.join(',') },
      });
    }
    for (const key of d.cities) {
      if (key === TRANSIT_CITY_KEY) continue;
      if (!trip.cities.some((c) => c.key === key)) {
        push({
          level: 'error',
          code: 'unknown_city_key',
          ref: { kind: 'day', id: d.id },
          // The key is unresolvable by construction here — that is the condition being
          // reported — so there is no name to show and the phrase is the whole message (R13-7).
          message: `${d.date} lists ${NO_SUCH_CITY}.`,
          params: { dayId: d.id, cityKey: key },
        });
      }
    }
    if (!d.provenance) {
      push({
        level: 'error',
        code: 'provenance_missing',
        ref: { kind: 'day', id: d.id },
        message: `${d.date} has no provenance.`,
        params: { dayId: d.id },
      });
    } else if (d.provenance.state === 'accepted' && !d.provenance.acceptedAt) {
      push({
        level: 'warn',
        code: 'accepted_without_timestamp',
        ref: { kind: 'day', id: d.id },
        message: `${d.date} is marked accepted with no acceptance date.`,
        params: { dayId: d.id },
      });
    }
    checkActor(d.provenance, { kind: 'day', id: d.id }, d.date);
  }

  // --- ids unique across the document -----------------------------------------
  const seen = new Map<string, string>();
  const claim = (kind: string, id: string, refKind: Issue['ref']['kind'], refId: string = id) => {
    const key = `${kind}:${id}`;
    if (seen.has(key)) {
      push({
        level: 'error',
        code: 'duplicate_id',
        ref: { kind: refKind, id: refId },
        message: `Duplicate ${kind} id "${id}".`,
        params: { kind, id },
      });
    } else seen.set(key, id);
  };
  for (const d of trip.days) claim('day', d.id, 'day');
  for (const p of trip.places) claim('place', p.id, 'place');
  for (const b of trip.bookings) claim('booking', b.id, 'booking');
  // **Photos — QA R45-15.** The census gained no photo arm at I-13, and a duplicate `PhotoId` is
  // worse than a duplicate `Stop` id: it names records in the **global byte-key space** §10.3
  // creates, so `removePhoto` drops both records while `updatePhoto` edits only the first and the
  // two share one pair of byte records. Unreachable from `importPhotos` (ids come from the
  // injected factory) and reachable from `fromJSON` — a hand-edited file, a restored export, a
  // future native bridge — which is exactly the population this function exists for.
  //
  // The `ref` is the **trip**, as every other photo issue below is: `RefKind` has no `'photo'`
  // arm, and widening core's export surface is an architect's ruling (QA R45-6), not a check's to
  // take. `params.kind` is `'photo'`, which is what a surface actually reads.
  for (const p of trip.photos ?? []) claim('photo', p.id, 'trip', trip.id);

  const allStops: Array<{ stop: Stop; dayId: string | null }> = [];
  for (const d of trip.days) for (const s of d.stops) allStops.push({ stop: s, dayId: d.id });
  for (const s of trip.pool) allStops.push({ stop: s, dayId: null });
  for (const { stop } of allStops) claim('stop', stop.id, 'stop');

  const placeIds = new Set(trip.places.map((p) => p.id));
  const bookingIds = new Set(trip.bookings.map((b) => b.id));

  for (const { stop, dayId } of allStops) {
    const ref = { kind: 'stop' as const, id: stop.id };
    const placement = stop.placement;
    if (placement.kind === 'scheduled') {
      if (dayId === null) {
        push({
          level: 'error',
          code: 'pool_stop_has_day',
          ref,
          message: `"${stop.name}" is in the pool but claims to be scheduled.`,
          params: { stopId: stop.id, name: stop.name },
        });
      } else if (placement.dayId !== dayId) {
        push({
          level: 'error',
          code: 'scheduled_stop_has_no_day',
          ref,
          message: `"${stop.name}" sits on ${dayId} but its placement says ${placement.dayId}.`,
          params: { stopId: stop.id, name: stop.name, actual: dayId, claimed: placement.dayId },
        });
      }
    } else if (dayId !== null) {
      push({
        level: 'error',
        code: 'scheduled_stop_has_no_day',
        ref,
        message: `"${stop.name}" is on ${dayId} but its placement says it is pooled.`,
        params: { stopId: stop.id, name: stop.name, dayId },
      });
    } else if (
      placement.cityKey !== TRANSIT_CITY_KEY &&
      !trip.cities.some((c) => c.key === placement.cityKey)
    ) {
      // A pooled stop is reached through its city. A key that is neither one of
      // `trip.cities` nor the transit group is reached through nothing: the stop is in the
      // document, counted by the pool total, and absent from every panel. That is how a
      // user loses a stop with no error and no way back (QA R2-2), so it is an error, not
      // a warning — the stop needs re-filing before it can be found again.
      push({
        level: 'error',
        code: 'pool_stop_unknown_city',
        ref,
        message: `"${stop.name}" is pooled under ${NO_SUCH_CITY} — nothing can show it.`,
        params: { stopId: stop.id, name: stop.name, cityKey: placement.cityKey },
      });
    }

    if (stop.place.kind === 'place' && !placeIds.has(stop.place.placeId)) {
      push({
        level: 'error',
        code: 'place_ref_dangling',
        ref,
        message: `"${stop.name}" points at place ${stop.place.placeId}, which does not exist.`,
        params: { stopId: stop.id, placeId: stop.place.placeId },
      });
    }
    if (stop.bookingId && !bookingIds.has(stop.bookingId)) {
      push({
        level: 'error',
        code: 'booking_ref_orphan',
        ref,
        message: `"${stop.name}" points at booking ${stop.bookingId}, which does not exist.`,
        params: { stopId: stop.id, bookingId: stop.bookingId },
      });
    }
    if (!stop.provenance) {
      push({
        level: 'error',
        code: 'provenance_missing',
        ref,
        message: `"${stop.name}" has no provenance.`,
        params: { stopId: stop.id },
      });
    } else if (stop.provenance.state === 'accepted' && !stop.provenance.acceptedAt) {
      push({
        level: 'warn',
        code: 'accepted_without_timestamp',
        ref,
        message: `"${stop.name}" is accepted with no acceptance date.`,
        params: { stopId: stop.id },
      });
    }
    // §2.9 / §2.14 rule 6: the credit link is what makes "never present a friend's idea as
    // your own plan" mechanical, and acceptance is allowed to change the badge but never the
    // credit. A `source:'friend'` record with no `origin.sourceTripId` has lost it.
    if (stop.provenance && stop.provenance.source === 'friend' && !stop.provenance.origin?.sourceTripId) {
      push({
        level: 'error',
        code: 'origin_stripped',
        ref,
        message: `"${stop.name}" came from someone else but no longer says who — the credit link is gone.`,
        params: { stopId: stop.id },
      });
    }
    checkActor(stop.provenance, ref, `"${stop.name}"`);

    const at = stopLatLng(stop, trip);
    if (at && !inRange(at)) {
      push({
        level: 'error',
        code: 'lat_lng_out_of_range',
        ref,
        message: `"${stop.name}" has coordinates outside the legal range (${at.lat}, ${at.lng}).`,
        params: { stopId: stop.id, lat: at.lat, lng: at.lng },
      });
    }
    // `stop_far_from_city` was here. DELETED, not folded (§2.9): it was a second
    // implementation of `geo_outlier` with the same primaryCity-only defect and twice the
    // noise — 20 of 31 issues, 13 of them explained by another city on the same day or a
    // `daytrip` flag. A coordinate outlier is a CONFLICT, a thing to act on with both sides
    // stated, not a structural validity problem. `lat_lng_out_of_range` stays: |lat| > 90 is
    // genuine structural invalidity and is not a distance at all. There is now exactly one
    // implementation of coordinate-to-anchor distance in core, `derive/geoCheck.ts`.

    if (mixesBasis(stop.cost)) {
      push({
        level: 'warn',
        code: 'cost_basis_mixed',
        ref,
        message: `"${stop.name}" mixes per-person and per-party prices in one estimate.`,
        params: { stopId: stop.id, display: stop.cost?.display ?? '' },
      });
    }
    if (stop.cost && currenciesOf(stop.cost).some((c) => c !== trip.homeCurrency)) {
      push({
        level: 'warn',
        code: 'cost_basis_mixed',
        ref,
        message:
          `"${stop.name}" is priced in ${currenciesOf(stop.cost).join('/')} on a trip kept in ` +
          `${trip.homeCurrency}; core will not convert it.`,
        params: {
          stopId: stop.id,
          currencies: currenciesOf(stop.cost).join('/'),
          homeCurrency: trip.homeCurrency,
          display: stop.cost.display ?? '',
        },
      });
    }
  }

  for (const p of trip.places) {
    if (p.at === null) {
      push({
        level: 'error',
        code: 'lat_lng_out_of_range',
        ref: { kind: 'place', id: p.id },
        message: `Place "${p.name}" has no coordinates at all.`,
        params: { placeId: p.id, name: p.name, cityKey: p.cityKey },
      });
    } else if (!inRange(p.at)) {
      push({
        level: 'error',
        code: 'lat_lng_out_of_range',
        ref: { kind: 'place', id: p.id },
        message: `Place "${p.name}" has coordinates outside the legal range.`,
        params: { placeId: p.id, lat: p.at.lat, lng: p.at.lng },
      });
    }
    if (!trip.cities.some((c) => c.key === p.cityKey)) {
      push({
        level: 'error',
        code: 'unknown_city_key',
        ref: { kind: 'place', id: p.id },
        message: `Place "${p.name}" references ${NO_SUCH_CITY}.`,
        params: { placeId: p.id, cityKey: p.cityKey },
      });
    }
    // `place_hours_malformed` (ratified by §2.14 **A-20**, revision 15) means: **this in-memory
    // document holds a `Place.hours` that `fromJSON` would refuse.** Since A-20 the parser
    // stands at that door, so this reports a document built in memory *past* the type system —
    // a cast, a future untyped writer, a native bridge. It is not dead code: `toJSON` will
    // happily re-emit such an `hours`, and the export then fails to re-import at that field, so
    // without this the user learns their backup is unrestorable at restore time. One shared
    // predicate answers the question here, in `fromJSON` and at the copy boundary — three
    // disagreeing answers is what R16-2 was.
    //
    // `warn`, not `error`: nothing is unreachable or contradictory and the trip renders. A
    // `weekly` entry with extra keys is NOT reported — the parser drops them and nothing reads
    // them, so a warning would be noise about a field this trip does not use.
    if (p.hours !== undefined && !isOpeningHours(p.hours)) {
      push({
        level: 'warn',
        code: 'place_hours_malformed',
        ref: { kind: 'place', id: p.id },
        message: `Place "${p.name}" has opening hours in a shape this trip cannot read.`,
        params: { placeId: p.id, name: p.name },
      });
    }
  }

  // --- bookings ----------------------------------------------------------------
  for (const b of trip.bookings) {
    const ref = { kind: 'booking' as const, id: b.id };
    if (!b.provenance) {
      push({
        level: 'error',
        code: 'provenance_missing',
        ref,
        message: `Booking ${b.operator} ${b.reference ?? ''} has no provenance.`.replace(/\s+/g, ' ').trim(),
        params: { bookingId: b.id },
      });
      continue;
    }
    // §2.9: this applies to bookings as well as stops. `{state:'accepted', acceptedAt:null}`
    // on a Booking renders 'own' and is precisely the shape a Phase 3 ingest bug produces.
    if (b.provenance.state === 'accepted' && !b.provenance.acceptedAt) {
      push({
        level: 'warn',
        code: 'accepted_without_timestamp',
        ref,
        message: `Booking ${b.operator} ${b.reference ?? b.id} is accepted with no acceptance date.`,
        params: { bookingId: b.id, operator: b.operator },
      });
    }
    if (b.provenance.source === 'friend' && !b.provenance.origin?.sourceTripId) {
      push({
        level: 'error',
        code: 'origin_stripped',
        ref,
        message: `Booking ${b.operator} ${b.reference ?? b.id} came from someone else but no longer says who.`,
        params: { bookingId: b.id, operator: b.operator },
      });
    }
    checkActor(b.provenance, ref, `Booking ${b.operator} ${b.reference ?? b.id}`);
  }

  // --- photos (§10.1, A-57 Part 6) -----------------------------------------------
  // Two codes, and BOTH are reports rather than throws. §10.3's fallback-to-`trip` is the
  // repair the *actions* perform (`removeStop`, `ensureDays`); this is the half that catches a
  // document which never went through one — an import, a hand edit, a native bridge.
  //
  // No coordinate reaches a `message` here. §10.5's cross-cutting rule ("no coordinate in any
  // log line, ever") and §2.1's structured-`params` rule point the same way: the numbers go in
  // `params`, where a surface can decide whether to show them, and the sentence does not.
  const dayIds = new Set(trip.days.map((d) => d.id));
  const allStopIds = new Set<string>();
  for (const d of trip.days) for (const s of d.stops) allStopIds.add(s.id);
  for (const s of trip.pool) allStopIds.add(s.id);
  for (const p of trip.photos ?? []) {
    const ref = { kind: 'trip' as const, id: trip.id };
    const label = p.caption.trim() ? `"${p.caption.trim()}"` : 'A photo';
    // Read into a local once, so the narrowing survives the closure below — A-21's rule
    // (`toJSON`'s `weekly`) applied to a discriminated union rather than to an accessor.
    const attach = p.attach;
    if (attach.kind === 'day' && !dayIds.has(attach.dayId)) {
      push({
        level: 'warn',
        code: 'photo_attach_dangling',
        ref,
        message: `${label} is attached to a day this trip no longer has.`,
        params: { photoId: p.id, dayId: attach.dayId },
      });
    } else if (attach.kind === 'stop' && !allStopIds.has(attach.stopId)) {
      push({
        level: 'warn',
        code: 'photo_attach_dangling',
        ref,
        message: `${label} is attached to a stop this trip no longer has.`,
        params: { photoId: p.id, stopId: attach.stopId },
      });
    } else if (attach.kind === 'place' && !trip.places.some((pl) => pl.id === attach.placeId)) {
      // Not built (A-57 Part 3), and parsed anyway (`fromJSON`) so a later build's document is
      // readable. If one arrives dangling it is reported like any other dangling attachment.
      push({
        level: 'warn',
        code: 'photo_attach_dangling',
        ref,
        message: `${label} is attached to a place this trip no longer has.`,
        params: { photoId: p.id, placeId: attach.placeId },
      });
    }
    if (p.at && !inRange(p.at)) {
      push({
        level: 'error',
        code: 'photo_coords_out_of_range',
        ref,
        message: `${label} carries a location outside the legal range.`,
        params: { photoId: p.id, lat: p.at.lat, lng: p.at.lng },
      });
    }
    if (!p.provenance) {
      push({
        level: 'error',
        code: 'provenance_missing',
        ref,
        message: `${label} has no provenance.`,
        params: { photoId: p.id },
      });
    }
  }

  // --- participants (§8.3, ROADMAP I-9) -------------------------------------------
  // Two codes, three checks, and **all three are reports rather than throws** — §2.9's standing
  // reason: a document already carrying one must OPEN, so the user can see it and act.
  //
  // The population is documents built past the type system. `addParticipant` mints its id from
  // the injected factory and takes none from a caller, and `fromJSON` refuses a duplicate id at
  // the parser (ROADMAP I-9's own verification bullet), so what is left for these to catch is a
  // cast, a hand-built `Trip`, a native bridge, or the in-memory document whose EXPORT would
  // fail to re-import — which is exactly `place_hours_malformed`'s shape since A-20, and exactly
  // why it is not dead code: without this the user learns the backup is unrestorable at restore
  // time.
  //
  // **No participant id reaches a `message`.** A `ParticipantId` is an opaque minted string
  // (§2.1) and `Issue.message` is the sentence shown in the Issues panel — the same argument
  // A-10/R13-7 made for `CityKey`. The ids go in `params`, where a surface can decide.
  //
  // The `ref` is the **trip**, as every photo issue above is: `RefKind` has no `'participant'`
  // arm, and widening core's export surface is an architect's ruling (QA R45-6), not a check's.
  const tripRef = { kind: 'trip' as const, id: trip.id };
  const participantIdsSeen = new Map<string, string>();
  let selfSeen: Participant | null = null;
  for (const p of trip.participants ?? []) {
    const first = participantIdsSeen.get(p.id);
    if (first !== undefined) {
      // Structurally broken, not merely untidy: `updateParticipant` edits the first row and
      // `removeParticipant` deletes both, so the two can never be told apart or edited apart.
      push({
        level: 'error',
        code: 'duplicate_participant_id',
        ref: tripRef,
        message:
          `Two people on this trip — ${namePhrase(first)} and ${namePhrase(p.displayName)} — share one ` +
          `record, so editing or removing either one affects both.`,
        params: { tripId: trip.id, participantId: p.id },
      });
    } else participantIdsSeen.set(p.id, p.displayName);

    if (!p.displayName.trim()) {
      // §8.3 verbatim: a participant with no name renders as a ghost row and can never be
      // re-identified. A name in any script is a name — emptiness is the whole rule.
      push({
        level: 'error',
        code: 'participant_name_empty',
        ref: tripRef,
        message:
          'Someone on this trip has no name, so nothing can label them and nobody can tell who ' +
          'they were meant to be.',
        params: { tripId: trip.id, participantId: p.id },
      });
    }

    // §8.3's third check, riding on the first's code and mechanism: `'self'` IS `trip.ownerId`,
    // so two `'self'` rows are two rows asserting one identity. **Zero is legal** — §8.3 says
    // "at most one", never "exactly one", and a trip whose owner has not recorded themselves is
    // an ordinary trip. Reported once, on the second row, not once per row after it.
    if (p.kind === 'self') {
      if (selfSeen !== null) {
        push({
          level: 'error',
          code: 'duplicate_participant_id',
          ref: tripRef,
          message:
            `Two people on this trip — ${namePhrase(selfSeen.displayName)} and ` +
            `${namePhrase(p.displayName)} — are both marked as you, and a trip has one owner.`,
          params: { tripId: trip.id, participantId: p.id, otherParticipantId: selfSeen.id, kind: 'self' },
        });
      } else selfSeen = p;
    }
  }

  // --- resolutions ---------------------------------------------------------------
  // §2.7: `trip.resolutions` accumulates retired rows forever with nothing collecting them.
  const retired = trip.resolutions.filter((r) => r.retiredAt).length;
  if (retired > STALE_RESOLUTION_LIMIT) {
    push({
      level: 'warn',
      code: 'stale_resolutions',
      ref: { kind: 'trip', id: trip.id },
      message: `${retired} retired conflict resolutions are still stored; nothing collects them.`,
      params: { tripId: trip.id, retired, limit: STALE_RESOLUTION_LIMIT },
    });
  }

  // --- the calendar, not the shape -----------------------------------------------
  for (const [label, value] of [['startDate', trip.startDate], ['endDate', trip.endDate]] as const) {
    if (!isIsoDate(value)) {
      push({
        level: 'error',
        code: 'invalid_calendar_date',
        ref: { kind: 'trip', id: trip.id },
        message: `Trip ${label} "${value}" is not a real calendar date.`,
        params: { tripId: trip.id, field: label, value },
      });
    }
  }
  for (const d of trip.days) {
    if (!isIsoDate(d.date)) {
      push({
        level: 'error',
        code: 'invalid_calendar_date',
        ref: { kind: 'day', id: d.id },
        message: `Day "${d.date}" is not a real calendar date.`,
        params: { dayId: d.id, value: d.date },
      });
    }
  }

  return out;
}

/** §2.7 — beyond this many retired resolutions, say so rather than growing forever. */
export const STALE_RESOLUTION_LIMIT = 50;

/** Convenience split for a UI. Pure. */
export function issueCounts(issues: readonly Issue[]): { error: number; warn: number } {
  return {
    error: issues.filter((i) => i.level === 'error').length,
    warn: issues.filter((i) => i.level === 'warn').length,
  };
}
