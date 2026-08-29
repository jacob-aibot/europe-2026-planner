/**
 * Selectors — thin, memo-free wrappers over core's derive functions plus the derived cache.
 *
 * No domain logic lives here either: a selector reads, filters and shapes. If it needs to
 * decide something about a trip, that decision belongs in core.
 */
import * as core from '../deps.ts';
import type { Conflict, Day, Issue, Stop, Trip } from '../deps.ts';
import type { AppState } from '../store/reducer.ts';
import type { DayDerived, DerivedCache } from '../store/derived.ts';

export function activeDay(state: AppState): Day | null {
  if (!state.doc) return null;
  const id = state.ui.activeDayId ?? state.doc.days[0]?.id;
  return state.doc.days.find((d) => d.id === id) ?? null;
}

export function dayDerived(derived: DerivedCache | null, dayId: string | null): DayDerived | null {
  if (!derived || !dayId) return null;
  return derived.days[dayId] ?? null;
}

/** City tabs, grouped exactly as the live app nests them. */
export function cityTabs(trip: Trip): Array<{ key: string; name: string; range: string | null; days: Day[]; flagEmoji?: string }> {
  return core.orderedCities(trip).map((c) => ({
    key: c.key,
    name: c.name,
    range: core.cityRange(trip, c.key),
    days: core.daysForCity(trip, c.key),
    ...(c.meta?.flagEmoji ? { flagEmoji: c.meta.flagEmoji } : {}),
  }));
}

/** Pool stops for a city, with the section heading the legacy `OPTIONAL` list carried. */
/**
 * Pooled stops that no city tab can show: their `cityKey` is not one of `trip.cities`.
 *
 * The pool panel lists one city at a time, so a stop filed under a key the trip does not
 * have is in the document, counted by the pool total, and rendered by nothing — the user's
 * stop simply vanishes (QA R2-2). `Sidebar` already solved the identical problem for days
 * with a catch-all group; this is that group's contents for the pool.
 *
 * Two real ways to land here: a stop pooled from a pure travel day (`TRANSIT_CITY_KEY`),
 * and a trip with no cities at all, which "New trip" allows. Both are legitimate states,
 * so this is a rendering concern, not an error — `validateTrip` separately reports a key
 * that is neither a trip city nor the transit group, which is a broken document.
 */
export function unfiledPool(trip: Trip): Stop[] {
  const known = new Set(trip.cities.map((c) => c.key));
  return trip.pool.filter((s) => s.placement.kind === 'pool' && !known.has(s.placement.cityKey));
}

export function poolSection(trip: Trip, cityKey: string): { title: string; note: string; stops: Stop[] } {
  const notes = (trip.meta?.poolNotes as Record<string, { title: string; note: string }> | undefined)?.[cityKey];
  return {
    title: notes?.title ?? 'Optional add-ons',
    note: notes?.note ?? '',
    stops: core.poolFor(trip, cityKey),
  };
}

export function conflictsForDay(derived: DerivedCache | null, dayId: string): Conflict[] {
  if (!derived) return [];
  return derived.conflicts.filter((c) => c.subjects.some((s) => s.kind === 'day' && s.id === dayId));
}

export function conflictsForStop(derived: DerivedCache | null, stopId: string): Conflict[] {
  if (!derived) return [];
  return derived.conflicts.filter((c) => c.subjects.some((s) => s.kind === 'stop' && s.id === stopId));
}

export function issuesForRef(derived: DerivedCache | null, id: string): Issue[] {
  if (!derived) return [];
  return derived.issues.filter((i) => i.ref.id === id);
}

/** Unresolved blockers first — what a trip header should count. */
export function conflictSummary(derived: DerivedCache | null): { blocker: number; warning: number; note: number; resolved: number } {
  const out = { blocker: 0, warning: 0, note: 0, resolved: 0 };
  for (const c of derived?.conflicts ?? []) {
    if (c.resolution) out.resolved++;
    else out[c.severity]++;
  }
  return out;
}

/** Map points for a day, straight from core's cluster focus. The client never fits bounds itself. */
export function dayMapPoints(trip: Trip, day: Day, scope: 'focus' | 'all', derived: DerivedCache | null) {
  const d = derived?.days[day.id];
  const stops = scope === 'all' || !d ? day.stops : d.focus.focus;
  const points = [];
  for (const s of stops) {
    const at = core.stopLatLng(s, trip);
    if (at) points.push({ id: s.id, lat: at.lat, lng: at.lng, label: s.name, category: s.category });
  }
  const bounds = scope === 'all' ? d?.allBounds : d?.focusBounds;
  return { points, bounds: bounds ?? core.mapBounds(points) };
}

