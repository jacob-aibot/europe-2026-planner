/**
 * `superseded_booking` — two bookings sharing `operator + reference` with different issue
 * dates. Emits *supersedes*, NOT *duplicate*: the Smartwings reissue is one ticket reissued,
 * and calling it a duplicate is how a correct plan gets quietly overwritten (§5.1).
 */
import type { Booking, Conflict } from '../../model/types.ts';
import { makeConflict } from '../id.ts';
import type { Rule } from './types.ts';

export const supersededBooking: Rule = {
  id: 'superseded_booking',
  description: 'The same ticket reference exists in two issues.',
  run(ctx) {
    const groups = new Map<string, Booking[]>();
    for (const b of ctx.trip.bookings) {
      if (!b.reference) continue;
      const key = `${b.operator.toLowerCase()}|${b.reference}`;
      const g = groups.get(key);
      if (g) g.push(b);
      else groups.set(key, [b]);
    }
    const out: Conflict[] = [];
    for (const [, g] of groups) {
      if (g.length < 2) continue;
      const issues = new Set(g.map((b) => b.issuedAt ?? ''));
      if (issues.size < 2) continue;
      const sorted = g.slice().sort((a, b) => (a.issuedAt ?? '').localeCompare(b.issuedAt ?? ''));
      const oldB = sorted[0];
      const newB = sorted[sorted.length - 1];
      out.push(
        makeConflict({
          ruleId: 'superseded_booking',
          kind: 'booking',
          severity: 'note',
          subjects: [
            { kind: 'booking', id: oldB.id },
            { kind: 'booking', id: newB.id },
          ],
          summary:
            `${newB.operator} ${newB.reference} was reissued: the ${oldB.issuedAt} version said ` +
            `${oldB.startsAt.date}${oldB.startsAt.time ? ` ${oldB.startsAt.time}` : ''}, the ${newB.issuedAt} ` +
            `version says ${newB.startsAt.date}${newB.startsAt.time ? ` ${newB.startsAt.time}` : ''}.`,
          params: {
            operator: newB.operator,
            reference: newB.reference ?? '',
            oldIssued: oldB.issuedAt ?? '',
            newIssued: newB.issuedAt ?? '',
            oldDate: oldB.startsAt.date,
            newDate: newB.startsAt.date,
          },
          detail: 'This is a reissue, not a duplicate booking. The later issue is the live one.',
          values: {
            oldIssued: oldB.issuedAt,
            newIssued: newB.issuedAt,
            oldDate: oldB.startsAt.date,
            newDate: newB.startsAt.date,
          },
        }),
      );
    }
    return out;
  },
};
