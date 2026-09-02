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
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function dateRangeLabel(
  trip: { startDate: string; endDate: string; datePrecision: DatePrecision },
): string {
  const [y, m] = trip.startDate.split('-');
  if (trip.datePrecision === 'year') return y;
  if (trip.datePrecision === 'month') return `${MONTHS[Number(m) - 1] ?? m} ${y}`;
  return `${trip.startDate} → ${trip.endDate}`;
}

/**
 * What a row whose dates are **not dates** says about them: the two strings that are actually
 * in the user's file, joined, and nothing else — ARCHITECTURE §2.9 **A-46** Part 3 clause 2,
 * ROADMAP Phase 2 **I-8e**, QA **R34-4**. Pure.
 *
 * `dateRangeLabel` above is for a range we can read. Handed `'not-a-date'` it does not throw —
 * it is a string split — but at month precision it prints `MONTHS[NaN - 1] ?? 'not'`, so round
 * 34 measured a card reading **`a not`** directly under a chip saying the dates could not be
 * read. Not throwing is not the same as not stating something false.
 *
 * So: **no month-name lookup and no `datePrecision` branch.** A precision is a claim about how
 * sure the user was, and it cannot be applied to a value we have just said we cannot read. The
 * user gets shown what is in their file, which is the only true thing we have.
 *
 * This is a separate function rather than an inline `{row.startDate} → {row.endDate}` for a
 * reason `test/views.test.ts` enforces: QA **P2-6**'s ceiling forbids that shape in a view, so
 * that the *readable* branch can never quietly grow one back.
 */
export function storedDatesLabel(trip: { startDate: string; endDate: string }): string {
  return `${trip.startDate} → ${trip.endDate}`;
}

/**
 * A month and a year from an `IsoDate`, for the Profile's span line — ROADMAP Phase 2
 * **I-8b**, `docs/DESIGN.md` §5.3 (*"across 3 trips, from Aug 2019 to Aug 2026"*).
 *
 * **This is not `dateRangeLabel` and may not be routed through it.** That function answers
 * *"how does this TRIP's range read given how sure the user was"* and branches on
 * `datePrecision`. Its subject here is a `TravelStatsCountry.firstVisit` — a value core
 * **derived** from the whole library, which carries no precision of its own and belongs to no
 * single trip. Applying a trip's precision to it would be a claim about a value that has none.
 *
 * A month name is the deliberate ceiling on what this prints: the day of a first visit is a
 * fact about one trip, and the span line is a fact about a travel life. Pure.
 */
export function monthYearLabel(iso: string): string {
  const [y, m] = iso.split('-');
  const name = MONTHS[Number(m) - 1];
  return name ? `${name.slice(0, 3)} ${y}` : iso;
}
