/**
 * `unverified_reference` — a booking asserted by a human with no document behind it.
 *
 * `confidence === 'asserted'` and no `origin.messageId`. Fixture cases: the two Ryanair refs,
 * both given verbally and never found in either inbox. `BOOKINGS.md` records what happened
 * the last time software inferred around one of them.
 */
import type { Conflict } from '../../model/types.ts';
import { makeConflict } from '../id.ts';
import type { Rule } from './types.ts';

export const unverifiedReference: Rule = {
  id: 'unverified_reference',
  description: 'A booking reference nobody has a document for.',
  run(ctx) {
    const out: Conflict[] = [];
    for (const b of ctx.trip.bookings) {
      if (b.status === 'cancelled') continue;
      if (b.provenance.confidence !== 'asserted') continue;
      if (b.provenance.origin?.messageId) continue;
      // No reference at all means there is nothing to verify — the missing paperwork shows
      // up as `confidence: 'asserted'` on the booking itself, not as a reference warning.
      if (!b.reference) continue;
      out.push(
        makeConflict({
          ruleId: 'unverified_reference',
          kind: 'reference',
          severity: 'warning',
          subjects: [{ kind: 'booking', id: b.id }],
          summary:
            `${b.operator} ${b.reference} on ${b.startsAt.date} is recorded from ` +
            `memory — there is no confirmation email or ticket behind it.`,
          params: {
            operator: b.operator,
            reference: b.reference ?? '',
            date: b.startsAt.date,
            confidence: b.provenance.confidence,
          },
          detail: 'Check it in the operator’s manage-booking page before travelling.',
          values: { reference: b.reference, date: b.startsAt.date, time: b.startsAt.time },
        }),
      );
    }
    return out;
  },
};