/** Curated pins for a city map. */
export function cityMapPoints(trip: Trip, cityKey: string) {
  const points = trip.places
    .filter((p) => p.cityKey === cityKey && p.at)
    .map((p) => ({ id: p.id, lat: (p.at as { lat: number }).lat, lng: (p.at as { lng: number }).lng, label: p.name, category: p.category }));
  return { points, bounds: core.mapBounds(points.map((p) => ({ lat: p.lat, lng: p.lng }))) };
}


/**
 * How a stop's time reads on screen — ARCHITECTURE §2.12's day-view row (QA R2-10).
 *
 * `travelRole` answers *what `placement.time` actually means*, and until this existed no
 * view asked. Aug 8's Condor flight rendered `14:30 · ✈️ Flight · 1h 20m`, which reads as
 * "arrives 14:30 after an 80-minute journey". It is the opposite: 14:30 is when the aircraft
 * **leaves Frankfurt**. §2.12's consumer table: a `'journey'` stop shows *"departs 14:30 ·
 * 1 h 20 · arrives 15:50"*; a `'transfer'` stop shows today's string; `'unknown'` renders
 * with a one-tap control to set it, which is the only new editing affordance the field needs.
 *
 * The arithmetic is **wall-clock and display-only**. Core stores no UTC instants and does no
 * timezone maths (§2.1, §7) — which is exactly why `journey_overrun` is deferred to Phase 4
 * — so a run that crosses midnight is reported with `nextDay`, and a run that crosses a
 * timezone is reported as the clock arithmetic it is and nothing more. Nothing here decides
 * anything about the trip; it shapes three fields the model already holds. Pure.
 */
export type TravelLine = {
  kind: core.TravelRole;
  /** The whole phrase, ready to render. */
  text: string;
  /** `placement.time`, verbatim, or `null` for a pooled stop. */
  departs: string | null;
  /** `HH:MM`, or `null` when either half of the arithmetic is missing or not a clock. */
  arrives: string | null;
  /** True when `arrives` wrapped past midnight. Never implied — always stated. */
  nextDay: boolean;
};

export function travelLine(stop: Stop): TravelLine {
  const time = stop.placement.kind === 'scheduled' ? stop.placement.time : null;
  const kind = stop.travelRole;
  const mins = stop.arrival?.mins ?? null;

  if (kind !== 'journey') {
    // §2.12: a transfer keeps today's string, and `'unknown'` keeps it too — the model
    // cannot tell whether that time is a departure, so the view must not claim it knows.
    return { kind, text: time ?? '', departs: null, arrives: null, nextDay: false };
  }

  const clock = minutesOfDay(time);
  const end = clock !== null && mins !== null ? clock + mins : null;
  const arrives = end === null ? null : hhmm(end % (24 * 60));
  const nextDay = end !== null && end >= 24 * 60;

  const parts: string[] = [];
  if (time !== null) parts.push(`departs ${time}`);
  if (mins !== null) parts.push(core.fmtMins(mins));
  if (arrives !== null) parts.push(`arrives ${arrives}${nextDay ? ' (+1 day)' : ''}`);

  return { kind, text: parts.join(' · '), departs: time, arrives, nextDay };
}

/**
 * `HH:MM` to minutes since midnight, or `null` for anything that is not a clock time.
 *
 * Deliberately local rather than core's `timeVal`: §2.10 revision 5 took `timeVal` off the
 * public surface as an internal of `computeLegs`, and §2.10's ceiling forbids `packages/client`
 * from reaching past the index into a core module path. Two lines of display parsing that
 * returns `null` on anything malformed is the cheaper of the two wrongs — it decides nothing
 * about the trip, and it fails to `null` rather than to a guess. BUILD-NOTES KD-24. Pure.
 */
