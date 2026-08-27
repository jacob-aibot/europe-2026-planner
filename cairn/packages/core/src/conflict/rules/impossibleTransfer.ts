/**
 * `impossible_transfer` — the leg into a stop takes longer than the gap from the previous
 * stop.
 *
 * §2.12 governs whether it runs at all. `Stop.travelRole` says what the stop's `time` and
 * `arrival` mean: `'transfer'` → today's arithmetic, **blocker**; `'unknown'` → the same
 * arithmetic as a **warning**, because the model cannot vouch for the reading; `'journey'` →
 * the rule does not run, because a vehicle's own run measured against the gap before it
 * departs is not a statement about anything.
 *
 * That takes the reference trip from 4 blockers to 0. All four were departure-time
 * artifacts, **including** the Aug 18 05:00-checkout → 05:30-bus case that the first review,
 * the QA pass and the note to Jacob all called the one real defect: the bus departs 05:30,
 * runs 40 minutes, reaches PRG at 06:10, and the flight is 07:30. What the model actually
 * has to say about the hotel-to-bus-stop transfer is nothing, because the data does not
 * describe it — and asserting a blocker from an absence is the same error as guessing.
 *
 * The tightest remaining margin on any `'transfer'` stop is 7 minutes (Aug 14, walking from
 * the Skradin bus stop to the ticket office), which is a property of the plan rather than of
 * the display. `conflict.test.ts` asserts that number. BUILD-NOTES §1, KD-1.
 */
import type { Conflict } from '../../model/types.ts';
import { computeLegs, timeVal } from '../../derive/legs.ts';
import { makeConflict } from '../id.ts';
import type { Rule } from './types.ts';

export const impossibleTransfer: Rule = {
  id: 'impossible_transfer',
  description: 'The journey into a stop is longer than the time available before it.',
  /** §8.2: you cannot miss a connection you already made. */
  class: 'feasibility',
  run(ctx) {
    const out: Conflict[] = [];
    for (const day of ctx.trip.days) {
      const legs = computeLegs(day, ctx.trip);
      for (let i = 1; i < day.stops.length; i++) {
        const leg = legs[i];
        if (!leg) continue;
        const prev = day.stops[i - 1];
        const cur = day.stops[i];
        if (cur.travelRole === 'journey') continue;
        if (prev.placement.kind !== 'scheduled' || cur.placement.kind !== 'scheduled') continue;
        const t0 = timeVal(prev.placement.time);
        const t1 = timeVal(cur.placement.time);
        if (t0 >= 99999 || t1 >= 99999) continue;
        const gap = t1 - t0;
        if (leg.mins <= gap) continue;
        const uncertain = cur.travelRole === 'unknown';
        out.push(
          makeConflict({
            ruleId: 'impossible_transfer',
            kind: 'schedule',
            severity: uncertain ? 'warning' : 'blocker',
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
              travelRole: cur.travelRole,
            },
            detail: uncertain
              ? 'The model cannot tell whether this stop’s time is a departure or an arrival, so ' +
                'this may not be a defect at all. Say how you travel to this stop to resolve it.'
              : leg.source === 'override'
                ? 'The journey time is an explicit override on the arriving stop.'
                : 'The journey time is estimated from the distance between the two stops.',
            values: {
              legMins: leg.mins,
              gap,
              from: prev.placement.time,
              to: cur.placement.time,
              travelRole: cur.travelRole,
            },
          }),
        );
      }
    }
    return out;
  },
};
