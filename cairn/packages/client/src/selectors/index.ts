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

export { core };
