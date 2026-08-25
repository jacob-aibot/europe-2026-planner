/**
 * The trip library: create, open, delete, import, export, and load the Europe 2026 sample.
 *
 * "New trip" takes a title, a date range and a list of cities and produces a dense day
 * skeleton (§4.5). Duplicate and rename are the two things the roadmap allows to be
 * stubbed, and they are — see BUILD-NOTES.
 */
import { useState } from 'react';
import type { AppState } from '@cairn/client';
import type { Trip } from '@cairn/core';
import { store } from '../store.ts';

type Props = {
  state: AppState;
  onError: (m: string) => void;
  sample: (() => Trip | null) | null;
};

export function Library({ state, onError, sample }: Props) {
  const [creating, setCreating] = useState(false);
  const run = (p: Promise<unknown>) => p.catch((e: Error) => onError(e.message));

  async function onImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        await store.importDoc(await f.text());
      } catch (e) {
        onError(`That file is not a Cairn trip: ${(e as Error).message}`);
      }
    };
    input.click();
  }

  async function loadSample() {
    if (!sample) return;
    const trip = sample();
    if (!trip) return onError('The sample trip could not be read.');
    const existing = state.library.find((r) => r.id === trip.id);
    if (existing) return run(store.openTrip(existing.id));
    return run(store.adoptTrip(trip));
  }

  return (
    <main className="library">
      <div className="library__head">
        <h1>Your trips</h1>
        <div className="row">
          <button className="btn" onClick={() => onImport()}>Import JSON</button>
          {sample && <button className="btn" onClick={() => void loadSample()}>Load Europe 2026</button>}
          <button className="btn btn--primary" onClick={() => setCreating(true)}>New trip</button>
        </div>
      </div>

      {creating && <NewTrip onClose={() => setCreating(false)} onError={onError} />}

      {state.library.length === 0 && !creating && (
        <p className="empty">
          Nothing here yet. {sample ? 'Load Europe 2026 to see a real trip, or start' : 'Start'} a new one.
        </p>
      )}

      <ul className="triplist">
        {state.library.map((row) => (
          <li key={row.id} className="tripcard">
            <button className="tripcard__open" onClick={() => run(store.openTrip(row.id))}>
              <span className="tripcard__title">{row.title}</span>
              <span className="tripcard__meta">
                {row.startDate} → {row.endDate} · {row.cityCount} {row.cityCount === 1 ? 'city' : 'cities'}
              </span>
              <span className="tripcard__meta tripcard__meta--dim">
                {row.dayCount} days · {row.stopCount} stops
                {row.poolCount > 0 ? ` · ${row.poolCount} optional` : ''}
              </span>
            </button>
            <button
              className="btn btn--quiet"
              onClick={() => {
                if (confirm(`Delete “${row.title}”? This cannot be undone.`)) run(store.deleteTrip(row.id));
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

function NewTrip({ onClose, onError }: { onClose: () => void; onError: (m: string) => void }) {
  const [title, setTitle] = useState('');
  const [startDate, setStart] = useState('');
  const [endDate, setEnd] = useState('');
  const [cities, setCities] = useState('');

  const valid = title.trim() && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate) && endDate >= startDate;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    try {
      await store.createTrip({
        title: title.trim(),
        startDate,
        endDate,
        cities: cities
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name, i) => ({ key: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, order: i })),
      });
      onClose();
    } catch (err) {
      onError((err as Error).message);
    }
  }

  return (
    <form className="card newtrip" onSubmit={submit}>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Japan 2027" autoFocus />
      </label>
      <div className="row">
        <label>
          Start
          <input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          End
          <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      <label>
        Cities <span className="hint">comma separated, in order</span>
        <input value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Tokyo, Kyoto, Osaka" />
      </label>
      {startDate && endDate && endDate < startDate && <p className="hint hint--warn">The end date is before the start date.</p>}
      <div className="row row--end">
        <button type="button" className="btn btn--quiet" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={!valid}>Create</button>
      </div>
    </form>
  );
}
