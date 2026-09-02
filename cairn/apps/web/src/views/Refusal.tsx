/**
 * *"We could not read your travel history"* — one vocabulary, one component.
 *
 * ROADMAP **I-8** requires every surface that renders `travelStats` to catch A-31 Part 4's
 * sanctioned throw and say so *"with the offending row id, rather than a blank screen or an
 * unhandled rejection."* `docs/DESIGN.md` §5.5 is stricter than that: the Profile renders
 * **"the same component and the same words"** as the world map, *"because one vocabulary for
 * 'could not be read' is already the rule."*
 *
 * **Why the world map does not import this yet — ruled, not left to be discovered.**
 * `DESIGN.md` §5.6 closes I-8b's scope with *"Explicitly not in I-8b: any change to
 * `WorldMap.tsx` (it is a zero-line diff for three increments running…)"*, and I-8b's own
 * *Built* list repeats it — **`WorldMap.tsx` stays a zero-line diff**. §5.5's *"the same
 * component"* and §5.6's zero-line fence looked like they disagreed by one import statement;
 * the architect's revision 39 (QA round 41's R41-14) ruled on it directly — **the fence wins
 * and is not narrowed; §5.5 keeps its words and yields its mechanism**. The shared component
 * lands here, the Profile uses it, and the world map adopts it in the next increment that
 * opens that file for a reason of its own.
 *
 * Until then the two copies are kept identical by a **rendered** criterion, not a source
 * allow-list — `DESIGN.md` §6.2 requires each surface's `.banner--error` to carry identical
 * normalised text content on both refusal branches, checked in `qa/i8b-render.mjs` (fault 12)
 * against the actual DOM, text nodes and pseudo-element content alike, so the vocabulary
 * cannot drift while the duplication exists. That is the honest form of the rule: a
 * duplication that is *measured* equal on what a person actually sees is a different thing
 * from a duplication nobody is watching.
 *
 * It renders no heading of its own — the surface owns its own `<h1>`, because *"Everywhere you
 * have been"* and *"Your travel record"* are two different pages refusing the same read.
 */
import type { TravelHistoryResult } from '@cairn/client';

type Props = { refusal: Extract<TravelHistoryResult, { ok: false }> };

export function HistoryRefusal({ refusal }: Props) {
  return (
    <div className="banner banner--error" role="alert" data-testid="history-refused">
      <div>
        <b>We could not read your travel history.</b>
        <p className="hint">
          {refusal.rowId
            ? `The stored record for trip ${refusal.rowId} is not readable.`
            : 'One of the stored trip records is not readable.'}
        </p>
        <p className="hint mono">{refusal.message}</p>
      </div>
    </div>
  );
}
