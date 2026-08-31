/**
 * Conflicts, validation, the optional pool and the places list.
 *
 * The conflicts panel states BOTH sides and never auto-fixes: acknowledging writes a
 * `ConflictResolution` and the conflict stays visible, marked. That is the rule from the
 * root CLAUDE.md — flag conflicts, don't resolve them by guessing — made into UI.
 */
import type { AppState, DerivedCache } from '@cairn/client';
import { poolSection, unfiledPool } from '@cairn/client';
import type { Conflict, Stop, Trip } from '@cairn/core';
import { LOCAL_OWNER, attribution, displayStatus } from '@cairn/core';
import { costLabel, creditLabel } from '../format.ts';
import { systemClock } from '../ports/env.ts';
import { CAT_LABEL, SEVERITY_COLOR, STATUS_BADGE } from '@cairn/tokens';
import { store } from '../store.ts';

export function ConflictsPanel({ state, derived }: { state: AppState; derived: DerivedCache | null }) {
  const all = derived?.conflicts ?? [];
  const filter = state.ui.ruleFilter;
  const shown = filter ? all.filter((c) => c.ruleId === filter) : all;
  const rules = [...new Set(all.map((c) => c.ruleId))].sort();

  if (all.length === 0) return <p className="empty">No conflicts. That is not the same as no problems — check Validation too.</p>;

  return (
    <div className="panel">
      <div className="row row--wrap">
        <button className={`chip ${!filter ? 'chip--on' : ''}`} onClick={() => store.setUi({ ruleFilter: null })}>
          All ({all.length})
        </button>
        {rules.map((r) => (
          <button key={r} className={`chip ${filter === r ? 'chip--on' : ''}`} onClick={() => store.setUi({ ruleFilter: r })}>
            {r} ({all.filter((c) => c.ruleId === r).length})
          </button>
        ))}
      </div>

      <ul className="conflicts">
        {shown.map((c) => <ConflictRow key={c.id} conflict={c} today={systemClock().today()} />)}
      </ul>
    </div>
  );
}

function ConflictRow({ conflict: c, today }: { conflict: Conflict; today: string }) {
  const resolve = (stateName: 'acknowledged' | 'accepted_booking' | 'accepted_plan' | 'dismissed') =>
    store.dispatch({
      type: 'resolveConflict',
      resolution: { conflictId: c.id, state: stateName, by: LOCAL_OWNER, at: today },
    });

  return (
    <li className={`conflict ${c.resolution ? 'conflict--done' : ''}`}>
      <div className="conflict__head">
        <span className="pill" style={{ color: SEVERITY_COLOR[c.severity] }}>{c.severity}</span>
        <b>{c.summary}</b>
        <span className="conflict__rule">{c.ruleId}</span>
      </div>
      {c.detail && <p className="conflict__detail">{c.detail}</p>}
      {c.resolution ? (
        <p className="conflict__resolved">
          Marked <b>{c.resolution.state.replace('_', ' ')}</b> on {c.resolution.at}
          <button className="btn btn--quiet" onClick={() => store.dispatch({ type: 'unresolveConflict', conflictId: c.id })}>
            Undo that
          </button>
        </p>
      ) : (
        <div className="row row--wrap conflict__actions">
          <button className="btn btn--quiet" onClick={() => resolve('acknowledged')}>Acknowledge</button>
          <button className="btn btn--quiet" onClick={() => resolve('accepted_booking')}>The booking is right</button>
          <button className="btn btn--quiet" onClick={() => resolve('accepted_plan')}>The plan is right</button>
          <button className="btn btn--quiet" onClick={() => resolve('dismissed')}>Not a problem</button>
        </div>
      )}
    </li>
  );
}

