/**
 * Accepting and rejecting candidates (ARCHITECTURE §2.8, §2.10).
 *
 * Nothing that is not the user's own is ever presented as the user's plan. Acceptance is
 * an explicit act that stamps `state:'accepted'` and a timestamp; rejection keeps the item
 * (so it can be seen and undone) but marks it `rejected`, which `displayStatus` badges.
 */
import type { Provenance, Ref, Trip } from '../model/types.ts';
import type { IsoDate, UserId } from '../model/ids.ts';
import { accept, reject } from '../model/provenance.ts';

type ProvFn = (p: Provenance) => Provenance;

function mapRef(trip: Trip, ref: Ref, f: ProvFn): Trip {
  const fn = <T extends { provenance: Provenance }>(x: T): T => ({ ...x, provenance: f(x.provenance) });
  if (ref.kind === 'day') {
    let hit = false;
    const days = trip.days.map((d) => (d.id === ref.id ? ((hit = true), fn(d)) : d));
    if (!hit) throw new Error(`no such day ${ref.id}`);
    return { ...trip, days, revision: trip.revision + 1 };
  }
  if (ref.kind === 'stop') {
    let hit = false;
    const days = trip.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => (s.id === ref.id ? ((hit = true), fn(s)) : s)),
    }));
    const pool = trip.pool.map((s) => (s.id === ref.id ? ((hit = true), fn(s)) : s));
    if (!hit) throw new Error(`no such stop ${ref.id}`);
    return { ...trip, days, pool, revision: trip.revision + 1 };
  }
  if (ref.kind === 'booking') {
    let hit = false;
    const bookings = trip.bookings.map((b) => (b.id === ref.id ? ((hit = true), fn(b)) : b));
    if (!hit) throw new Error(`no such booking ${ref.id}`);
    return { ...trip, bookings, revision: trip.revision + 1 };
  }
  throw new Error(`acceptCandidate: unsupported ref kind ${ref.kind}`);
}

/**
 * Marks a day, stop or booking as the user's own. Pure.
 * @throws {Error} if the ref does not resolve, or its kind cannot carry provenance.
 */
export function acceptCandidate(trip: Trip, ref: Ref, actorUserId: UserId | null, at: IsoDate): Trip {
  return mapRef(trip, ref, (p) => accept(p, at, actorUserId));
}

/**
 * Marks a day, stop or booking rejected. It stays in the document, badged. Pure.
 * @throws {Error} if the ref does not resolve.
 */
export function rejectCandidate(trip: Trip, ref: Ref, actorUserId: UserId | null, at: IsoDate): Trip {
  return mapRef(trip, ref, (p) => reject(p, at, actorUserId));
}
