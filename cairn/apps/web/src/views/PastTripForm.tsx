/**
 * *Record a trip you have already taken* — ROADMAP Phase 2 I-4, ARCHITECTURE §8.1.
 *
 * Title, dates, `datePrecision`, cities. **No day-by-day required**: a three-week trip to
 * Japan in 2019 entered from memory gets 21 empty `Day` rows and that is fine — empty days
 * are already a supported, titled, navigable shape (§2.3), `ensureDays` mints them, and
 * `days: []` is not permitted for "memory" trips because it would put a hole in the one
 * invariant every derive function relies on.
 *
 * It dispatches **`createTrip`, `setTripMeta` and `setDayMeta` and nothing else** (§4.2 rule
 * 1). There is no new action, no new store method, and no domain logic here: the closed list
 * of six document-installing store methods stays six, and `createTrip` is already one of them.
 *
 * **At least one city, and the days carry it** (BUILD-NOTES KD-38). `ensureDays` mints blank
 * days as `primaryCity:'transit'`, the catch-all, so a past trip recorded without this step is
 * attributable to nowhere: the trip says "Japan" and not one of its days says so, and I-6's
 * `cityKeys` widening — the lifetime map, which is the thing Phase 2 exists to build — finds
 * no city on any of them. The trip's **first** city is assigned to every day, through the
 * ordinary `setDayMeta` action. That is deliberately the simplest thing that makes the record
 * attributable: a user who moved around can refine any day afterwards in the ordinary editor,
 * and nothing here pretends to know which day was where.
 *
 * `datePrecision` is the *only* thing this screen knows that `NewTrip` does not, and all it
 * does with it is **choose which date inputs to show**. `startDate`/`endDate` are still real
 * calendar dates whichever mode is picked — "March 2019" becomes 2019-03-01 … 2019-03-31, and
 * the precision records that the user did not claim those two days specifically. §8.1: the
 * field is read by display and nothing else, and the range widening is done here, in
 * `apps/web`, precisely so that no rule, derive or validation ever has to look at it.
 */
import { useState } from 'react';
import type { DatePrecision } from '@cairn/core';
import { store } from '../store.ts';

type Props = { onClose: () => void; onError: (m: string) => void };

const PRECISIONS: Array<{ value: DatePrecision; label: string; hint: string }> = [
  { value: 'exact', label: 'Exact dates', hint: 'I know the days' },
  { value: 'month', label: 'A month', hint: 'e.g. “March 2019”' },
  { value: 'year', label: 'A year', hint: 'e.g. “2019”' },
];

/**
 * Last day of a month, by arithmetic rather than through `Date`.
 *
 * `new Date(Date.UTC(y, m, 0))` would be correct, but `apps/web` reads `Date` in
 * `ports/env.ts` and nowhere else (§2.1), and `test/views.test.ts` greps for that. Keeping the
 * grep strict is worth eight lines of Gregorian arithmetic.
 */
function lastDayOfMonth(year: number, month1to12: number): number {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month1to12 - 1] ?? 31;
}

/**
 * The real calendar range a fuzzy answer stands for. Pure, and deliberately in `apps/web`:
 * this is presentation widening a user's imprecision into the honest range §8.1 stores.
 */
export function rangeFor(
  precision: DatePrecision,
  input: { exactStart: string; exactEnd: string; month: string; year: string },
): { startDate: string; endDate: string } | null {
  if (precision === 'exact') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.exactStart) || !/^\d{4}-\d{2}-\d{2}$/.test(input.exactEnd)) return null;
    if (input.exactEnd < input.exactStart) return null;
    return { startDate: input.exactStart, endDate: input.exactEnd };
  }
  if (precision === 'month') {
    const m = /^(\d{4})-(\d{2})$/.exec(input.month);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    if (mo < 1 || mo > 12) return null;
    const last = String(lastDayOfMonth(y, mo)).padStart(2, '0');
    return { startDate: `${m[1]}-${m[2]}-01`, endDate: `${m[1]}-${m[2]}-${last}` };
  }
  if (!/^\d{4}$/.test(input.year)) return null;
  return { startDate: `${input.year}-01-01`, endDate: `${input.year}-12-31` };
}

