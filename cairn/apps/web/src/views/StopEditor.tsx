/**
 * Add and edit a stop. Every field change is one `updateStop` / `addStop` dispatch — the
 * form holds a draft, never a second copy of the domain rules.
 */
import { useState } from 'react';
import type { Stop, StopCategory } from '@cairn/core';
import { costFromDisplay } from '@cairn/core';
import { CAT_LABEL } from '@cairn/tokens';
import { store } from '../store.ts';

const CATEGORIES: StopCategory[] = ['sight', 'food', 'night', 'trip', 'transit', 'stay', 'suggest'];

type Props = {
  dayId: string;
  order: number;
  stop?: Stop;
  onDone: () => void;
  onError: (m: string) => void;
};

export function StopEditor({ dayId, order, stop, onDone, onError }: Props) {
  const at = stop?.place.kind === 'inline' ? stop.place.at : null;
  const [name, setName] = useState(stop?.name ?? '');
  const [category, setCategory] = useState<StopCategory>(stop?.category ?? 'sight');
  const [time, setTime] = useState(stop?.placement.kind === 'scheduled' ? (stop.placement.time ?? '') : '');
  const [note, setNote] = useState(stop?.note ?? '');
  // The display string round-trips: core keeps it verbatim and parses amounts out of it.
  const [cost, setCost] = useState(stop?.cost?.display ?? '');
  const [lat, setLat] = useState(at ? String(at.lat) : '');
  const [lng, setLng] = useState(at ? String(at.lng) : '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const place =
      lat.trim() && lng.trim()
        ? ({ kind: 'inline', at: { lat: Number(lat), lng: Number(lng) } } as const)
        : stop?.place ?? ({ kind: 'none' } as const);
    const parsedCost = costFromDisplay(cost.trim() || null);

    try {
      if (stop) {
        store.dispatch({
          type: 'updateStop',
          stopId: stop.id,
          patch: { name: name.trim(), category, note: note.trim(), cost: parsedCost, place },
        });
        if (stop.placement.kind === 'scheduled' && (stop.placement.time ?? '') !== time) {
          store.dispatch({
            type: 'moveStop',
            stopId: stop.id,
            placement: { kind: 'scheduled', dayId, time: time || null, order: stop.placement.order },
          });
        }
      } else {
        store.dispatch({
          type: 'addStop',
          placement: { kind: 'scheduled', dayId, time: time || null, order },
          stop: { name: name.trim(), category, note: note.trim(), cost: parsedCost, place },
        });
      }
      onDone();
    } catch (err) {
      onError((err as Error).message);
    }
  }

  const badCoords = (lat.trim() !== '') !== (lng.trim() !== '');

  return (
    <form className="card editor" onSubmit={submit}>
      <div className="row">
        <label className="grow">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Belvedere Palace" />
        </label>
        <label>
          Time
          <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="09:30" pattern="^([01]\d|2[0-3]):[0-5]\d$" />
        </label>
      </div>
      <div className="row">
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as StopCategory)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c] ?? c}</option>)}
          </select>
        </label>
        <label>
          Cost <span className="hint">e.g. €12 or €90–113</span>
          <input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="€15" />
        </label>
      </div>
      <div className="row">
        <label>
          Latitude
          <input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" placeholder="48.1916" />
        </label>
        <label>
          Longitude
          <input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" placeholder="16.3810" />
        </label>
      </div>
      {badCoords && <p className="hint hint--warn">Give both a latitude and a longitude, or neither.</p>}
      <label>
        Note
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Which entrance, what's included, when it's quiet" />
      </label>
      <div className="row row--end">
        <button type="button" className="btn btn--quiet" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={!name.trim() || badCoords}>
          {stop ? 'Save' : 'Add stop'}
        </button>
      </div>
    </form>
  );
}
