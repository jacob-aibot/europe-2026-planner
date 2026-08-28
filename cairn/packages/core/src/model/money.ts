/**
 * Money (ARCHITECTURE §2.6).
 *
 * `CostEstimate.display` is the string a UI shows, preserved verbatim from whatever
 * produced it. `amounts` is what core computes from. A display may encode several
 * products ("Gardens free · palace €15–24") and therefore several `Money` entries.
 *
 * Core never invents an exchange rate and never converts. All functions here are pure.
 */
import type { CostEstimate, Money, MoneyBasis } from './types.ts';
import type { Currency } from './ids.ts';

/** Symbol → ISO code. Extend only with evidence; a wrong guess here is silent data loss. */
const SYMBOL_CURRENCY: Record<string, Currency> = {
  '€': 'EUR',
  '£': 'GBP',
  $: 'USD',
  '¥': 'JPY',
};

/** Trailing/standalone codes we recognise in display strings. */
const CODE_CURRENCY = ['EUR', 'GBP', 'USD', 'CZK', 'HUF', 'CHF', 'PLN', 'HRK', 'SEK', 'NOK', 'DKK'];

/** Splits a display string into its product clauses. Pure. */
function clauses(display: string): string[] {
  return display
    .split(/\s*[·;]\s*|\s+\+\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The currency named in a piece of text, or null. Pure. */
function currencyIn(text: string): Currency | null {
  for (const code of CODE_CURRENCY) {
    if (new RegExp(`\\b${code}\\b`, 'i').test(text)) return code;
  }
  for (const sym of Object.keys(SYMBOL_CURRENCY)) {
    if (text.includes(sym)) return SYMBOL_CURRENCY[sym];
  }
  return null;
}

function basisIn(text: string): MoneyBasis | null {
  if (/\btotal\b/i.test(text)) return 'per_party';
  if (/\bpp\b|per person|\/person/i.test(text)) return 'per_person';
  return null;
}

/**
 * Parses a legacy-style display string into `Money[]`.
 *
 * Pure. Never throws — an unparsable clause is simply skipped, which is why
 * `parseCostDisplay('call for a price')` returns `[]` rather than a fabricated zero.
 *
 * @param display  e.g. `"Gardens free · palace €15–24"`, `"$573.25 total"`, `"~450 CZK"`
 * @param defaultCurrency currency assumed when a clause names none
 */
export function parseCostDisplay(display: string, defaultCurrency: Currency = 'EUR'): Money[] {
  const out: Money[] = [];
  const wholeBasis = basisIn(display);
  const wholeCurrency = currencyIn(display) ?? defaultCurrency;
  for (const clause of clauses(display)) {
    const currency = currencyIn(clause) ?? wholeCurrency;
    const basis = basisIn(clause) ?? wholeBasis ?? 'per_person';
    const range = /(\d+(?:[.,]\d+)?)\s*[–—-]\s*(\d+(?:[.,]\d+)?)/.exec(clause);
    if (range) {
      out.push({ lo: num(range[1]), hi: num(range[2]), currency, basis });
      continue;
    }
    const single = /(\d+(?:[.,]\d+)?)/.exec(clause);
    if (single) {
      const v = num(single[1]);
      out.push({ lo: v, hi: v, currency, basis });
      continue;
    }
    if (/\bfree\b/i.test(clause)) out.push({ lo: 0, hi: 0, currency, basis });
  }
  return out;
}

function num(s: string): number {
  return Number(s.replace(',', '.'));
}

/** Builds a `CostEstimate` from a display string. Pure; returns null for an empty display. */
export function costFromDisplay(
  display: string | null | undefined,
  defaultCurrency: Currency = 'EUR',
): CostEstimate | null {
  if (!display) return null;
  return { amounts: parseCostDisplay(display, defaultCurrency), display };
}

/** The distinct currencies in a cost estimate, in first-seen order. Pure. */
export function currenciesOf(cost: CostEstimate | null): Currency[] {
  if (!cost) return [];
  const seen: Currency[] = [];
  for (const a of cost.amounts) if (!seen.includes(a.currency)) seen.push(a.currency);
  return seen;
}

/** True if the estimate mixes per-person and per-party amounts. Pure. */
export function mixesBasis(cost: CostEstimate | null): boolean {
  if (!cost || cost.amounts.length < 2) return false;
  return cost.amounts.some((a) => a.basis !== cost.amounts[0].basis);
}

/** Formats a `{lo,hi}` pair the way the legacy app formatted a day total. Pure. */
export function formatRange(currency: Currency, lo: number, hi: number): string {
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '';
  const r = (n: number) => String(Math.round(n));
  const body = lo === hi ? r(lo) : `${r(lo)}–${r(hi)}`;
  return sym ? `${sym}${body}` : `${body} ${currency}`;
}
