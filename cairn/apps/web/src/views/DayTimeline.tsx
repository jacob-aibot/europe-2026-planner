/**
 * The day timeline: legs, times, costs, badges — and stop editing.
 *
 * Provenance is visible on every row (`displayStatus`), because the one rule that outranks
 * everything here is that nothing the system added is ever shown as Jacob's own plan.
 */
import { useState } from 'react';
import type { AppState, DayDerived } from '@cairn/client';
import { conflictsForStop, core, travelLine } from '@cairn/client';
import type { Day, Leg, Stop } from '@cairn/core';
import { attribution, displayStatus, fmtMins, formatRange } from '@cairn/core';
import { costLabel, creditLabel } from '../format.ts';
import { CAT_LABEL, COLORS, MODES, STATUS_BADGE } from '@cairn/tokens';
import { store } from '../store.ts';
import { StopEditor } from './StopEditor.tsx';

type Props = { state: AppState; day: Day; dayDerived: DayDerived | null; onError: (m: string) => void };

export function DayTimeline({ state, day, dayDerived: dd, onError }: Props) {
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const cost = dd?.cost;

  return (
    <div className="timeline">
      <header className="timeline__head">
        <div>
          <h2>{day.title || day.date}</h2>
          {day.subtitle && <p className="timeline__sub">{day.subtitle}</p>}
        </div>
        <dl className="timeline__stats">
          <div><dt>Stops</dt><dd>{day.stops.length}</dd></div>
          <div><dt>Moving</dt><dd>{fmtMins(dd?.movingMinutes ?? 0)}</dd></div>
          <div><dt>Distance</dt><dd>{dd ? `${Math.round(dd.distanceKm)} km` : '—'}</dd></div>
          <div><dt>Cost</dt><dd>{cost ? moneyLine(cost) : '—'}</dd></div>
        </dl>
      </header>

      {cost && cost.missingRates.length > 0 && (
        <p className="hint hint--warn">
          No conversion rate for {cost.missingRates.join(', ')} — those are listed separately rather than
          silently converted.
        </p>
      )}
      {cost?.basisWarnings.map((w) => <p key={w} className="hint hint--warn">{w}</p>)}

      <ol className="stops">
        {day.stops.map((stop, i) => (
          <StopRow
            key={stop.id}
            state={state}
            day={day}
            stop={stop}
            index={i}
            leg={dd?.legs[i] ?? null}
            editing={editing === stop.id}
            onEdit={() => setEditing(editing === stop.id ? null : stop.id)}
            onError={onError}
          />
        ))}
      </ol>

      {day.stops.length === 0 && <p className="empty">Nothing planned for this day yet.</p>}

      {editing === 'new' ? (
        <StopEditor
          dayId={day.id}
          order={day.stops.length}
          onDone={() => setEditing(null)}
          onError={onError}
        />
      ) : (
        <button className="btn btn--primary" onClick={() => setEditing('new')}>Add a stop</button>
      )}
    </div>
  );
}

