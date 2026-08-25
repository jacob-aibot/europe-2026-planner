/**
 * Three-way document merge — the resolution half of ARCHITECTURE §2.2's
 * "last-writer-wins per stop with a revision guard".
 *
 * The guard is in the client (`store.save` compares the stored revision against
 * `persistence.savedRevision` before writing). This is what happens when the guard fires:
 * rather than picking one whole document and destroying the other, the two documents are
 * merged entity by entity against their common ancestor.
 *
 * Rules, in the order they are applied to each entity:
 *
 *   1. neither side changed it            → keep it
 *   2. only one side changed it           → take that side's version
 *   3. both sides changed it              → LAST WRITER WINS: the saving (local) side, and
 *                                           the loss is recorded in `report.overwritten`
 *   4. one side deleted, the other did not touch it   → the delete stands
 *   5. one side deleted, the other EDITED it          → the edit stands; a delete never
 *                                                       silently destroys a live edit
 *
 * Every decision that took something from storage or discarded something is in the report,
 * so a caller can tell the user. Nothing here is silent.
 *
 * Pure: no clock, no ids, no IO. `revision` becomes `max(local, remote) + 1` so the next
 * revision guard compares against a value strictly ahead of both writers.
 */
import type { Booking, ConflictResolution, Day, Place, Stop, Trip } from '../model/types.ts';
import type { StopId } from '../model/ids.ts';
import { reindex } from '../build/stops.ts';

/** One thing the merge decided. `field` is set where the decision was narrower than the whole entity. */
export type MergeNote = { entity: string; id: string; field?: string };

export type MergeReport = {
  /** Changes that came out of the stored document — the other writer's work, preserved. */
  fromRemote: MergeNote[];
  /** Changes the stored document had that this write overrode. The only lossy list. */
  overwritten: MergeNote[];
};

export type MergeResult = { trip: Trip; report: MergeReport };

/** Structural equality. Key order insensitive; used only for "did this change since base". Pure. */
function eq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  const aArr = Array.isArray(a);
  if (aArr !== Array.isArray(b)) return false;
  if (aArr) {
    const x = a as unknown[];
    const y = b as unknown[];
    return x.length === y.length && x.every((v, i) => eq(v, y[i]));
  }
  const x = a as Record<string, unknown>;
  const y = b as Record<string, unknown>;
  const kx = Object.keys(x);
  const ky = Object.keys(y);
  if (kx.length !== ky.length) return false;
  return kx.every((k) => Object.prototype.hasOwnProperty.call(y, k) && eq(x[k], y[k]));
}

type Pick<T> = { value: T; from: 'unchanged' | 'local' | 'remote'; conflict: boolean };

/** Rules 1–3 for one value. Pure. */
function pick3<T>(b: T, l: T, r: T): Pick<T> {
  if (eq(l, r)) return { value: l, from: 'unchanged', conflict: false };
  if (eq(l, b)) return { value: r, from: 'remote', conflict: false };
  if (eq(r, b)) return { value: l, from: 'local', conflict: false };
  return { value: l, from: 'local', conflict: true };
}

/**
 * Rules 1–5 over a list keyed by id. Order follows the LOCAL document — it is what the
 * saving user is looking at — with remote-only additions appended. Pure.
 */
function mergeById<T>(
  entity: string,
  keyOf: (x: T) => string,
  b: readonly T[],
  l: readonly T[],
  r: readonly T[],
  report: MergeReport,
  mergeOne?: (bv: T | undefined, lv: T, rv: T) => T,
): T[] {
  const bm = new Map(b.map((x) => [keyOf(x), x]));
  const lm = new Map(l.map((x) => [keyOf(x), x]));
  const rm = new Map(r.map((x) => [keyOf(x), x]));
  const out: T[] = [];

  for (const lv of l) {
    const id = keyOf(lv);
    const bv = bm.get(id);
    const rv = rm.get(id);
    if (rv === undefined) {
      if (bv === undefined) {
        out.push(lv); // rule: local addition
        continue;
      }
      if (eq(lv, bv)) {
        report.fromRemote.push({ entity, id, field: 'deleted' }); // rule 4
        continue;
      }
      report.overwritten.push({ entity, id, field: 'deleted_remotely' }); // rule 5
      out.push(lv);
      continue;
    }
    if (mergeOne) {
      out.push(mergeOne(bv, lv, rv));
      continue;
    }
    const p = pick3(bv as T, lv, rv);
    if (p.conflict) report.overwritten.push({ entity, id });
    else if (p.from === 'remote') report.fromRemote.push({ entity, id });
    out.push(p.value);
  }

  for (const rv of r) {
    const id = keyOf(rv);
    if (lm.has(id)) continue;
    const bv = bm.get(id);
    if (bv === undefined) {
      report.fromRemote.push({ entity, id, field: 'added' });
      out.push(rv);
      continue;
    }
    if (eq(rv, bv)) continue; // rule 4, mirrored: the local delete stands
    report.overwritten.push({ entity, id, field: 'deleted_locally' }); // rule 5, mirrored
    out.push(rv);
  }
  return out;
}

const DAY_FIELDS = ['date', 'primaryCity', 'cities', 'title', 'subtitle', 'provenance', 'legacyFlag'] as const;

