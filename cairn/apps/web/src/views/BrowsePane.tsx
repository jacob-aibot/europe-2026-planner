/**
 * "Browse another trip" (ARCHITECTURE §2.14) — the sharing path, in the form Jacob asked
 * for: *"They wouldn't import their trip — they would build it on this app… they could even
 * look at mine and just add a certain activity."*
 *
 * Read-only by construction. The browsed trip is `state.browsing`; nothing here dispatches
 * against it and nothing writes it back. The only action is `copyStopInto`, which is a core
 * build function against the ACTIVE trip.
 *
 * In Phase 1 the source list is the local library, which is genuinely useful on its own — a
 * second trip reusing the first one's stops — and it means the provenance rule is exercised
 * by a real user path months before there is a friend to break it. In Phase 2 the source
 * list gains shared trips and nothing else here changes.
 */
import { useState } from 'react';
import type { AppState } from '@cairn/client';
import type { Stop } from '@cairn/core';
import { attribution, displayStatus } from '@cairn/core';
import { store } from '../store.ts';

type Props = { state: AppState; onError: (m: string) => void };

export function BrowsePane({ state, onError }: Props) {
  const [busy, setBusy] = useState(false);
  const others = state.library.filter((r) => r.id !== state.activeTripId);
  const browsing = state.browsing;
  const targetDayId = state.ui.activeDayId ?? state.doc?.days[0]?.id ?? null;
  const run = (p: Promise<unknown>) => p.catch((e: Error) => onError(e.message));

  function copy(stop: Stop) {
    if (!browsing || !targetDayId) return;
    setBusy(true);
    try {
      store.dispatch({
        type: 'copyStopInto',
        source: { trip: browsing, stopId: stop.id },
        placement: { kind: 'scheduled', dayId: targetDayId, time: null, order: Number.MAX_SAFE_INTEGER },
      });
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (others.length === 0) {
    return (
      <div className="browse">
        <p className="empty">Nothing else in your library yet. A second trip is what this pane copies from.</p>
      </div>
    );
  }

  return (
    <div className="browse">
      <div className="browse__head">
        <b>Browse another trip</b>
        <select
          aria-label="Choose a trip to browse"
          value={browsing?.id ?? ''}
          onChange={(e) => {
            const id = e.target.value;
            if (!id) return void run(store.closeBrowse());
            void run(store.browseTrip(id).then(() => undefined));
          }}
        >
          <option value="">— none —</option>
          {others.map((r) => (
            <option key={r.id} value={r.id}>{r.title}</option>
          ))}
        </select>
        {browsing && (
          <button className="btn btn--quiet" onClick={() => void run(store.closeBrowse())}>Close</button>
        )}
        {browsing && <span className="browse__day">read-only · copies land on {targetDayId ?? 'no day'}</span>}
      </div>

      {browsing && (
        <ul className="browse__list">
          {browsing.days.flatMap((d) =>
            d.stops.map((s) => (
              <li key={s.id} className="browse__row">
                <button
                  className="btn btn--quiet"
                  disabled={busy || !targetDayId}
                  title={`Copy “${s.name}” into ${targetDayId ?? 'this trip'}`}
                  onClick={() => copy(s)}
                >
                  Copy →
                </button>
                <b>{s.name}</b>
                <span className="browse__day">
                  {d.id}
                  {s.placement.kind === 'scheduled' && s.placement.time ? ` ${s.placement.time}` : ''}
                  {displayStatus(s) !== 'own' ? ` · ${displayStatus(s)}` : ''}
                  {attribution(s) ? ` · from ${attribution(s)!.friendUserId.replace(/^user:/, '')}` : ''}
                </span>
              </li>
            )),
          )}
          {browsing.days.every((d) => d.stops.length === 0) && (
            <li className="browse__row"><span className="browse__day">That trip has no stops yet.</span></li>
          )}
        </ul>
      )}
    </div>
  );
}
