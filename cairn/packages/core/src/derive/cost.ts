/**
 * Cost roll-up (ARCHITECTURE §2.5, §2.6).
 *
 * Core NEVER invents an exchange rate. With no rate table it reports per-currency
 * subtotals and lists what it could not convert. A scope mixing per-person and per-party
 * amounts emits a `basisWarning` — it cannot know whether "€25–40 dinner" was already
 * for the group.
 */
import type { CostRollUp, Day, Stop, Trip } from '../model/types.ts';
import type { Currency } from '../model/ids.ts';

export type RollUpScope = Trip | Day | readonly Stop[];

export type RollUpOpts = {
  /** Currency the caller wishes it had a total in. Never fabricated — see `missingRates`. */
  target?: Currency;
  /** Rate tables are a Phase 2 concern (§7); passing one is not supported yet. */
  rateSetId?: string;
};

function scopeStops(scope: RollUpScope): Stop[] {
  if (Array.isArray(scope)) return scope as Stop[];
  const s = scope as Trip | Day;
  if ('days' in s) {
    const trip = s as Trip;
    return trip.days.flatMap((d) => d.stops);
  }
  return (s as Day).stops;
}

/**
 * Sums a scope's costs per currency. Pure; never throws.
 *
 * Badge-only "free" stops carry `cost === null` and contribute nothing — golden parity
 * with the live app's `dayCost()` requires exactly that (§2.11).
 */
export function rollUpCost(scope: RollUpScope, opts: RollUpOpts = {}): CostRollUp {
  const stops = scopeStops(scope);
  const byCurrency: Record<Currency, { lo: number; hi: number }> = {};
  const bases: Record<Currency, Set<string>> = {};
  const partyExamples: Record<Currency, string[]> = {};

  for (const stop of stops) {
    if (!stop.cost) continue;
    for (const a of stop.cost.amounts) {
      const cur = a.currency;
      if (!byCurrency[cur]) byCurrency[cur] = { lo: 0, hi: 0 };
      byCurrency[cur].lo += a.lo;
      byCurrency[cur].hi += a.hi;
      (bases[cur] ??= new Set()).add(a.basis);
      if (a.basis === 'per_party') (partyExamples[cur] ??= []).push(stop.name);
    }
  }

  const basisWarnings: string[] = [];
  for (const cur of Object.keys(bases)) {
    if (bases[cur].size > 1) {
      const who = (partyExamples[cur] ?? []).join(', ');
      basisWarnings.push(
        `${cur} mixes per-person and per-party amounts (party totals: ${who || 'unknown'}); ` +
          `the subtotal is not a per-person figure.`,
      );
    }
  }

  const present = Object.keys(byCurrency);
  const target = opts.target;
  const missingRates = target ? present.filter((c) => c !== target) : present.length > 1 ? present : [];

  return { byCurrency, converted: null, missingRates, basisWarnings };
}

/** Convenience: the roll-up for one day. Pure. */
export function dayCost(day: Day): CostRollUp {
  return rollUpCost(day.stops);
}
