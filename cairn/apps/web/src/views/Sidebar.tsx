/**
 * The spine: cities with their date ranges, days nested beneath — the live app's structure.
 * A day carrying an unresolved blocker gets the red dot, exactly as it does today.
 */
import type { ReactNode } from 'react';
import type { AppState, DerivedCache } from '@cairn/client';
import { cityTabs, conflictsForDay } from '@cairn/client';
import type { Day } from '@cairn/core';
import { displayStatus } from '@cairn/core';
import { store } from '../store.ts';

type Group = { key: string; head: ReactNode; days: Day[]; first: string };

export function Sidebar({ state, derived }: { state: AppState; derived: DerivedCache | null }) {
  const trip = state.doc!;
  const tabs = cityTabs(trip);
  const activeId = state.ui.activeDayId ?? trip.days[0]?.id ?? null;

  /**
   * Every day must be reachable. A day can belong to no city tab in two real ways: it is
   * tagged with a pseudo-city the trip does not list — Aug 7 of Europe 2026 is
   * `cities: ['transit']` — or the trip has no cities at all, which "New trip" allows.
   * Both used to hide the day completely, which is worse than an extra group.
   */
  const grouped = new Set(tabs.flatMap((c) => c.days.map((d) => d.id)));
  const ungrouped = trip.days.filter((d) => !grouped.has(d.id));

  const cityGroups: Group[] = tabs.map((city) => ({
    key: city.key,
    first: city.days[0]?.date ?? '9999-99-99',
    days: city.days,
    head: (
      <button
        className={`spine__cityhead ${state.ui.activeCityKey === city.key ? 'is-on' : ''}`}
        onClick={() => store.setUi({ activeCityKey: city.key })}
      >
        {city.flagEmoji && <span aria-hidden="true">{city.flagEmoji} </span>}
        {city.name}
        {city.range && <span className="spine__range">{city.range}</span>}
      </button>
    ),
  }));

  const catchAll: Group[] = ungrouped.length
    ? [
        {
          key: '__ungrouped',
          first: ungrouped[0].date,
          days: ungrouped,
          head: (
            <p className="spine__cityhead spine__cityhead--static">
              <span aria-hidden="true">✈️ </span>
              {tabs.length === 0 ? 'Days' : 'In transit'}
              <span className="spine__range">{ungrouped.length}</span>
            </p>
          ),
        },
      ]
    : [];

  /**
   * Groups run in date order, not city order. Europe 2026's catch-all holds Aug 7 — the
   * first day of the trip — and rendering it after London reads as if the trip started in
   * Vienna.
   */
  const groups = [...cityGroups, ...catchAll].sort((a, b) => a.first.localeCompare(b.first));

  return (
    <nav className="spine" aria-label="Cities and days">
      {groups.map((group) => (
        <div key={group.key} className="spine__city">
          {group.head}
          <ul>
            {group.days.map((day) => (
              <li key={day.id}>
                <DayRow day={day} activeId={activeId} derived={derived} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function DayRow({ day, activeId, derived }: { day: Day; activeId: string | null; derived: DerivedCache | null }) {
  const blockers = conflictsForDay(derived, day.id).filter((c) => !c.resolution && c.severity === 'blocker');
  const status = displayStatus(day.provenance);
  return (
    <button
      className={`spine__day ${activeId === day.id ? 'is-on' : ''} ${status !== 'own' ? 'is-dim' : ''}`}
      onClick={() => store.setUi({ activeDayId: day.id, panel: 'timeline', selectedStopId: null })}
    >
      <span className="spine__dow">{day.date.slice(5)}</span>
      <span className="spine__daytitle">{day.title || `${day.stops.length} stops`}</span>
      {blockers.length > 0 && <span className="spine__dot" title={blockers[0].summary} />}
    </button>
  );
}
