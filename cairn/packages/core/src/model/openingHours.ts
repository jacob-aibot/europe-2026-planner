/**
 * What a well-formed `OpeningHours` is — the ONE definition (ARCHITECTURE §2.14 **A-20**,
 * revision 15; QA R15-1, R15-2, R16-2).
 *
 * Before this module there were three answers in this repo and no two agreed: `fromJSON`'s
 * (`o.hours as Place['hours']` — anything at all), `validateTrip`'s (`wellFormedHours`, loose)
 * and the copy's (`weeklyForCopy`, strict). That one cast produced three findings across two
 * rounds — a credential crossing a person boundary (R15-1), a raw `TypeError` out of core on a
 * document `fromJSON` had just accepted (R15-2), and a warning that did not fire on the
 * documents whose hours the copy silently dropped (R16-2). A-20's answer is not a fourth guard:
 * it is this file, imported by all three.
 *
 * `isOpeningHours(v)` is true **exactly when `fromJSON` accepts `v`**. That equality is the
 * contract, and `test/openingHours.test.ts` asserts both halves of it.
 *
 * Modelled on `model/cityName.ts` and, like it, deliberately **not** on
 * `packages/core/src/index.ts`: §2.10's export surface stays at 71 runtime symbols. Nothing
 * outside `packages/core` needs to ask this question.
 *
 * Three things this deliberately does NOT do, so nobody adds them (A-20):
 *
 *   - **No `day` range check.** `0 ≤ day ≤ 6` is a claim about *meaning*, not shape; §7 says a
 *     missing day is unknown and never a conflict, and nothing in this system reads `day` yet.
 *     A rule with no consumer has no injected-fault criterion (§0.5). If a renderer ever needs
 *     one it is a new `IssueCode` in `validateTrip`, ruled then, and **not** a parse refusal.
 *   - **Extra keys on a `weekly` entry are not malformed.** The parser drops them, exactly as
 *     `parseLinks` drops a third key on a `Link`, and nothing reads them. Reporting them would
 *     be over-reporting.
 *   - **`undefined` in a `weekly` slot is not malformed.** `fromJSON` normalises it to `null`,
 *     so by the predicate's own definition it is accepted. Normalisation and refusal are
 *     different acts: the parser normalises only **absence** and refuses every present-but-wrong
 *     value.
 */

/** `H:MM` or `HH:MM`. The one clock-shape test in this system. Pure. Throws nothing. */
export function isClockTime(v: unknown): boolean {
  return typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v);
}

/** One `weekly` entry: `null`/absent (day unknown, §7) or `{day, open, close}`. Pure. Throws nothing. */
export function isWeeklyEntry(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v !== 'object' || Array.isArray(v)) return false;
  const e = v as { day?: unknown; open?: unknown; close?: unknown };
  return typeof e.day === 'number' && Number.isFinite(e.day) && isClockTime(e.open) && isClockTime(e.close);
}

/** True when `v` is an `OpeningHours` — i.e. exactly when `fromJSON` accepts it. Pure. Throws nothing. */
export function isOpeningHours(v: unknown): boolean {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as { weekly?: unknown; note?: unknown };
  if (!Array.isArray(o.weekly)) return false;
  if (o.note !== undefined && typeof o.note !== 'string') return false;
  return o.weekly.every(isWeeklyEntry);
}
