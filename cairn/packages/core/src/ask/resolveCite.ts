/**
 * **The single resolver of §11.6 clause 1.** Total: it answers `null` rather than throwing, for
 * every cite kind, over every document.
 *
 * > *Every answer names the records it read, and every name resolves in the document it claims
 * > to be about.*
 *
 * `trip`/`day`/`stop`/`place`/`booking` resolve by `id`; `city` by `key` (a city has no id —
 * §2.2 A-10); `conflict` against the conflict set **`ask` itself computed in the same call**,
 * which is why it is a parameter rather than something this file re-derives. A `day` cite is
 * unambiguous because §2.3 makes a day's id equal its date and `build/days.ts` enforces it.
 *
 * **Internal — §11.9.** It is not on §2.10's surface: a caller that can resolve a cite against an
 * arbitrary conflict set is a caller that can claim an answer read a record it did not.
 * `packages/core`'s own tests import this module path directly, which is what the "tests do not
 * create surface" rule is for.
 */
import type { Conflict, Trip } from '../model/types.ts';
import type { AnswerCite, CiteResolution } from './types.ts';

/**
 * The record a cite names, with a short human label, or `null` when it does not resolve.
 *
 * Pure. Never throws — a cite with a kind outside the union (a hand-built value, a future
 * writer) falls through the switch and answers `null`, which is what "total" means here.
 */
export function resolveCite(
  trip: Trip,
  cite: AnswerCite,
  conflicts: readonly Conflict[],
): CiteResolution | null {
  switch (cite.kind) {
    case 'trip':
      return trip.id === cite.id ? { kind: 'trip', id: trip.id, label: trip.title } : null;
    case 'day': {
      const day = trip.days.find((d) => d.id === cite.id);
      return day ? { kind: 'day', id: day.id, label: day.title || day.date } : null;
    }
    case 'stop': {
      const stop = [...trip.days.flatMap((d) => d.stops), ...trip.pool].find((s) => s.id === cite.id);
      return stop ? { kind: 'stop', id: stop.id, label: stop.name } : null;
    }
    case 'place': {
      const place = trip.places.find((p) => p.id === cite.id);
      return place ? { kind: 'place', id: place.id, label: place.name } : null;
    }
    case 'booking': {
      const booking = trip.bookings.find((b) => b.id === cite.id);
      return booking ? { kind: 'booking', id: booking.id, label: `${booking.operator} ${booking.kind}` } : null;
    }
    case 'city': {
      const city = trip.cities.find((c) => c.key === cite.key);
      return city ? { kind: 'city', id: city.key, label: city.name } : null;
    }
    case 'conflict': {
      const conflict = conflicts.find((c) => c.id === cite.id);
      return conflict ? { kind: 'conflict', id: conflict.id, label: conflict.summary } : null;
    }
    default:
      return null;
  }
}