export function ValidationPanel({ derived }: { derived: DerivedCache | null }) {
  const issues = derived?.issues ?? [];
  if (issues.length === 0) return <p className="empty">Nothing to report — the trip is internally consistent.</p>;
  const errors = issues.filter((i) => i.level === 'error');
  const warns = issues.filter((i) => i.level === 'warn');

  return (
    <div className="panel">
      <p className="hint">
        {errors.length} {errors.length === 1 ? 'error' : 'errors'}, {warns.length}{' '}
        {warns.length === 1 ? 'warning' : 'warnings'}. This is the check that would have caught Fisherman's
        Bastion sitting 111 km north of Budapest.
      </p>
      <ul className="issues">
        {[...errors, ...warns].map((i, n) => (
          <li key={`${i.code}-${i.ref.id}-${n}`} className={`issue issue--${i.level}`}>
            {/* QA R34-7: the warn hex tracks `--warn`, which moved to #8f5816 for contrast. */}
            <span className="pill" style={{ color: i.level === "error" ? "#a8382f" : "#8f5816" }}>{i.level}</span>
            <span className="issue__code">{i.code}</span>
            <span>{i.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PoolPanel({ state, onError }: { state: AppState; onError: (m: string) => void }) {
  const trip = state.doc!;
  const cityKey = state.ui.activeCityKey ?? trip.cities[0]?.key ?? '';
  const section = poolSection(trip, cityKey);
  const act = (fn: () => void) => { try { fn(); } catch (e) { onError((e as Error).message); } };

  /**
   * Every pooled stop must be reachable. The panel lists one city at a time, so a stop
   * filed under a key the trip does not have — pooled from a pure travel day, or from any
   * day of a trip with no cities yet — was rendered by nothing at all while the tab's
   * counter still included it (QA R2-2). `Sidebar` already carries the same catch-all for
   * days; this is its counterpart, and it is always rendered, never behind a tab.
   */
  const unfiled = unfiledPool(trip);

  const item = (s: Stop) => {
    const badge = STATUS_BADGE[displayStatus(s.provenance)];
    // §2.14 rule 7: any view that renders a record with a non-null `attribution` renders the
    // credit. This panel rendered the badge *from a friend* and stopped there, so pushing a
    // copied stop into the Optional list silently dropped whose stop it was (QA R2-8). Same
    // pattern as `DayTimeline`'s `StopRow` — deliberately the same, not a second version.
    const credit = attribution(s.provenance);
    return (
      <li key={s.id} className="pool__item">
        <div>
          <p className="stop__line">
            <span className="stop__name">{s.name}</span>
            {badge.label && <span className="pill" style={{ color: badge.color }}>{badge.label}</span>}
          </p>
          <p className="stop__meta">
            {CAT_LABEL[s.category] ?? s.category}
            {costLabel(s.cost) && ` · ${costLabel(s.cost)}`}
          </p>
          {credit && (
            <p className="stop__credit" data-credit={credit.friendUserId} title={`${credit.sourceTripId} · ${credit.sourceStopId}`}>
              From {creditLabel(credit, state)}
            </p>
          )}
          {s.note && <p className="stop__note">{s.note}</p>}
        </div>
        <button
          className="btn btn--quiet"
          title="Put it back where it came from, or on the open day"
          onClick={() => act(() => store.dispatch({
            type: 'scheduleFromPool',
            stopId: s.id,
            hint: state.ui.activeDayId ? { dayId: state.ui.activeDayId } : undefined,
          }))}
        >
          Add to the plan
        </button>
      </li>
    );
  };

  return (
    <div className="panel">
      <h3>{section.title}</h3>
      {section.note && <p className="hint">{section.note}</p>}
      {section.stops.length === 0 && <p className="empty">Nothing optional listed for this city.</p>}
      <ul className="pool">{section.stops.map(item)}</ul>

      {unfiled.length > 0 && (
        <section>
          <h3>
            <span aria-hidden="true">✈️ </span>
            {trip.cities.length === 0 ? 'Optional' : 'Not filed under a city'}
            <span className="spine__range">{unfiled.length}</span>
          </h3>
          <p className="hint">
            {trip.cities.length === 0
              ? 'This trip has no cities yet, so nothing is filed under one.'
              : 'Taken off a travel day, so it belongs to no city on this trip. Add it back to any day.'}
          </p>
          <ul className="pool">{unfiled.map(item)}</ul>
        </section>
      )}
    </div>
  );
}

export function PlacesPanel({ trip }: { trip: Trip }) {
  const byCity = new Map<string, typeof trip.places>();
  for (const p of trip.places) {
    const list = byCity.get(p.cityKey) ?? [];
    list.push(p);
    byCity.set(p.cityKey, list);
  }
  return (
    <div className="panel">
      <p className="hint">{trip.places.length} curated places — a superset of what is on the plan.</p>
      {[...byCity.entries()].map(([key, list]) => (
        <section key={key}>
          <h3>{trip.cities.find((c) => c.key === key)?.name ?? key}</h3>
          <ul className="places">
            {list.map((p) => (
              <li key={p.id}>
                <b>{p.name}</b>
                <span className="stop__meta"> {CAT_LABEL[p.category] ?? p.category}</span>
                {p.note && <p className="stop__note">{p.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
