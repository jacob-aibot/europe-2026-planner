/**
 * The trip library: create, open, delete, restore from a backup, export, and load the
 * Europe 2026 sample.
 *
 * The restore control is **not** called "Import" (§2.14): it is backup and restore of the
 * user's own exports, and a document owned by somebody else is refused. Receiving a
 * friend's itinerary is the "Browse & copy" pane, one stop at a time.
 *
 * "New trip" takes a title, a date range and a list of cities and produces a dense day
 * skeleton (§4.5). Duplicate and rename are the two things the roadmap allows to be
 * stubbed, and they are — BUILD-NOTES §1, KD-13, which lists all four Phase 1 stubs.
 */
import { useState } from 'react';
import type { AppState } from '@cairn/client';
import { rowLifecycle, summaryScan } from '@cairn/client';
import type { IsoDate, Lifecycle, Trip } from '@cairn/core';
import { clock, store } from '../store.ts';
import { dateRangeLabel, lifecycleLabel } from '../format.ts';
import { PastTripForm } from './PastTripForm.tsx';

/**
 * The lifecycle chip — ARCHITECTURE §8.1, ROADMAP Phase 2 I-4; the read gate is §8.4 **A-44**,
 * ROADMAP I-8c.
 *
 * The stage is **derived** from `(dates, today)` on every render. There is no stored status
 * field, and there must not be one: it would be a copy of what the dates already say, going
 * stale at midnight with nothing to invalidate it (§0.6).
 *
 * It is derived through `rowLifecycle`, **not** `core.lifecycle`. A stored `TripSummaryRow` is
 * not a validated document (§8.4 A-37 Part 2), `core.lifecycle` throws on one whose dates are
 * not shape-valid, and this component has three callers — the Library, the world map's
 * drill-down and the open trip — so QA R33-3 watched one bad row take the whole Trips tab down.
 * The gate lives once, in `packages/client`; A-44 is explicit that a `try/catch` here instead
 * would be the same read gate copied per surface.
 *
 * `null` is *"we could not read this trip's dates"* and is rendered as that, in the vocabulary
 * the Library already uses for a row it could not read — never as a fourth stage, and never by
 * omitting the chip, which would make an unreadable row look like a row that is fine.
 */
export function LifecycleChip({ trip, today }: { trip: { startDate: string; endDate: string }; today: string }) {
  const stage: Lifecycle | null = rowLifecycle(trip, today as IsoDate);
  if (stage === null) {
    return (
      <span
        className="chip chip--life chip--warn"
        data-testid="lifecycle-chip"
        data-stage="unreadable"
      >
        Dates could not be read
      </span>
    );
  }
  return (
    <span className={`chip chip--life chip--life-${stage}`} data-testid="lifecycle-chip" data-stage={stage}>
      {lifecycleLabel(stage)}
    </span>
  );
}

/**
 * What the library says about its own summary rows — ARCHITECTURE §8.4 clause 3, I-6.
 *
 * §8.4's sentence is *"the map says 'recomputing' while it does"*, and this is the same
 * sentence one surface earlier: while a rescan is in flight the library says so, and a row
 * whose document could not be read says **that**, rather than looking exactly like a row that
 * is fine. Nothing here claims a count is complete — `summaryScan` derives the answer from
 * the rows, and this only renders it.
 */
function ScanNote({ scan }: { scan: ReturnType<typeof summaryScan> }) {
  if (scan.phase === 'complete') return null;
  const unreadable = scan.unreadable.length;
  return (
    <p className="library__scan" data-testid="summary-scan" data-phase={scan.phase}>
      {scan.phase === 'recomputing'
        ? `Recomputing trip details… ${scan.current} of ${scan.total} up to date.`
        : `${scan.outdated.length} ${scan.outdated.length === 1 ? 'trip is' : 'trips are'} not up to date yet.`}
      {unreadable > 0 && (
        <>
          {' '}
          {unreadable === 1 ? 'One trip’s file' : `${unreadable} trips’ files`} could not be read, so
          {unreadable === 1 ? ' its' : ' their'} details are the last ones we managed to work out.
        </>
      )}
    </p>
  );
}

type Props = {
  state: AppState;
  onError: (m: string) => void;
  sample: (() => Trip | null) | null;
};