export function PastTripForm({ onClose, onError }: Props) {
  const [title, setTitle] = useState('');
  const [precision, setPrecision] = useState<DatePrecision>('month');
  const [exactStart, setExactStart] = useState('');
  const [exactEnd, setExactEnd] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [cities, setCities] = useState('');
  const [busy, setBusy] = useState(false);

  const range = rangeFor(precision, { exactStart, exactEnd, month, year });
  // Same shape the new-trip form already uses: names, comma separated, in order. A city's
  // centre is not asked for on either screen and `createTrip` supplies its default.
  const cityList = cities
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name, i) => ({ key: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, order: i }));
  const valid = !!title.trim() && !!range && cityList.length > 0 && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !range) return;
    setBusy(true);
    try {
      // 1 of 3: `createTrip`. `ensureDays` mints the dense day skeleton — a 21-day 2019 trip
      // gets 21 empty `Day` rows, which is the point (§8.1).
      const created = await store.createTrip({
        title: title.trim(),
        startDate: range.startDate,
        endDate: range.endDate,
        cities: cityList,
      });
      // 2 of 3: `setTripMeta`, through the ordinary action. `datePrecision` is on the patch
      // allowlist (§8.9) and adds no build function — it is data, not a capability.
      store.dispatch({ type: 'setTripMeta', patch: { datePrecision: precision } });
      // 3 of 3: the days carry the trip's first city, so the record is attributable to a
      // place rather than to the `transit` catch-all `ensureDays` mints (KD-38). One
      // `setDayMeta` per day, the existing action, unchanged — `cities` is set alongside
      // `primaryCity` so a day ends up with exactly the one city, not the catch-all beside it.
      const key = cityList[0].key;
      for (const day of created.doc?.days ?? []) {
        store.dispatch({ type: 'setDayMeta', dayId: day.id, patch: { primaryCity: key, cities: [key] } });
      }
      onClose();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card newtrip pasttrip" onSubmit={submit} aria-label="Record a past trip">
      <p className="hint">
        A trip you have already taken. Days and stops are optional — you can fill them in later, or never.
      </p>
      <label>
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Japan, March 2019"
          autoFocus
          data-testid="past-title"
        />
      </label>

      <fieldset className="precision">
        <legend>How well do you remember the dates?</legend>
        <div className="row">
          {PRECISIONS.map((p) => (
            <label key={p.value} className={`chip chip--choice ${precision === p.value ? 'chip--on' : ''}`}>
              <input
                type="radio"
                name="datePrecision"
                value={p.value}
                checked={precision === p.value}
                onChange={() => setPrecision(p.value)}
                data-testid={`past-precision-${p.value}`}
              />
              {p.label} <span className="hint">{p.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {precision === 'exact' && (
        <div className="row">
          <label>
            Start
            <input type="date" value={exactStart} onChange={(e) => setExactStart(e.target.value)} data-testid="past-start" />
          </label>
          <label>
            End
            <input type="date" value={exactEnd} onChange={(e) => setExactEnd(e.target.value)} data-testid="past-end" />
          </label>
        </div>
      )}
      {precision === 'month' && (
        <label>
          Month
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            placeholder="2019-03"
            data-testid="past-month"
          />
        </label>
      )}
      {precision === 'year' && (
        <label>
          Year
          <input
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="2019"
            data-testid="past-year"
          />
        </label>
      )}

      <label>
        Cities <span className="hint">comma separated, in order — at least one</span>
        <input value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Tokyo, Kyoto" data-testid="past-cities" />
      </label>
      {/*
        Say why, rather than just refusing to submit: the city is what puts the trip on the
        map of where you have been. Days are assigned to the first one and can be changed
        later — stated here so nothing is presented as a claim the user made about a day.
      */}
      {cityList.length === 0 && (
        <p className="hint" data-testid="past-cities-why">
          Name at least one city — it is what puts this trip on the map of where you have been. Every day is
          recorded in the first one; you can change any of them later.
        </p>
      )}

      {/*
        Never present a stored range as something the user claimed. When the answer was fuzzy
        the screen says so, in words, next to the dates it is about to store.
      */}
      {range && (
        <p className="hint" data-testid="past-range">
          Stored as {range.startDate} → {range.endDate}
          {precision !== 'exact' && ' — recorded as approximate, because you said you were not sure of the days.'}
        </p>
      )}
      {!range && (precision === 'exact' ? exactStart && exactEnd : precision === 'month' ? month : year) && (
        <p className="hint hint--warn">That is not a range this can store yet.</p>
      )}

      <div className="row row--end">
        <button type="button" className="btn btn--quiet" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={!valid} data-testid="past-submit">
          Record it
        </button>
      </div>
    </form>
  );
}
