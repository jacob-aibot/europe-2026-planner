/**
 * Stop editing (ARCHITECTURE §2.4, §2.10).
 *
 * `moveStop` covers day↔day, day↔pool and reorder in ONE function deliberately: in the
 * live app those are three functions with three chances to disagree about what happens to
 * `sug` / `_optId` / `addHint`.
 *
 * ORDERING NOTE. `day.stops` array order is canonical — it is what the user sees and what
 * a drag produces. `placement.order` mirrors the array index so the order survives a
 * round-trip through JSON and through the pool. `compareStops` implements §2.4's
 * `(timeVal, order)` rule and is used when *inserting* a new stop; it is never applied
 * destructively to an existing day, because that would silently undo a drag that
 * contradicts the times. See BUILD-NOTES §1, KD-6.
 */
import type { Day, MoveOverride, Place, PlaceLink, Stop, StopPlacement, TravelRole, Trip } from '../model/types.ts';
import type { CityKey, ClockTime, DayId, StopId } from '../model/ids.ts';
import { timeVal } from '../derive/legs.ts';
import type { BuildCtx } from './createTrip.ts';
import { userProvenance } from '../model/provenance.ts';

/** §2.4 ordering: by time ascending, untimed last, ties broken by `order`. Pure. */
export function compareStops(a: Stop, b: Stop): number {
  const ta = a.placement.kind === 'scheduled' ? timeVal(a.placement.time) : 99999;
  const tb = b.placement.kind === 'scheduled' ? timeVal(b.placement.time) : 99999;
  if (ta !== tb) return ta - tb;
  const oa = a.placement.kind === 'scheduled' ? a.placement.order : 0;
  const ob = b.placement.kind === 'scheduled' ? b.placement.order : 0;
  return oa - ob;
}

/** The index `insertStopSorted` would use: before the first stop with a strictly greater time. Pure. */
export function insertionIndex(stops: readonly Stop[], time: ClockTime | null): number {
  const t = timeVal(time);
  const idx = stops.findIndex((s) => (s.placement.kind === 'scheduled' ? timeVal(s.placement.time) : 99999) > t);
  return idx === -1 ? stops.length : idx;
}

/**
 * Rewrites `placement.order` to match array position. Pure.
 *
 * Exported (module-internal, not on §2.10's surface) so `merge/mergeTrips.ts` reindexes a
 * merged day through this function rather than growing a second copy of the rule.
 */
export function reindex(stops: readonly Stop[], dayId: DayId): Stop[] {
  return stops.map((s, i) =>
    s.placement.kind === 'scheduled' && s.placement.dayId === dayId && s.placement.order === i
      ? s
      : { ...s, placement: { kind: 'scheduled', dayId, time: s.placement.kind === 'scheduled' ? s.placement.time : null, order: i } },
  );
}

function withDay(trip: Trip, dayId: DayId, fn: (d: Day) => Day): Trip {
  const idx = trip.days.findIndex((d) => d.id === dayId);
  if (idx < 0) throw new Error(`no such day: ${dayId}`);
  const days = trip.days.slice();
  days[idx] = fn(trip.days[idx]);
  return { ...trip, days };
}

export type StopInit = {
  id?: StopId;
  name: string;
  category: Stop['category'];
  place?: PlaceLink;
  note?: string;
  cost?: Stop['cost'];
  arrival?: MoveOverride | null;
  travelRole?: TravelRole;
  bookingId?: string | null;
  flags?: string[];
  provenance?: Stop['provenance'];
  durationMins?: number | null;
  links?: Stop['links'];
  ticket?: Stop['ticket'];
};

/** Builds a `Stop` from a loose init object. Pure apart from consuming one id. */
export function makeStop(init: StopInit, placement: StopPlacement, ctx: BuildCtx): Stop {
  return {
    id: init.id ?? ctx.ids.newId('stop'),
    placement,
    name: init.name,
    category: init.category,
    place: init.place ?? { kind: 'none' },
    note: init.note ?? '',
    cost: init.cost ?? null,
    arrival: init.arrival ?? null,
    travelRole: init.travelRole ?? 'transfer',
    bookingId: init.bookingId ?? null,
    flags: init.flags ?? [],
    provenance: init.provenance ?? userProvenance(ctx.now, ctx.actorUserId ?? null),
    durationMins: init.durationMins ?? null,
    ...(init.links ? { links: init.links } : {}),
    ...(init.ticket ? { ticket: init.ticket } : {}),
  };
}

