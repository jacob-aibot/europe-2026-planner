/**
 * Presentation helpers. No decisions about a trip live here — a cost's *value* comes from
 * core; this only chooses how to print it.
 */
import type { AppState } from '@cairn/client';
import type { CostEstimate, DatePrecision, Lifecycle } from '@cairn/core';
import { formatRange } from '@cairn/core';

/**
 * The credit line's text — ARCHITECTURE §2.14 rule 7.
 *
 * Shared, and not copied into each view, because rule 7 is *"any view that renders a record
 * with a non-null `attribution` renders the credit"* and four hand-written versions is four
 * chances for one of them to quietly not exist. Two of the four did not exist (QA R2-8).
 *
 * Names the person where there is one, and otherwise falls back to the source trip's title —
 * the Phase 1 case, where both trips are owned by the `local:self` sentinel and *"From
 * local:self's trip"* would tell nobody anything. The credit is structurally intact either
 * way; this only decides how it reads. Pure. BUILD-NOTES KD-26.
 */
export function creditLabel(
  credit: { friendUserId: string; sourceTripId: string },
  state: AppState,
): string {
  const title = state.library.find((r) => r.id === credit.sourceTripId)?.title;
  if (credit.friendUserId && !credit.friendUserId.startsWith('local:')) {
    return `${credit.friendUserId.replace(/^user:/, '')}${title ? ` · ${title}` : '’s trip'}`;
  }
  return title ? `“${title}”` : 'another trip';
}

/**
 * The legacy display string wins when there is one. §2.2 keeps it verbatim precisely because
 * "gardens free · palace €15–24" says something a summed range cannot. Pure.
 */
export function costLabel(cost: CostEstimate | null | undefined): string | null {
  if (!cost) return null;
  if (cost.display) return cost.display;
  if (cost.amounts.length === 0) return null;
  const byCurrency = new Map<string, { lo: number; hi: number }>();
  for (const a of cost.amounts) {
    const seen = byCurrency.get(a.currency) ?? { lo: 0, hi: 0 };
    byCurrency.set(a.currency, { lo: seen.lo + a.lo, hi: seen.hi + a.hi });
  }
  return [...byCurrency.entries()].map(([cur, v]) => formatRange(cur, v.lo, v.hi)).join(' + ');
}

/**
 * The lifecycle chip's label — ARCHITECTURE §8.1, ROADMAP Phase 2 I-4.
 *
 * The **stage** comes from `core.lifecycle` and is never computed here; this only chooses the
 * word. There is no stored status field and there must not be one: a stored status is a copy
 * of a fact the dates already state and it goes stale at midnight with nothing to invalidate
 * it (§0.6).
 *
 * Pure.
 */
export function lifecycleLabel(stage: Lifecycle): string {
  return stage === 'planned' ? 'Upcoming' : stage === 'active' ? 'On this trip now' : 'Past trip';
}

/**
 * How a date range reads given how sure the user was — §8.1's *"read by display and nothing
 * else"*, and this is the display.
 *
 * `startDate`/`endDate` are always real calendar dates; when the user told us they only knew
 * the month or the year, printing "1 March – 31 March" would state something they did not
 * claim, which is the one convention `CLAUDE.md` calls absolute. Pure.
 */
export function dateRangeLabel(
  trip: { startDate: string; endDate: string; datePrecision: DatePrecision },
): string {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const [y, m] = trip.startDate.split('-');
  if (trip.datePrecision === 'year') return y;
  if (trip.datePrecision === 'month') return `${MONTHS[Number(m) - 1] ?? m} ${y}`;
  return `${trip.startDate} → ${trip.endDate}`;
}
