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
 *
 * **A-21 (revision 16, QA R17-1) replaced `isWeeklyEntry` with `readWeeklyEntry`.** A boolean
 * answers *"is that value well-formed?"* and then throws the value away, so every consumer had
 * to go back to the object and **read the field again** to use it — and for an accessor property
 * the value that was checked is not the value that is used. The rule, which decides the next case
 * as well as this one:
 *
 * > Within one traversal, a field of a caller-supplied value is read exactly once. A predicate
 * > over a **compound** value therefore returns *what it read* — never a `boolean` that its
 * > caller must re-derive the value to act on.
 *
 * `isOpeningHours` stays a `boolean`, and that is not an inconsistency: its only consumer
 * *reports* on the value (`place_hours_malformed`) and never uses it, so there is nothing for it
 * to hand back. `isClockTime` is a boolean for the other reason — its argument is an already-read
 * scalar, so there is no second read to get wrong. It is now a **type predicate**, which is what
 * lets `readWeeklyEntry` build a `WeeklyEntry` with no cast at all.
 *
 * **The accept set does not move.** `readWeeklyEntry(v).kind !== 'malformed'` ⟺ the old
 * `isWeeklyEntry(v)`, so A-20's contract sentence above still holds literally, and
 * `test/openingHours.test.ts` re-derives it row for row rather than trusting it.
 */

import type { ClockTime } from './ids.ts';

/** `H:MM` or `HH:MM`. The one clock-shape test in this system. Pure. Throws nothing. */
export function isClockTime(v: unknown): v is ClockTime {
  return typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v);
}

/** One well-formed `weekly` entry, already read. Every field here is a value, never a getter. */
export type WeeklyEntry = { day: number; open: ClockTime; close: ClockTime };

/** The result of reading one `weekly` slot exactly once. Three outcomes, because `null` cannot
 *  mean both "absent, and that is valid" and "malformed". */
export type WeeklyRead =
  | { kind: 'absent' }
  | { kind: 'entry'; entry: WeeklyEntry }
  | { kind: 'malformed' };

/**
 * Reads one `weekly` slot **once per field** and hands back what it read (A-21). Pure. Throws
 * nothing of its own — a getter on the caller's object that throws still propagates, which is
 * true of reading any field of any record and is not this function's to catch.
 */
export function readWeeklyEntry(v: unknown): WeeklyRead {
  if (v === null || v === undefined) return { kind: 'absent' };
  if (typeof v !== 'object' || Array.isArray(v)) return { kind: 'malformed' };
  const e = v as { day?: unknown; open?: unknown; close?: unknown };
  // One read per field, in the order the boolean predicate short-circuited in, so the read
  // COUNT and the read ORDER are both unchanged from A-20 for every value either can see.
  const day: unknown = e.day;
  if (typeof day !== 'number' || !Number.isFinite(day)) return { kind: 'malformed' };
  const open: unknown = e.open;
  if (!isClockTime(open)) return { kind: 'malformed' };
  const close: unknown = e.close;
  if (!isClockTime(close)) return { kind: 'malformed' };
  return { kind: 'entry', entry: { day, open, close } };
}

/** True when `v` is an `OpeningHours` — i.e. exactly when `fromJSON` accepts it. Pure. Throws nothing. */
export function isOpeningHours(v: unknown): boolean {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as { weekly?: unknown; note?: unknown };
  const weekly: unknown = o.weekly;
  const note: unknown = o.note;
  if (!Array.isArray(weekly)) return false;
  if (note !== undefined && typeof note !== 'string') return false;
  return weekly.every((w) => readWeeklyEntry(w).kind !== 'malformed');
}