/**
 * Adds a stop at a placement. A scheduled stop lands at `placement.order` if it is a valid
 * index, otherwise sorted by time (the live app's `insertStopSorted`). Pure.
 *
 * @throws {Error} if the target day does not exist.
 */
export function addStop(trip: Trip, placement: StopPlacement, init: StopInit, ctx: BuildCtx): Trip {
  if (placement.kind === 'pool') {
    const stop = makeStop(init, placement, ctx);
    return { ...trip, pool: [...trip.pool, stop], revision: trip.revision + 1 };
  }
  const dayId = placement.dayId;
  const next = withDay(trip, dayId, (day) => {
    const stop = makeStop(init, placement, ctx);
    const at =
      Number.isInteger(placement.order) && placement.order >= 0 && placement.order <= day.stops.length
        ? placement.order
        : insertionIndex(day.stops, placement.time);
    const stops = day.stops.slice();
    stops.splice(at, 0, stop);
    return { ...day, stops: reindex(stops, dayId) };
  });
  return { ...next, revision: trip.revision + 1 };
}

export type StopPatch = Partial<Omit<Stop, 'id' | 'placement' | 'provenance'>> & { time?: ClockTime | null };

/**
 * Keys a patch may never carry. `StopPatch` excludes them at compile time, but every caller
 * that matters is `any`-shaped at its boundary — a JSON action, an import, and in Phase 3
 * the ingest worker §5.1 says must have no path to forge provenance.
 *
 * - `id` rewrites the stop's identity and dangles its `bookingId` and any
 *   `ConflictResolution` naming it.
 * - `placement` is `moveStop`'s job; §2.10 makes that ONE function on purpose.
 * - `provenance` turns a system suggestion into the user's own plan, which is the one
 *   convention `CLAUDE.md` calls absolute. Use `acceptCandidate` / `rejectCandidate`.
 */
const FORBIDDEN_PATCH_KEYS = ['id', 'placement', 'provenance'] as const;

/** @throws {Error} on any forbidden key, present even with an `undefined` value. */
function assertPatchable(patch: object): void {
  for (const k of FORBIDDEN_PATCH_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      throw new Error(
        `updateStop: "${k}" may not be patched — ` +
          (k === 'placement'
            ? 'use moveStop'
            : k === 'provenance'
              ? 'use acceptCandidate / rejectCandidate'
              : 'a stop id is immutable'),
      );
    }
  }
}

/**
 * Patches a stop wherever it lives (a day or the pool). Passing `time` retimes a scheduled
 * stop without moving it — use `moveStop` to change position. Pure.
 *
 * @throws {Error} if no stop with that id exists, or if the patch carries `id`,
 *         `placement` or `provenance` — programmer error per §2.1.
 */
export function updateStop(trip: Trip, stopId: StopId, patch: StopPatch): Trip {
  assertPatchable(patch);
  const { time, ...rest } = patch;
  let found = false;
  const days = trip.days.map((day) => {
    const i = day.stops.findIndex((s) => s.id === stopId);
    if (i < 0) return day;
    found = true;
    const s = day.stops[i];
    const placement: StopPlacement =
      time !== undefined && s.placement.kind === 'scheduled' ? { ...s.placement, time } : s.placement;
    const stops = day.stops.slice();
    stops[i] = { ...s, ...rest, placement };
    return { ...day, stops };
  });
  if (found) return { ...trip, days, revision: trip.revision + 1 };
  const pi = trip.pool.findIndex((s) => s.id === stopId);
  if (pi < 0) throw new Error(`updateStop: no such stop ${stopId}`);
  const pool = trip.pool.slice();
  pool[pi] = { ...pool[pi], ...rest };
  return { ...trip, pool, revision: trip.revision + 1 };
}