function minutesOfDay(t: string | null): number | null {
  if (t === null) return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Minutes-since-midnight to `HH:MM`. Pure. */
function hhmm(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * How complete the library's summary rows are — ARCHITECTURE §8.4 clause 3, Phase 2 I-6.
 *
 * **The one thing this may never do is claim completeness it does not have.** §8.4 clause 3:
 * the client rescans every row below `SUMMARY_VERSION` *"before the lifetime map claims to be
 * complete, and the map says 'recomputing' while it does."*
 *
 * Every answer is derived from `library` — the rows themselves — and never from "a rescan
 * pass finished". That is §0.6 applied to the cache the lifetime map depends on: a pass
 * reaching its own end is a fact about the pass, and a row's `summaryVersion` is the only
 * fact about the row. If a second bump, a second tab or a failed write leaves anything
 * behind, this says so and keeps saying so.
 *
 * `'recomputing'` wins over `'complete'` while a pass is running even when every row already
 * reads current: the pass is not finished, and a surface that flipped to "complete" for one
 * frame and back would be exactly the flicker the rule exists to forbid. Pure.
 */
export type SummaryScan = {
  phase: 'complete' | 'recomputing' | 'stale';
  /** Rows carrying the current `SUMMARY_VERSION`. */
  current: number;
  total: number;
  /** Ids whose stored row predates the current version, in library order. */
  outdated: string[];
  /** Documents the last pass could not read — reported, never silently dropped. */
  unreadable: ReadonlyArray<{ id: string; message: string }>;
};

export function summaryScan(state: Pick<AppState, 'library' | 'rescan'>): SummaryScan {
  const outdated = state.library
    .filter((r) => (r.summaryVersion ?? 0) < core.SUMMARY_VERSION)
    .map((r) => r.id);
  // QA **R26-2**, the second half. `unreadable` is an observation about a record, so it is only
  // meaningful about a record that is still there: a trip deleted since the last pass must stop
  // being reported as a file that could not be read, and `deleteTrip` runs no pass to clear it.
  // Derived here rather than remembered in the store, for §0.6's reason — a pruned list is one
  // more copy that can go stale, and this cannot. BUILD-NOTES **KD-59** records the choice and
  // its one cost: `state.rescan.unreadable` and this list can differ, and this is the one to read. (With `outdated` empty and a phantom entry
  // still in `unreadable`, `Library.tsx`'s header read *"0 trips are not up to date yet."*)
  const present = new Set(state.library.map((r) => r.id));
  const unreadable = state.rescan.unreadable.filter((u) => present.has(u.id));
  const phase = state.rescan.running
    ? 'recomputing'
    : outdated.length > 0 || unreadable.length > 0
      ? 'stale'
      : 'complete';
  return { phase, current: state.library.length - outdated.length, total: state.library.length, outdated, unreadable };
}

/**
 * The read boundary ROADMAP's **I-8** requires around `travelStats` — ARCHITECTURE §8.4
 * **A-31** Part 4, **A-37** Part 2.
 *
 * `travelStats` throws on exactly two conditions, and both are reachable from real storage
 * despite being documented as programmer error: A-31 Part 4's own list is *"a duplicate row
 * id, or a malformed date,"* and A-37 Part 2 is the ruling that a stored `TripSummaryRow` is
 * not a validated document — a row whose `startDate`/`endDate` predates `fromJSON`'s own
 * validation, or was hand-edited, can still reach here shape-invalid. `TravelStats` has no
 * `Issue` channel to degrade into — there is no per-row partial answer for "the whole
 * library's statistics" — so the two throws are sanctioned rather than a defect, and ROADMAP's
 * I-8 spec is explicit about what happens next: *"the Map and Profile catch it and show 'we
 * could not read your travel history' … rather than a blank screen or an unhandled
 * rejection."* This is that catch, once, as a selector — not duplicated in two views.
 *
 * **`rowId` is populated only for the duplicate-id case.** `travelStats`'s duplicate-id error
 * embeds the offending id in its message (`travelStats: duplicate summary id "…"`), and this
 * selector extracts it. The malformed-date error names no row: `travelStats` throws from
 * inside a loop over every travelled row with no per-row context carried into the message, and
 * nothing on `@cairn/core`'s surface lets a caller re-validate a date without reimplementing
 * `parseIsoDate` — which is exactly the second implementation of a core function ARCHITECTURE's
 * sequencing rules forbid. So `rowId: null` in that case is an honest *"unknown,"* not a gap
 * this selector left unfilled.
 */
export type TravelHistoryResult =
  | { ok: true; stats: core.TravelStats }
  | { ok: false; message: string; rowId: string | null };

const DUPLICATE_ROW_ID_RE = /^travelStats: duplicate summary id (".*")$/;

export function travelHistory(state: Pick<AppState, 'library'>, today: core.IsoDate): TravelHistoryResult {
  try {
    return { ok: true, stats: core.travelStats(state.library, today) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const m = DUPLICATE_ROW_ID_RE.exec(message);
    return { ok: false, message, rowId: m ? (JSON.parse(m[1]) as string) : null };
  }
}

export { core };