function StopRow({
  state, day, stop, index, leg, editing, onEdit, onError,
}: {
  state: AppState; day: Day; stop: Stop; index: number; leg: Leg | null;
  editing: boolean; onEdit: () => void; onError: (m: string) => void;
}) {
  const status = displayStatus(stop.provenance);
  const credit = attribution(stop.provenance);
  const badge = STATUS_BADGE[status];
  const conflicts = conflictsForStop(store.getDerived(), stop.id).filter((c) => !c.resolution);
  const time = stop.placement.kind === 'scheduled' ? stop.placement.time : null;
  const days = state.doc!.days;
  // §2.12's day-view row. `travelRole` says what this stop's time MEANS, and until this the
  // screen never asked: a flight's departure time rendered identically to an arrival.
  const travel = travelLine(stop);

  const act = (fn: () => void) => {
    try { fn(); } catch (e) { onError((e as Error).message); }
  };

  /**
   * §2.12's one-tap control, and the only new editing affordance the field needs. Ten stops
   * on the reference trip are genuinely ambiguous on inspection and the importer refuses to
   * guess them; without a control the field can never improve from the app.
   */
  const setRole = (travelRole: 'transfer' | 'journey') =>
    act(() => store.dispatch({ type: 'updateStop', stopId: stop.id, patch: { travelRole } }));

  return (
    <li className={`stop ${status !== 'own' ? 'stop--dim' : ''} ${conflicts.length ? 'stop--flag' : ''}`}>
      {leg && (
        <div className="leg" title={leg.source === 'override' ? 'Time from the itinerary' : 'Estimated from distance'}>
          <span aria-hidden="true">{MODES[leg.mode]?.icon ?? '·'}</span>
          {MODES[leg.mode]?.label ?? leg.mode} · {fmtMins(leg.mins)}
          {leg.km !== null && ` · ${leg.km < 10 ? leg.km.toFixed(1) : Math.round(leg.km)} km`}
          {leg.source === 'estimate' && <span className="leg__est">est.</span>}
        </div>
      )}

      <div className="stop__body">
        <span className="stop__num" style={{ background: COLORS[stop.category] ?? '#5c6570' }}>{index + 1}</span>
        <div className="stop__main">
          <p className="stop__line">
            {travel.kind === 'journey'
              ? travel.text && (
                  <b className="stop__time stop__time--journey" data-travel-role="journey">{travel.text}</b>
                )
              : time && <b className="stop__time" data-travel-role={travel.kind}>{time}</b>}
            <span className="stop__name">{stop.name}</span>
            {badge.label && <span className="pill" style={{ background: badge.color }}>{badge.label}</span>}
            {stop.flags.map((f) => <span key={f} className="pill pill--quiet">{f}</span>)}
            {stop.ticket && <span className="pill pill--quiet">ticket</span>}
          </p>
          {travel.kind === 'unknown' && (
            // §2.12: travel information is present and its role could not be established, so
            // every rule that reads it has degraded. Ask, once, in one tap — never guess.
            <p className="stop__role" data-role-control="unknown">
              This time — is it when you <b>arrive</b>, or when this leaves?
              <button className="btn btn--quiet" onClick={() => setRole('transfer')}>I arrive then</button>
              <button className="btn btn--quiet" onClick={() => setRole('journey')}>It departs then</button>
            </p>
          )}
          <p className="stop__meta">
            {CAT_LABEL[stop.category] ?? stop.category}
            {costLabel(stop.cost) && ` · ${costLabel(stop.cost)}`}
            {stop.durationMins ? ` · ${fmtMins(stop.durationMins)} there` : ''}
          </p>
          {credit && (
            // §2.14 rule 7, as a contract: any view that renders a record with a non-null
            // `attribution` renders the credit. `displayStatus` governs the badge and
            // acceptance changes it; the credit line is separate and never goes away.
            <p className="stop__credit" data-credit={credit.friendUserId} title={`${credit.sourceTripId} · ${credit.sourceStopId}`}>
              From {creditLabel(credit, state)}
            </p>
          )}
          {stop.note && <p className="stop__note">{stop.note}</p>}
          {conflicts.map((c) => (
            <p key={c.id} className={`stop__conflict sev--${c.severity}`}>{c.summary}</p>
          ))}
          {stop.links?.map((l) => (
            <a key={l.href} className="stop__link" href={l.href} target="_blank" rel="noreferrer noopener">
              {l.label} ↗
            </a>
          ))}
        </div>

        <div className="stop__tools">
          <button className="icon" title="Move earlier" disabled={index === 0}
            onClick={() => act(() => store.dispatch({ type: 'reorderStop', stopId: stop.id, delta: -1 }))}>↑</button>
          <button className="icon" title="Move later" disabled={index === day.stops.length - 1}
            onClick={() => act(() => store.dispatch({ type: 'reorderStop', stopId: stop.id, delta: 1 }))}>↓</button>
          <button className="icon" title="Edit" onClick={onEdit}>✎</button>
          <select
            className="icon icon--select"
            title="Move to another day"
            value=""
            onChange={(e) => {
              const dayId = e.target.value;
              if (!dayId) return;
              act(() => store.dispatch({
                type: 'moveStop',
                stopId: stop.id,
                placement: { kind: 'scheduled', dayId, time, order: 0 },
              }));
            }}
          >
            <option value="">→ day</option>
            {days.filter((d) => d.id !== day.id).map((d) => (
              <option key={d.id} value={d.id}>{d.date}</option>
            ))}
          </select>
          <button className="icon" title="Return to the optional list"
            onClick={() => act(() => store.dispatch({ type: 'returnToPool', stopId: stop.id }))}>⇩</button>
          <button className="icon icon--danger" title="Remove"
            onClick={() => act(() => store.dispatch({ type: 'removeStop', stopId: stop.id }))}>×</button>
        </div>
      </div>

      {editing && (
        <StopEditor
          dayId={day.id}
          order={index}
          stop={stop}
          onDone={onEdit}
          onError={onError}
        />
      )}
    </li>
  );
}

function moneyLine(roll: core.CostRollUp): string {
  const parts = Object.entries(roll.byCurrency).map(([cur, v]) => formatRange(cur, v.lo, v.hi));
  return parts.length ? parts.join(' + ') : '—';
}
