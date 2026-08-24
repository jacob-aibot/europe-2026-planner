/**
 * `duplicate_booking` — two DIFFERENT references covering the same route on the same date.
 *
 * Distinct from `superseded_booking`, which is the same reference reissued. This is the
 * ingest case: a forwarded confirmation parsed twice under two references.
 */
import type { Booking, Conflict } from '../../model/types.ts';
import { makeConflict } from '../id.ts';
import type { Rule } from './types.ts';

function routeKey(b: Booking): string | null {
  if (!b.route) return null;
  return `${b.startsAt.date}|${b.route.fromName.toLowerCase()}|${b.route.toName.toLowerCase()}`;
}

export const duplicateBooking: Rule = {
  id: 'duplicate_booking',
  description: 'Two different bookings cover the same journey on the same day.',
  run(ctx) {
    const groups = new Map<string, Booking[]>();
    for (const b of ctx.trip.bookings) {
      if (b.status !== 'active') continue;
      const k = routeKey(b);
      if (!k) continue;
      const g = groups.get(k);
      if (g) g.push(b);
      else groups.set(k, [b]);
    }
    const out: Conflict[] = [];
    for (const [, g] of groups) {
      if (g.length < 2) continue;
      const refs = new Set(g.map((b) => b.reference ?? ''));
      if (refs.size < 2) continue;
      const sorted = g.slice().sort((a, b) => a.id.localeCompare(b.id));
      out.push(
        makeConflict({
          ruleId: 'duplicate_booking',
          kind: 'booking',
          severity: 'warning',
          subjects: sorted.map((b) => ({ kind: 'booking' as const, id: b.id })),
          summary:
            `Two separate bookings cover ${sorted[0].route?.fromName} → ${sorted[0].route?.toName} on ` +
            `${sorted[0].startsAt.date}: ${sorted.map((b) => `${b.operator} ${b.reference}`).join(' and ')}.`,
          params: {
            date: sorted[0].startsAt.date,
            fromName: sorted[0].route?.fromName ?? '',
            toName: sorted[0].route?.toName ?? '',
            references: sorted.map((b) => b.reference ?? '').join(', '),
          },
          detail: 'These have different references, so this is not a reissue. One of them may be cancellable.',
          values: { refs: sorted.map((b) => b.reference).sort() },
        }),
      );
    }
    return out;
  },
};
