/**
 * Bookings (ARCHITECTURE §2.2, §2.10).
 *
 * A reissue is NOT a duplicate: `supersedesId` links the new booking to the old one and the
 * old one becomes `status:'superseded'`. Nothing here ever silently overwrites a booking —
 * that is `HISTORY.md` Pass 5's lesson and §5.1's structural rule.
 */
import type { Booking, Stop, Trip } from '../model/types.ts';
import type { BookingId, StopId } from '../model/ids.ts';
import { findStop } from './stops.ts';

/**
 * Inserts or replaces a booking by id. Pure.
 * @throws {Error} if the booking has no id.
 */
export function upsertBooking(trip: Trip, booking: Booking): Trip {
  if (!booking.id) throw new Error('upsertBooking: booking.id is required');
  const i = trip.bookings.findIndex((b) => b.id === booking.id);
  const bookings = trip.bookings.slice();
  if (i < 0) bookings.push(booking);
  else bookings[i] = booking;
  return { ...trip, bookings, revision: trip.revision + 1 };
}

/**
 * Records that `newId` supersedes `oldId` — the Smartwings reissue case.
 * Both bookings stay in the trip; the older one is marked, never deleted. Pure.
 * @throws {Error} if either booking is missing.
 */
export function supersedeBooking(trip: Trip, oldId: BookingId, newId: BookingId): Trip {
  const oldB = trip.bookings.find((b) => b.id === oldId);
  const newB = trip.bookings.find((b) => b.id === newId);
  if (!oldB || !newB) throw new Error('supersedeBooking: both bookings must exist');
  const bookings = trip.bookings.map((b) =>
    b.id === oldId ? { ...b, status: 'superseded' as const } : b.id === newId ? { ...b, supersedesId: oldId } : b,
  );
  return { ...trip, bookings, revision: trip.revision + 1 };
}

/**
 * Links a stop to a booking (or clears the link with `null`). Pure.
 * @throws {Error} if the stop or the booking does not exist.
 */
export function linkBooking(trip: Trip, stopId: StopId, bookingId: BookingId | null): Trip {
  if (!findStop(trip, stopId)) throw new Error(`linkBooking: no such stop ${stopId}`);
  if (bookingId && !trip.bookings.some((b) => b.id === bookingId)) {
    throw new Error(`linkBooking: no such booking ${bookingId}`);
  }
  const days = trip.days.map((d) => ({
    ...d,
    stops: d.stops.map((s) => (s.id === stopId ? { ...s, bookingId } : s)),
  }));
  const pool = trip.pool.map((s) => (s.id === stopId ? { ...s, bookingId } : s));
  return { ...trip, days, pool, revision: trip.revision + 1 };
}

/** Every stop linked to a booking. Pure. */
export function stopsForBooking(trip: Trip, bookingId: BookingId): Stop[] {
  const out: Stop[] = [];
  for (const d of trip.days) for (const s of d.stops) if (s.bookingId === bookingId) out.push(s);
  for (const s of trip.pool) if (s.bookingId === bookingId) out.push(s);
  return out;
}