function mergeDay(bv: Day | undefined, lv: Day, rv: Day, report: MergeReport): Day {
  const b = bv ?? lv;
  const out: Record<string, unknown> = { ...lv };
  for (const f of DAY_FIELDS) {
    const p = pick3<unknown>(b[f], lv[f], rv[f]);
    if (p.conflict) report.overwritten.push({ entity: 'day', id: lv.id, field: f });
    else if (p.from === 'remote') report.fromRemote.push({ entity: 'day', id: lv.id, field: f });
    if (p.value === undefined) delete out[f];
    else out[f] = p.value;
  }
  out.id = lv.id;
  out.stops = reindex(mergeById<Stop>('stop', (s) => s.id, bv?.stops ?? [], lv.stops, rv.stops, report), lv.id);
  return out as unknown as Day;
}

/**
 * A stop can only live in one place. A remote edit to a stop the local side MOVED would
 * otherwise resurrect it in its old day and leave two copies with one id — which then
 * dangles every `bookingId` and `ConflictResolution` that names it. The local document's
 * placement wins, because that is the one the saving user is looking at. Pure.
 */
function dedupePlacements(days: Day[], pool: Stop[], local: Trip, report: MergeReport): { days: Day[]; pool: Stop[] } {
  const homeOf = new Map<StopId, string>();
  for (const d of local.days) for (const s of d.stops) homeOf.set(s.id, `day:${d.id}`);
  for (const s of local.pool) homeOf.set(s.id, 'pool');

  const locations: Array<{ key: string; stops: readonly Stop[] }> = [
    ...days.map((d) => ({ key: `day:${d.id}`, stops: d.stops })),
    { key: 'pool', stops: pool },
  ];
  const keep = new Map<StopId, string>();
  for (const loc of locations) {
    for (const s of loc.stops) {
      const prev = keep.get(s.id);
      if (prev === undefined || homeOf.get(s.id) === loc.key) keep.set(s.id, loc.key);
    }
  }
  const drop = (locKey: string, stops: readonly Stop[]): Stop[] =>
    stops.filter((s) => {
      if (keep.get(s.id) === locKey) return true;
      report.overwritten.push({ entity: 'stop', id: s.id, field: 'duplicate_placement' });
      return false;
    });

  return {
    days: days.map((d) => {
      const kept = drop(`day:${d.id}`, d.stops);
      return kept.length === d.stops.length ? d : { ...d, stops: reindex(kept, d.id) };
    }),
    pool: drop('pool', pool),
  };
}

const TRIP_FIELDS = ['title', 'ownerId', 'startDate', 'endDate', 'homeCurrency', 'party', 'schemaVersion', 'meta'] as const;

/**
 * Merges `local` (what this writer is about to save) and `remote` (what storage holds now)
 * against `base` (their common ancestor — the document this writer last agreed with
 * storage about).
 *
 * @throws {Error} if the three documents are not the same trip — programmer error, §2.1.
 */
export function mergeTrips(base: Trip, local: Trip, remote: Trip): MergeResult {
  if (base.id !== local.id || base.id !== remote.id) {
    throw new Error(
      `mergeTrips: base, local and remote must be the same trip (got ${base.id}, ${local.id}, ${remote.id})`,
    );
  }
  const report: MergeReport = { fromRemote: [], overwritten: [] };
  const out: Record<string, unknown> = { ...local };

  for (const f of TRIP_FIELDS) {
    const p = pick3<unknown>(base[f], local[f], remote[f]);
    if (p.conflict) report.overwritten.push({ entity: 'trip', id: local.id, field: f });
    else if (p.from === 'remote') report.fromRemote.push({ entity: 'trip', id: local.id, field: f });
    if (p.value === undefined) delete out[f];
    else out[f] = p.value;
  }

  const cities = mergeById('city', (c: Trip['cities'][number]) => c.key, base.cities, local.cities, remote.cities, report);
  const mergedDays = mergeById<Day>('day', (d) => d.id, base.days, local.days, remote.days, report, (bv, lv, rv) =>
    mergeDay(bv, lv, rv, report),
  ).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const mergedPool = mergeById<Stop>('poolStop', (s) => s.id, base.pool, local.pool, remote.pool, report);
  const deduped = dedupePlacements(mergedDays, mergedPool, local, report);

  out.id = local.id;
  out.cities = cities;
  out.days = deduped.days;
  out.pool = deduped.pool;
  out.places = mergeById<Place>('place', (p) => p.id, base.places, local.places, remote.places, report);
  out.bookings = mergeById<Booking>('booking', (b) => b.id, base.bookings, local.bookings, remote.bookings, report);
  out.resolutions = mergeById<ConflictResolution>(
    'resolution', (r) => r.conflictId, base.resolutions, local.resolutions, remote.resolutions, report,
  );
  out.revision = Math.max(local.revision, remote.revision) + 1;

  return { trip: out as unknown as Trip, report };
}

/** True when a merge discarded something the stored document held. Pure. */
export function mergeLostData(report: MergeReport): boolean {
  return report.overwritten.length > 0;
}

/** A short, human-readable account of a merge, for a banner. Pure. */
export function describeMerge(report: MergeReport): string {
  const took = report.fromRemote.length;
  const lost = report.overwritten.length;
  if (took === 0 && lost === 0) return 'Merged with changes saved elsewhere.';
  const parts: string[] = [];
  if (took) parts.push(`kept ${took} change${took === 1 ? '' : 's'} made in another tab`);
  if (lost) parts.push(`overrode ${lost} (${report.overwritten.map((n) => `${n.entity}:${n.id}`).join(', ')})`);
  return `This trip was edited elsewhere while you were working: ${parts.join('; ')}.`;
}
