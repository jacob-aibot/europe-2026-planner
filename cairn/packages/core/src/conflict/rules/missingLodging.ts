/**
 * `missing_lodging` — a night spent in a city with nothing booked to sleep in.
 *
 * A night sits between two days that share a city. It counts as covered when a lodging
 * `Booking` spans it, or when a `stay` stop on the first day is linked to a booking. A
 * `stay` stop on its own is a plan, not a room: the live trip has "check in — Windsor" on
 * Aug 21 with no hotel booked at all, which is exactly the case worth surfacing.
 *
 * Consecutive uncovered nights in one city are reported as ONE conflict — three separate
 * warnings for one missing Budapest hotel is noise, not information.
 */
import type { Conflict, Trip } from '../../model/types.ts';
import type { CityKey } from '../../model/ids.ts';
import { makeConflict } from '../id.ts';
import type { Rule } from './types.ts';

function coveredByBooking(trip: Trip, cityKey: CityKey, nightDate: string): boolean {
  return trip.bookings.some((b) => {
    if (b.kind !== 'lodging' || b.status !== 'active') return false;
    const from = b.startsAt.date;
    const to = b.endsAt?.date ?? b.startsAt.date;
    return from <= nightDate && nightDate < to;
  });
}

export const missingLodging: Rule = {
  id: 'missing_lodging',
  description: 'A night in a city with no lodging booked.',
  /** §8.2: you slept somewhere; the record is merely incomplete. */
  class: 'feasibility',
  run(ctx) {
    const trip = ctx.trip;
    type Night = { cityKey: CityKey; date: string; nextDate: string };
    const uncovered: Night[] = [];
    for (let i = 0; i < trip.days.length - 1; i++) {
      const a = trip.days[i];
      const b = trip.days[i + 1];
      const shared = a.cities.filter((c) => b.cities.includes(c) && c !== 'transit');
      if (shared.length === 0) continue;
      const cityKey = shared[shared.length - 1];
      if (coveredByBooking(trip, cityKey, a.date)) continue;
      const bookedStay = a.stops.some((s) => s.category === 'stay' && s.bookingId);
      if (bookedStay) continue;
      uncovered.push({ cityKey, date: a.date, nextDate: b.date });
    }

    const runs: Night[][] = [];
    for (const n of uncovered) {
      const last = runs[runs.length - 1];
      if (last && last[last.length - 1].cityKey === n.cityKey && last[last.length - 1].nextDate === n.date) {
        last.push(n);
      } else runs.push([n]);
    }

    return runs.map((run) => {
      const city = trip.cities.find((c) => c.key === run[0].cityKey);
      const name = city ? city.name : run[0].cityKey;
      return makeConflict({
        ruleId: 'missing_lodging',
        kind: 'coverage',
        severity: 'warning',
        subjects: run.map((n) => ({ kind: 'day' as const, id: n.date })),
        summary:
          `${run.length} night${run.length > 1 ? 's' : ''} in ${name} (${run[0].date} → ` +
          `${run[run.length - 1].nextDate}) with no lodging booking on file.`,
        params: {
          cityKey: run[0].cityKey,
          cityName: name,
          nights: run.length,
          from: run[0].date,
          to: run[run.length - 1].nextDate,
        },
        values: { city: run[0].cityKey, dates: run.map((n) => n.date) },
      }) as Conflict;
    });
  },
};
