/**
 * The injected-fault fixtures the per-rule criteria already use, collected in one place so an
 * *invariant* can be swept over them (ARCHITECTURE §2.7 **A-11** assertion 2, §2.7 **A-13**'s
 * tripwire).
 *
 * Each construction is lifted verbatim from the test that already owns that rule — see the
 * comment on each entry for its home. Nothing here invents a new fault: the point is that the
 * documents an invariant is measured over are the same documents the per-rule criteria measure,
 * so a rule that stops firing breaks its own test first and the invariant second.
 *
 * §0.5's injected-fault discipline applied to an invariant instead of to a rule: a sweep over a
 * document that exercises five rules asserts nothing about the other five, so the set below must
 * between them make **every** rule in `RULES` fire.
 */
import { europe2026, FIXTURE_TODAY } from './fixture.ts';
import { updateStop, upsertBooking } from '../src/index.ts';
import type { Booking, Trip } from '../src/index.ts';

export type FaultFixture = { name: string; trip: Trip };

/**
 * The reference trip plus one document per rule the reference trip cannot exercise. Pure —
 * every entry is built from the cached fixture by immutable edits.
 */
export function faultFixtures(): FaultFixture[] {
  const { trip } = europe2026();
  return [
    // legacy_flag, unverified_reference, superseded_booking, missing_lodging, unbooked_ticketed
    { name: 'reference', trip },
    // booking_vs_plan — `conflict.test.ts`: "booking_vs_plan DOES fire when a booking and its
    // stop disagree".
    { name: 'booking_vs_plan', trip: bookingVsPlanFault(trip) },
    // overlap — `conflict.test.ts`: "overlap never fires without a duration, and does fire with
    // one".
    { name: 'overlap', trip: overlapFault(trip) },
    // duplicate_booking — `conflict.test.ts`: "duplicate_booking fires for two different
    // references on the same route and date".
    { name: 'duplicate_booking', trip: duplicateBookingFault(trip) },
    // impossible_transfer — `conflict.test.ts`: "a vehicle journey fires as a blocker only if its
    // time is called an arrival" (Aug 7, Condor DE2081, 660 min into a 120 min gap).
    { name: 'impossible_transfer', trip: impossibleTransferFault(trip) },
    // geo_outlier — `geoCheck.test.ts`'s +1° latitude fault, at +9° so it clears the 35 km bar
    // with room to spare.
    { name: 'geo_outlier', trip: geoOutlierFault(trip) },
  ];
}

function bookingVsPlanFault(trip: Trip): Trip {
  const stop = trip.days
    .find((d) => d.id === '2026-08-15')!
    .stops.find((s) => s.name.startsWith('Smartwings'))!;
  return updateStop(trip, stop.id, { time: '09:00' });
}

function overlapFault(trip: Trip): Trip {
  const day = trip.days.find((d) => d.id === '2026-08-16')!;
  const [a, b] = day.stops;
  return updateStop(updateStop(trip, a.id, { durationMins: 240 }), b.id, { durationMins: 30 });
}

function duplicateBookingFault(trip: Trip): Trip {
  const original = trip.bookings.find((b) => b.reference === 'AS67UA')!;
  const clone: Booking = { ...original, id: 'booking-clone', reference: 'ZZ99XX' };
  return upsertBooking(trip, clone);
}

function impossibleTransferFault(trip: Trip): Trip {
  const day = trip.days.find((d) => d.id === '2026-08-07')!;
  const target = day.stops.find((s) => s.name.includes('Condor DE2081'))!;
  const stops = day.stops.map((s) => (s.id === target.id ? { ...s, travelRole: 'transfer' as const } : s));
  return { ...trip, days: trip.days.map((d) => (d.id === day.id ? { ...d, stops } : d)) };
}

function geoOutlierFault(trip: Trip): Trip {
  const place = trip.places.find((p) => p.cityKey === 'vienna' && p.at !== null)!;
  return {
    ...trip,
    places: trip.places.map((p) =>
      p.id === place.id ? { ...p, at: { lat: place.at!.lat + 9, lng: place.at!.lng } } : p,
    ),
  };
}

/** The clock the per-rule criteria use, re-exported so a sweep can state its baseline. */
export { FIXTURE_TODAY };