export function Library({ state, onError, sample }: Props) {
  const [creating, setCreating] = useState(false);
  const [recording, setRecording] = useState(false);
  // Read once per render, from the app's single clock port (`ports/env.ts` is the only place
  // `Date` is called). Every chip below is derived against the same value.
  const today = clock.today();
  const run = (p: Promise<unknown>) => p.catch((e: Error) => onError(e.message));
  // §8.4 clause 3. Derived from the rows on every render, never stored: a row that is still
  // below `SUMMARY_VERSION` is marked as such, and a document that would not parse is marked
  // as unreadable rather than being quietly dropped or quietly left looking complete.
  const scan = summaryScan(state);
  const outdated = new Set(scan.outdated);
  const unreadable = new Set(scan.unreadable.map((u) => u.id));

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
        // Two different sentences with two different next actions, which is why
        // `ForeignDocumentError` is a named class and not a bare Error (§2.14).
        onError(
          (e as Error).name === 'ForeignDocumentError'
            ? (e as Error).message
            : `That file is not a Cairn trip: ${(e as Error).message}`,
        );
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
          <button
            className="btn"
            aria-label="Restore from a backup (Import JSON)"
            title="Re-open a trip you exported from Cairn. It will not adopt somebody else's itinerary — §2.14."
            onClick={() => onImport()}
          >
            Restore from a backup
          </button>
          {sample && <button className="btn" onClick={() => void loadSample()}>Load Europe 2026</button>}
          <button
            className="btn"
            data-testid="record-past-trip"
            title="A trip you have already taken — dates only, no day-by-day required."
            onClick={() => { setCreating(false); setRecording(true); }}
          >
            Record a past trip
          </button>
          <button className="btn btn--primary" onClick={() => { setRecording(false); setCreating(true); }}>New trip</button>
        </div>
      </div>

      <ScanNote scan={scan} />

      {creating && <NewTrip onClose={() => setCreating(false)} onError={onError} />}
      {recording && <PastTripForm onClose={() => setRecording(false)} onError={onError} />}

      {state.library.length === 0 && !creating && !recording && (
        <p className="empty">
          Nothing here yet. {sample ? 'Load Europe 2026 to see a real trip, or start' : 'Start'} a new one.
        </p>
      )}

      <ul className="triplist">
        {state.library.map((row) => (
          <li key={row.id} className="tripcard">
            <button className="tripcard__open" onClick={() => run(store.openTrip(row.id))}>
              <span className="tripcard__title">
                {row.title}
                <LifecycleChip trip={row} today={today} />
              </span>
              <span className="tripcard__meta" data-testid="tripcard-range">
                {/* QA P2-6: the row carries `datePrecision`, so a trip recorded as "March 2019"
                    is listed as "March 2019" here too — the same label TripView renders, from
                    the same function. A row written before the field existed reads `undefined`
                    and falls through to the exact form, which is what it was. */}
                {dateRangeLabel(row)} · {row.cityCount} {row.cityCount === 1 ? 'city' : 'cities'}
              </span>
              <span className="tripcard__meta tripcard__meta--dim">
                {row.dayCount} days · {row.stopCount} stops
                {row.poolCount > 0 ? ` · ${row.poolCount} optional` : ''}
                {/* §8.4 clause 3: the countries are the row's own answer, and a row that has
                    not been recomputed yet must not be shown as though it had. */}
                {row.countryCodes && row.countryCodes.length > 0
                  ? ` · ${row.countryCodes.join(' ')}`
                  : ''}
              </span>
              {unreadable.has(row.id) ? (
                <span className="chip chip--warn" data-testid="row-unreadable">
                  This trip’s file could not be read
                </span>
              ) : outdated.has(row.id) ? (
                <span className="chip chip--dim" data-testid="row-outdated">
                  {scan.phase === 'recomputing' ? 'Recomputing…' : 'Not up to date'}
                </span>
              ) : null}
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
        // **No `key`** — §2.2 A-10 / QA P2-2. The slug this used to compute collapsed every
        // non-Latin name to `"-"`; `createTrip` mints an opaque id and the name is the label.
        cities: cities
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name, i) => ({ name, order: i })),
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
