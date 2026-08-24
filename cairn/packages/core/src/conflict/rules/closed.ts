/**
 * `closed` — a stop scheduled outside its place's opening hours.
 *
 * Opening hours are deliberately a *simple weekly range* only (§7). Anything the model
 * cannot express is UNKNOWN, and unknown NEVER produces a conflict. A rule that guesses
 * seasonal hours would cry wolf every third stop and get switched off.
 *
 * NOTE: the legacy data carries no hours at all, so this rule finds nothing on the imported
 * Europe 2026 fixture; it is covered by a synthetic test instead. See BUILD-NOTES.
 */
import type { Conflict, OpeningHours } from '../../model/types.ts';
import { timeVal } from '../../derive/legs.ts';
import { parseIsoDate } from '../../derive/summary.ts';
import { makeConflict } from '../id.ts';
import type { Rule } from './types.ts';

function weekdayIndex(date: string): number {
  const { y, m, d } = parseIsoDate(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function windowFor(hours: OpeningHours, date: string): { open: string; close: string } | null {
  const wd = weekdayIndex(date);
  const entry = hours.weekly.find((e) => e && e.day === wd);
  return entry ? { open: entry.open, close: entry.close } : null;
}

export const closed: Rule = {
  id: 'closed',
  description: 'A stop is scheduled when the place is shut.',
  run(ctx) {
    const out: Conflict[] = [];
    const places = new Map(ctx.trip.places.map((p) => [p.id, p]));
    for (const day of ctx.trip.days) {
      for (const stop of day.stops) {
        if (stop.place.kind !== 'place') continue;
        if (stop.placement.kind !== 'scheduled' || !stop.placement.time) continue;
        const place = places.get(stop.place.placeId);
        if (!place || !place.hours) continue;
        const win = windowFor(place.hours, day.date);
        if (!win) continue; // unknown → never a conflict
        const t = timeVal(stop.placement.time);
        if (t >= timeVal(win.open) && t < timeVal(win.close)) continue;
        out.push(
          makeConflict({
            ruleId: 'closed',
            kind: 'schedule',
            severity: 'warning',
            subjects: [
              { kind: 'stop', id: stop.id },
              { kind: 'place', id: place.id },
              { kind: 'day', id: day.id },
            ],
            summary:
              `“${stop.name}” is scheduled at ${stop.placement.time} on ${day.date}, but ${place.name} ` +
              `is open ${win.open}–${win.close} that day.`,
            params: {
              stopName: stop.name,
              placeName: place.name,
              date: day.date,
              time: stop.placement.time,
              open: win.open,
              close: win.close,
            },
            values: { time: stop.placement.time, open: win.open, close: win.close, date: day.date },
          }),
        );
      }
    }
    return out;
  },
};
