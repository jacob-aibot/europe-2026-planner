/**
 * **The one chokepoint — ARCHITECTURE §11.8 clause 2, as rewritten by §11.11 A-96 Part 6.**
 *
 * > **A record's free text may be narrated only where the closed `Question` union makes that
 * > record the SUBJECT of the question. Everything else about a record is cited and
 * > parametrised, never narrated.**
 *
 * `Question` carries a `cityKey` and nothing else that names a record, so the admissible set is
 * **exactly `{City.name}`** — and it must be admissible, because §11.7 rule 2's restatement
 * (*"I read this as: when you leave Vienna"*) is unsatisfiable if the answer cannot say which
 * city. `trip.title`, `Stop.name`, `Place.name`, `Booking.operator`, `Booking.reference` and
 * `Stop.note` are **descriptions of records** that no question takes as its subject: inadmissible
 * in `text` and in `caveat.message`, and travelling in `facts[].params` and `cites`, where they
 * already do.
 *
 * **Admissible is not trusted.** QA R70-4 measured that §11.8's *"`redactionHits(answer.text)` is
 * `[]` for every answer"* held only because of the reference trip's own strings: a trip titled
 * `Split flat (door code 4821)` rendered `['keyword_token','keyword_digits']` — a §6.6 credential
 * class in prose — and a city renamed `LONDON` fired on three of the five question kinds. So the
 * one admissible field passes through `narratable` below, which applies §6.6's **existing**
 * `redactText` — one import, no new export, no second pattern set — **before** interpolation, and
 * the guarantee becomes a property of the renderer rather than of the fixture.
 *
 * **`facts[].value` and `params` carry no such guarantee, deliberately** (A-96 Part 6). They are
 * the document's own values, they are what a surface interpolates under its own §6.6 obligations,
 * and stripping them would make the structured half of an `Answer` a worse description of the
 * trip than the trip. The guarantee is about **prose Cairn composes**, which is the thing that
 * travels into a screenshot, a share page or a future model's transcript.
 *
 * **Known cost, A-96 Part 8 residue 2:** `alnum_reference` matches any 6+ character ALL-CAPS
 * token, so a city stored as `LONDON` narrates as `[redacted]` — poor prose, never a false
 * statement, and `params.cityKey` still identifies the subject. The fix, when it is wanted, is in
 * §6.6's pattern set and is **never** a per-call exemption here.
 *
 * Internal (§11.9). Pure.
 */
import type { Trip } from '../model/types.ts';
import type { CityKey } from '../model/ids.ts';
import { redactText } from '../build/redactText.ts';

/**
 * The one door user-authored text passes through on its way into prose. Pure.
 *
 * Typed `(string) => string` over `redactText`'s `(unknown) => unknown` **without a cast**: the
 * fallback is the non-string branch `redactText` returns unchanged, and a non-string reaching a
 * template would render as `[object Object]` rather than as a credential.
 *
 * @throws nothing.
 */
export function narratable(value: string): string {
  const out = redactText(value);
  return typeof out === 'string' ? out : '';
}

/**
 * The display name of a city of this trip, **redacted for prose**. The only user-authored value
 * any sentence or `caveat.message` in `ask/` may interpolate.
 *
 * Falls back to the key — which `build/cityKey.ts` minted and no user typed — for a key the trip
 * does not carry, so a question about a city that is not on the trip still has a subject.
 *
 * @throws nothing.
 */
export function cityProse(trip: Trip, key: CityKey): string {
  const city = trip.cities.find((c) => c.key === key);
  return narratable(city ? city.name : key);
}
