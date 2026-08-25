/**
 * One open trip: city/day spine on the left, the day on the right, panels beneath the map.
 * Layout follows the live planner's nesting exactly — city tabs with their dates, days
 * underneath (§4.5).
 */
import { useState } from 'react';
import type { AppState, DerivedCache } from '@cairn/client';
import { activeDay, conflictSummary, dayDerived } from '@cairn/client';
import { store } from '../store.ts';
import { Sidebar } from './Sidebar.tsx';
import { DayTimeline } from './DayTimeline.tsx';
import { DayMap } from './DayMap.tsx';
import { ConflictsPanel, PlacesPanel, PoolPanel, ValidationPanel } from './Panels.tsx';
import { BrowsePane } from './BrowsePane.tsx';

type Props = { state: AppState; derived: DerivedCache | null; onError: (m: string) => void };

const PANELS = [
  { key: 'timeline', label: 'Day' },
  { key: 'conflicts', label: 'Conflicts' },
  { key: 'validation', label: 'Validation' },
  { key: 'pool', label: 'Optional' },
  { key: 'places', label: 'Places' },
  { key: 'browse', label: 'Browse & copy' },
] as const;

export function TripView({ state, derived, onError }: Props) {
  const trip = state.doc!;
  const day = activeDay(state);
  const dd = dayDerived(derived, day?.id ?? null);
  const counts = conflictSummary(derived);
  const [busy, setBusy] = useState(false);

  async function onExport() {
    setBusy(true);
    try {
      await store.exportActive();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="trip">
      <Sidebar state={state} derived={derived} />

      <section className="pane">
        <div className="pane__actions">
          <button className="btn btn--quiet" onClick={() => store.undo()} disabled={state.history.past.length === 0}>
            Undo
          </button>
          <button className="btn btn--quiet" onClick={() => store.redo()} disabled={state.history.future.length === 0}>
            Redo
          </button>
          <span className="topbar__spacer" />
          <button className="btn btn--quiet" onClick={() => void onExport()} disabled={busy}>
            Export JSON
          </button>
        </div>

        <nav className="tabs" role="tablist">
          {PANELS.map((p) => {
            const badge =
              p.key === 'conflicts'
                ? counts.blocker + counts.warning + counts.note
                : p.key === 'validation'
                  ? (derived?.issues.length ?? 0)
                  : p.key === 'pool'
                    ? trip.pool.length
                    : p.key === 'places'
                      ? trip.places.length
                      : p.key === 'browse'
                        ? (state.browsing ? 1 : 0)
                        : 0;
            return (
              <button
                key={p.key}
                role="tab"
                aria-selected={state.ui.panel === p.key}
                className={`tab ${state.ui.panel === p.key ? 'tab--on' : ''}`}
                onClick={() => store.setUi({ panel: p.key })}
              >
                {p.label}
                {badge > 0 && (
                  <span className={`tab__badge ${p.key === 'conflicts' && counts.blocker > 0 ? 'tab__badge--blocker' : ''}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {state.ui.panel === 'timeline' && day && (
          <>
            <DayMap trip={trip} day={day} derived={derived} scope={state.ui.mapScope} />
            <DayTimeline state={state} day={day} dayDerived={dd} onError={onError} />
          </>
        )}
        {state.ui.panel === 'timeline' && !day && <p className="empty">This trip has no days.</p>}
        {state.ui.panel === 'conflicts' && <ConflictsPanel state={state} derived={derived} />}
        {state.ui.panel === 'validation' && <ValidationPanel derived={derived} />}
        {state.ui.panel === 'pool' && <PoolPanel state={state} onError={onError} />}
        {state.ui.panel === 'places' && <PlacesPanel trip={trip} />}
        {state.ui.panel === 'browse' && <BrowsePane state={state} onError={onError} />}
      </section>
    </main>
  );
}