/** Removes a stop from wherever it is. Pure. @throws {Error} if it does not exist. */
export function removeStop(trip: Trip, stopId: StopId): Trip {
  let found = false;
  const days = trip.days.map((day) => {
    if (!day.stops.some((s) => s.id === stopId)) return day;
    found = true;
    return { ...day, stops: reindex(day.stops.filter((s) => s.id !== stopId), day.id) };
  });
  if (found) return { ...trip, days, revision: trip.revision + 1 };
  if (!trip.pool.some((s) => s.id === stopId)) throw new Error(`removeStop: no such stop ${stopId}`);
  return { ...trip, pool: trip.pool.filter((s) => s.id !== stopId), revision: trip.revision + 1 };
}

/** Finds a stop anywhere in the trip. Pure; returns null. */
export function findStop(trip: Trip, stopId: StopId): Stop | null {
  for (const d of trip.days) {
    const s = d.stops.find((x) => x.id === stopId);
    if (s) return s;
  }
  return trip.pool.find((x) => x.id === stopId) ?? null;
}

/**
 * The ONE placement function: day↔day, day↔pool, pool↔day and reorder-within-a-day.
 *
 * The stop's identity, provenance, cost, booking link and arrival override are carried
 * across unchanged; only `placement` moves. Pure.
 *
 * @throws {Error} if the stop or the target day does not exist.
 */
export function moveStop(trip: Trip, stopId: StopId, placement: StopPlacement): Trip {
  const stop = findStop(trip, stopId);
  if (!stop) throw new Error(`moveStop: no such stop ${stopId}`);
  if (placement.kind === 'scheduled' && !trip.days.some((d) => d.id === placement.dayId)) {
    throw new Error(`moveStop: no such day ${placement.dayId}`);
  }
  // Detach.
  let days = trip.days.map((day) =>
    day.stops.some((s) => s.id === stopId)
      ? { ...day, stops: reindex(day.stops.filter((s) => s.id !== stopId), day.id) }
      : day,
  );
  let pool = trip.pool.filter((s) => s.id !== stopId);

  if (placement.kind === 'pool') {
    pool = [...pool, { ...stop, placement }];
  } else {
    const di = days.findIndex((d) => d.id === placement.dayId);
    const day = days[di];
    const at =
      Number.isInteger(placement.order) && placement.order >= 0 && placement.order <= day.stops.length
        ? placement.order
        : insertionIndex(day.stops, placement.time);
    const stops = day.stops.slice();
    stops.splice(at, 0, { ...stop, placement });
    days = days.slice();
    days[di] = { ...day, stops: reindex(stops, day.id) };
  }
  return { ...trip, days, pool, revision: trip.revision + 1 };
}

/** Moves a scheduled stop up or down within its day. Pure. */
export function reorderStop(trip: Trip, stopId: StopId, delta: number): Trip {
  const stop = findStop(trip, stopId);
  if (!stop || stop.placement.kind !== 'scheduled') throw new Error(`reorderStop: ${stopId} is not scheduled`);
  const day = trip.days.find((d) => d.id === (stop.placement as { dayId: DayId }).dayId);
  if (!day) throw new Error(`reorderStop: no such day`);
  const from = day.stops.findIndex((s) => s.id === stopId);
  const to = Math.max(0, Math.min(day.stops.length - 1, from + delta));
  if (to === from) return trip;
  return moveStop(trip, stopId, { kind: 'scheduled', dayId: day.id, time: stop.placement.time, order: to });
}

/** Adds a place to the trip's pin superset. Pure. */
export function addPlace(trip: Trip, place: Place): Trip {
  return { ...trip, places: [...trip.places, place], revision: trip.revision + 1 };
}

/** The city a stop belongs to: its pool city, or its day's primary city. Pure. */
export function cityOfStop(trip: Trip, stop: Stop): CityKey | null {
  if (stop.placement.kind === 'pool') return stop.placement.cityKey;
  const day = trip.days.find((d) => d.id === (stop.placement as { dayId: DayId }).dayId);
  return day ? day.primaryCity : null;
}
