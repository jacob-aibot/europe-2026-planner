/**
 * Presentation helpers. No decisions about a trip live here — a cost's *value* comes from
 * core; this only chooses how to print it.
 */
import type { CostEstimate } from '@cairn/core';
import { formatRange } from '@cairn/core';

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
