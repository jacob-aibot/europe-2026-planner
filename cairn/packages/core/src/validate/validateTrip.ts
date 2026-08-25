/**
 * `validateTrip` (ARCHITECTURE §2.9).
 *
 * This generalises the scripted checks in the root `CLAUDE.md` — the ones that caught bugs
 * nothing visible was showing, like Fisherman's Bastion 111 km north of Budapest.
 *
 * Structural problems are `error`. Things that are probably wrong but might be deliberate
 * are `warn`. Nothing here throws and nothing here mutates.
 */
import type { Issue, Stop, Trip } from '../model/types.ts';
import { addDays, dayNumber } from '../derive/summary.ts';
import { inRange, stopLatLng } from '../derive/geo.ts';
import { isIsoDate } from '../model/ids.ts';
import { currenciesOf, mixesBasis } from '../model/money.ts';


/** Pure. Returns every problem found, in a deterministic order; never throws. */
export function validateTrip(trip: Trip): Issue[] {
  const out: Issue[] = [];
  const push = (i: Issue) => out.push(i);

  if (!trip.ownerId) {
    push({
      level: 'error',
      code: 'owner_missing',
      ref: { kind: 'trip', id: trip.id },
      message: 'The trip has no owner.',
      params: { tripId: trip.id },
    });
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
      push({
        level: 'error',
        code: 'primary_city_not_in_cities',
        ref: { kind: 'day', id: d.id },
        message: `${d.date}: primary city "${d.primaryCity}" is not listed in the day's cities.`,
        params: { dayId: d.id, primaryCity: d.primaryCity, cities: d.cities.join(',') },
      });
    }
    for (const key of d.cities) {
      if (key === 'transit') continue;
      if (!trip.cities.some((c) => c.key === key)) {
        push({
          level: 'error',
          code: 'unknown_city_key',
          ref: { kind: 'day', id: d.id },
          message: `${d.date} references unknown city "${key}".`,
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
  }

  // --- ids unique across the document -----------------------------------------
  const seen = new Map<string, string>();
  const claim = (kind: string, id: string, refKind: Issue['ref']['kind']) => {
    const key = `${kind}:${id}`;
    if (seen.has(key)) {
      push({
        level: 'error',
        code: 'duplicate_id',
        ref: { kind: refKind, id },
        message: `Duplicate ${kind} id "${id}".`,
        params: { kind, id },
      });
    } else seen.set(key, id);
  };
  for (const d of trip.days) claim('day', d.id, 'day');
  for (const p of trip.places) claim('place', p.id, 'place');
  for (const b of trip.bookings) claim('booking', b.id, 'booking');

  const allStops: Array<{ stop: Stop; dayId: string | null }> = [];
  for (const d of trip.days) for (const s of d.stops) allStops.push({ stop: s, dayId: d.id });
  for (const s of trip.pool) allStops.push({ stop: s, dayId: null });
  for (const { stop } of allStops) claim('stop', stop.id, 'stop');

  const placeIds = new Set(trip.places.map((p) => p.id));
  const bookingIds = new Set(trip.bookings.map((b) => b.id));

  for (const { stop, dayId } of allStops) {
    const ref = { kind: 'stop' as const, id: stop.id };
    if (stop.placement.kind === 'scheduled') {
      if (dayId === null) {
        push({
          level: 'error',
          code: 'pool_stop_has_day',
          ref,
          message: `"${stop.name}" is in the pool but claims to be scheduled.`,
          params: { stopId: stop.id, name: stop.name },
        });
      } else if (stop.placement.dayId !== dayId) {
        push({
          level: 'error',
          code: 'scheduled_stop_has_no_day',
          ref,
          message: `"${stop.name}" sits on ${dayId} but its placement says ${stop.placement.dayId}.`,
          params: { stopId: stop.id, name: stop.name, actual: dayId, claimed: stop.placement.dayId },
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
        message: `Place "${p.name}" references unknown city "${p.cityKey}".`,
        params: { placeId: p.id, cityKey: p.cityKey },
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
