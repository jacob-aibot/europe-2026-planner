/**
 * `impossible_transfer` — the leg into a stop takes longer than the gap from the previous
 * stop. Blocker.
 *
 * Fixture case named in ARCHITECTURE §2.7: Aug 18, a 05:30 airport bus with a 40-minute
 * override leaving from a 05:00 checkout — 40 minutes of travel into a 30-minute gap.
 *
 * The same arithmetic also fires on three vehicle stops (the LAX and LHR long-hauls and the
 * Dubrovnik→Split coach) where `arrival` holds the vehicle's own journey time rather than a
 * transfer, and the stop's time is a DEPARTURE. Those three are artifacts of the legacy data
 * shape, not real defects; the rule is implemented exactly as specified and the objection is
 * recorded rather than silently patched. BUILD-NOTES §1, KD-1 — including the 25 further
 * stops that stay silent only by coincidence, and the two constraints on any fix.
 */
import type { Conflict } from '../../model/types.ts';
import { computeLegs, timeVal } from '../../derive/legs.ts';
import { makeConflict } from '../id.ts';
import type { Rule } from './types.ts';

export const impossibleTransfer: Rule = {
  id: 'impossible_transfer',
  description: 'The journey into a stop is longer than the time available before it.',
  run(ctx) {
    const out: Conflict[] = [];
    for (const day of ctx.trip.days) {
      const legs = computeLegs(day, ctx.trip);
      for (let i = 1; i < day.stops.length; i++) {
        const leg = legs[i];
        if (!leg) continue;
        const prev = day.stops[i - 1];
        const cur = day.stops[i];
        if (prev.placement.kind !== 'scheduled' || cur.placement.kind !== 'scheduled') continue;
        const t0 = timeVal(prev.placement.time);
        const t1 = timeVal(cur.placement.time);
        if (t0 >= 99999 || t1 >= 99999) continue;
        const gap = t1 - t0;
        if (leg.mins <= gap) continue;
        out.push(
          makeConflict({
            ruleId: 'impossible_transfer',
            kind: 'schedule',
            severity: 'blocker',
            subjects: [
              { kind: 'stop', id: prev.id },
              { kind: 'stop', id: cur.id },
              { kind: 'day', id: day.id },
            ],
            summary:
              `${day.date}: “${cur.name}” is ${leg.mins} min by ${leg.mode} from “${prev.name}”, ` +
              `but only ${gap} min separates ${prev.placement.time} and ${cur.placement.time}.`,
            params: {
              dayId: day.id,
              fromName: prev.name,
              toName: cur.name,
              mode: leg.mode,
              legMins: leg.mins,
              gapMins: gap,
              fromTime: prev.placement.time ?? '',
              toTime: cur.placement.time ?? '',
            },
            detail:
              leg.source === 'override'
                ? 'The journey time is an explicit override on the arriving stop.'
                : 'The journey time is estimated from the distance between the two stops.',
            values: { legMins: leg.mins, gap, from: prev.placement.time, to: cur.placement.time },
          }),
        );
      }
    }
    return out;
  },
};
