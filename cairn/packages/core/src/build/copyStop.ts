/**
 * `copyStopInto` — the social primitive (ARCHITECTURE §2.14).
 *
 * Jacob's answer of 2026-08-25, in his words: *"They wouldn't import their trip — they would
 * build it on this app. This is a space for them to create their own itinerary — they could
 * even look at mine and just add a certain activity."* Whole-trip transfer is not the
 * primitive; **one stop is.** `importDoc` is backup and restore of your own exports, and
 * `forkTrip` is cut, not deferred.
 *
 * Seven rules, in §2.14's order. Rules 2 and 7 are the ones that matter:
 *
 *   1. **A new id, always.** Ids never cross trips. The source id survives only inside
 *      `origin`.
 *   2. **`provenance` is overwritten, never copied.** There is no code path in core that
 *      carries a source stop's provenance across a trip boundary — this function builds a
 *      fresh stamp from scratch, so `displayStatus()` returns `'imported'` from the instant
 *      the stop exists. There is no window in which it is unbadged.
 *   3. **`bookingId` is dropped and no `Ticket` travels.** A friend's booking reference is
 *      not yours, and their ticket URL is an access credential (§6.6). `cost` **crosses
 *      through `costForCopy`** (A-18, revision 14, QA R15-3 — it used to say "is copied", and
 *      that is the sentence the finding falsified), with `confidence` demoted.
 *   4. **A referenced `Place` is copied with it**, new id — otherwise the link dangles. An
 *      existing place in the target with the same name and coordinates in the same city is
 *      reused instead of duplicated. **Amended by A-14 (revision 12, QA R13-6):** the
 *      place's `cityKey` is this document's filing, not part of the place, so it is re-filed
 *      under the target's own city of that name — and if the target has no such city the
 *      place does not travel and the stop keeps the raw coordinate. See `refileCityKey`.
 *      **Amended again by A-16 (revision 13, QA R14-2):** re-filing by name is a derivation
 *      of city identity *across documents*, so it is the fallback and not the answer — when
 *      the source IS the target document and the target still holds that key, the place's
 *      own `cityKey` wins and no name is consulted. See `refileCityKey` step 2.
 *      **And by A-15 (revision 13, QA R14-4):** the row that gets pushed is built field by
 *      field by `placeForCopy`, never spread from the source. A `Place` crosses a person
 *      boundary exactly as a `Stop` does, so §6.6 applies to it: `note` and `hours.note` go
 *      through `redactText` and `links` are dropped entirely.
 *   5. `flags`, `name`, `category`, `durationMins` and `travelRole` copy verbatim — they
 *      describe a place and a journey, not a claim about the user. (`arrival` **left this
 *      list** in A-18: `MoveOverride.label` is free text, so `arrival` crosses through
 *      `arrivalForCopy`. `flags` stays, and that is not an omission — `flags` is a
 *      `STRUCTURAL_KEY` in `tools/redact.mjs`, so §6.6's sample path deliberately does not
 *      redact it either, and the two thresholds already agree.) `note` does NOT copy
 *      verbatim: it is prose, and prose is exactly where a door code or a booking
 *      confirmation number ends up. It is passed through `redactText` — the same pattern
 *      set §6.6 applies to a build artifact — before it crosses the trip boundary.
 *      BUILD-NOTES §1, KD-20 and KD-21 (KD-21: this file is why the example strings in
 *      `redactText.ts` had to stop being example strings — a docstring here is source that
 *      ships in a sourcemap the moment this module is part of `apps/web`'s build graph).
 *   6. **Accepting is a separate, explicit act** — `acceptCandidate` — and it preserves
 *      `origin`. `validateTrip` emits the error `origin_stripped` if anything removes it.
 *   7. **Credit survives acceptance.** `displayStatus` governs the badge; `attribution`
 *      governs the credit line, and every view that renders one renders the other.
 *
 * **§2.14 A-21 (revision 16, QA R17-1) — a file-wide rule, not five patched lines.**
 *
 * > Within one traversal, a field of a caller-supplied value is read exactly **once**. The value
 * > that was checked is the value that is used, compared, redacted and emitted.
 *
 * This file is the one place in the design where data crosses a *person* boundary, and the
 * discriminator between a safe and an unsafe double read is a judgment call — so this is not the
 * file to leave one in. The rule is stated for the whole file so that the **next** field added to
 * `Stop` inherits it, and so that a reviewer can check it in one pass: *"does any field of a
 * source record appear twice in this function?"* Two carve-outs are used deliberately and neither
 * is discretionary: a value **core itself constructed** from validated scalars is stable and may
 * be read freely, and a **discriminant tested against a closed set** where every branch builds a
 * fresh record may be read more than once, because the worst an unstable discriminant can then
 * produce is a well-formed record of the wrong variant — a hole, never a leak.
 *
 * What A-21 deliberately does **not** do here: it adds **no new defensive guard**. `src.links`
 * that is a truthy non-array still throws on `.map`, and `[...src.flags]` still throws on a
 * non-iterable, exactly as before. A-21 is about *which value crosses*, not about whether a
 * type-lie throws; the latter is R15-2's rule, whose scope A-20 fixed at `hours`.
 *
 * Pure apart from consuming ids from the injected factory.
 */
import type {
  CostEstimate, LatLng, Money, MoveOverride, OpeningHours, Place, PlaceLink, Provenance,
  ProvenanceConfidence, Stop, StopPlacement, Trip,
} from '../model/types.ts';
import type { IdFactory, IsoDate, PlaceId, StopId, UserId } from '../model/ids.ts';
import { addStop } from './stops.ts';
import type { StopInit } from './stops.ts';
import { REDACTED, redactText } from './redactText.ts';
import { requireActor } from './candidates.ts';
import { normalizeCityName } from '../model/cityName.ts';
import type { WeeklyEntry } from '../model/openingHours.ts';
import { readWeeklyEntry } from '../model/openingHours.ts';
import { TRANSIT_CITY_KEY } from '../model/ids.ts';

export type CopyStopSource = { trip: Trip; stopId: StopId };
export type CopyStopCtx = { ids: IdFactory; today: IsoDate; actorUserId: UserId };

/** You do not hold their document, so nothing copied is ever better attested than 'asserted'. */
function demote(c: ProvenanceConfidence): ProvenanceConfidence {
  return c === 'confirmed' ? 'asserted' : c;
}

function findAnywhere(trip: Trip, stopId: StopId): Stop | null {
  for (const d of trip.days) {
    const s = d.stops.find((x) => x.id === stopId);
    if (s) return s;
  }
  return trip.pool.find((x) => x.id === stopId) ?? null;
}

/**
 * `redactText` at the call sites where the model says `string` (§2.14 **A-18**, QA R15-1). Pure.
 *
 * **Never a cast.** `redactText` is typed `(unknown) => unknown` deliberately: a value the type
 * says is a `string` can still arrive non-string from a document built in memory past the type
 * system, and `redactText` returns a non-string **unchanged**. `redactText(x) as string`
 * therefore compiled cleanly while handing `{pin: '…'}` across the trip boundary whole, which is
 * exactly how R15-1 crossed — through `parsePlace`'s then-unvalidated `hours`, a hole **A-20 has
 * since closed** at the parser. The carrier is gone; the construction is still forbidden,
 * because the next unvalidated field will not announce itself. This fails closed instead, and
 * never throws. It replaces every `as string` in this file, and
 * `copyStop.test.ts`'s R16-1 rider pins that for `Place.note`.
 */
function redacted(s: string): string {
  const out = redactText(s);
  return typeof out === 'string' ? out : REDACTED;
}

/**
 * §2.14 **A-18** — what of a `CostEstimate` may cross a trip boundary. Pure.
 *
 *   - `amounts` — rebuilt entry by entry, **field by field**. Rule 3's *"the money is a
 *     description of the world"* holds for all four: two numbers, an ISO code and an enum.
 *     Field by field because the spread is the construction that produced R14-4 and R15-1,
 *     not because `parseMoney` is suspect.
 *   - `display` — kept only when `redactText` leaves it **byte-identical**, otherwise `null`.
 *     It is a text box the user types into, so it can hold a credential — *and* it is a price,
 *     and `[redacted] HUF` is a number that is not a number. `amounts` crosses intact and
 *     `costLabel` derives the figure from `amounts` whenever `display` is falsy, so the hole is
 *     filled with a correct cost rather than a redaction marker. A non-string `display` yields
 *     `REDACTED !== c.display` and therefore `null`: fails closed, no throw, no cast.
 *   - `note` — `redacted`, key present only if the source had one. Prose keeps its meaning
 *     around a `[redacted]`; a price does not, which is the whole reason the two rows differ.
 *
 * The `Array.isArray` guard on `amounts` is R15-2's lesson, not distrust of `parseCost`: the
 * crash R15-2 filed was `.map` on a field a *document* is free to send as something else.
 *
 * **A-21:** each field is read into a local **once**. `display` was read four times — the `null`
 * test, `redacted(c.display)`, the `===` comparison and the value emitted — which is R17-1's leak
 * on A-18's own field, by A-18's own construction; and `amounts` was read twice, so
 * `Array.isArray` and `.map` could see different values and raise a `TypeError` out of
 * `copyStopInto`.
 */
function costForCopy(c: CostEstimate): CostEstimate {
  const rawAmounts: unknown = c.amounts;
  const display: string | null = c.display;
  const note: string | undefined = c.note;
  const amounts: Money[] = Array.isArray(rawAmounts) ? rawAmounts : [];
  return {
    amounts: amounts.map((a) => ({ lo: a.lo, hi: a.hi, currency: a.currency, basis: a.basis })),
    display: display === null ? null : redacted(display) === display ? display : null,
    ...(note === undefined ? {} : { note: redacted(note) }),
  };
}

/**
 * §2.14 **A-18** — what of a `MoveOverride` may cross a trip boundary. Pure.
 *
 * `mode` is an enum and `mins` is a number, so both cross verbatim. `label` is free text —
 * §6.6's deep pass already redacts it on the sample path, because `label` is not a
 * `STRUCTURAL_KEY` — so *"Bus 8, booking XX00XX0X"* crosses as *"Bus 8, [redacted]"*: the part
 * that describes the journey survives, which is the difference from `display`.
 */
function arrivalForCopy(a: MoveOverride): MoveOverride {
  // A-21: `label` was the SAFE double-read form (read 2 goes through `redacted`, which is total
  // and fails closed), and it is hoisted anyway — the rule for this file is only checkable if it
  // is TOTAL. "Every field of every record this function reads, once" is a property a reviewer
  // verifies in one pass; "every field except the ones we judged safe" is a judgment call.
  const label: string | undefined = a.label;
  return { mode: a.mode, mins: a.mins, ...(label === undefined ? {} : { label: redacted(label) }) };
}

/**
 * One `hours.weekly` entry, rebuilt field by field (§2.14 **A-18**, QA R15-1; narrowed by
 * **A-20**, QA R16-2). Pure, and never throws.
 *
 * `{ ...w }` copied whatever keys the entry actually held, so a `note` and an `href` on a weekly
 * entry carried a door PIN, a confirmation number, a mailbox address and a vendor voucher URL
 * across the trip boundary. A field nobody named does not travel; enumeration stops at a
 * **scalar**, never at a field name.
 *
 * **The structural half of the question is no longer asked here.** It is `readWeeklyEntry`,
 * shared with `fromJSON` and `validateTrip`, because R16-2 was three definitions of "well-formed"
 * and no two agreeing. **A-21 (revision 16, QA R17-1)** made that reader hand back *what it read*
 * instead of a boolean: this function used to read `open` four times and `close` four times, and
 * an accessor property returns a different value on each, so the entry that passed the check was
 * not the entry that crossed — R15-1's exact harm, on the boundary A-18 closed. Now the three
 * scalars come out of the reader and nothing re-reads the caller's object.
 *
 * This function's own contribution is one line, and it is a **copy-boundary
 * policy, not a shape test**: an opening time that redaction would alter is not a time the
 * recipient could trust, and `null` — `OpeningHours`' own specified unknown (*"Missing day =
 * unknown, never a conflict"*) — is the honest answer rather than a `[redacted]` opening time,
 * which is A-18's `display` argument one record over. That arm is **provably unreachable for a
 * structurally valid entry**: all 11 000 strings `isClockTime` accepts are byte-identical under
 * `redactText`, pinned exhaustively in `test/openingHours.test.ts` (A-20 Part 5(a)). It stays
 * because it is what makes the day someone adds a `REDACTION_PATTERN` that breaks that an
 * architect's problem — a red test — instead of a silent `null`.
 */
function weeklyForCopy(w: unknown): WeeklyEntry | null {
  const read = readWeeklyEntry(w);
  if (read.kind !== 'entry') return null;
  const { day, open, close } = read.entry;
  // A-18 policy, NOT a shape test: an opening time that redaction would alter is not a time the
  // recipient could trust. Provably unreachable for a structurally valid entry — A-20 Part 5(a).
  if (redacted(open) !== open || redacted(close) !== close) return null;
  // Rebuilt, not `return read.entry`: three scalars cost nothing, and the copy must not become
  // aliased to the reader's return value if the reader is ever changed to hand back its input.
  return { day, open, close };
}

/**
 * §2.14 **A-15** and **A-18** — what of an `OpeningHours` may cross a boundary. Pure, and
 * **never throws** (QA R15-2).
 *
 * The parameter is typed `OpeningHours` and is treated as `unknown`, because that is what it
 * actually is. `fromJSON` used to accept `hours` as `{}`, a string, a number, an array, `null`
 * and `{weekly: 'mon-fri'}`, and `p.hours.weekly.map(...)` threw a raw `TypeError` on all six —
 * core throwing on a *document shape* rather than on programmer error (§2.1).
 *
 * **A-20 closed the parser hole and this guard still stays**, deliberately: the copy may not
 * throw on an **in-memory** document that never went through the parser (a cast, a future
 * untyped writer, a native bridge), and R15-2's closure is not reopened by a ruling about
 * `fromJSON`. Anything that is not a well-formed weekly array becomes an empty one: a hole,
 * never an invented opening time. `validateTrip` reports such a document separately
 * (`place_hours_malformed`), which is the half of R15-2 that answers *"nothing warns the user
 * first"* — and which A-20 ratified as exactly that report.
 */
function hoursForCopy(h: OpeningHours): OpeningHours {
  const raw = h as unknown;
  // `note` is declared `string` here for the same reason the model declares it one — and
  // `redacted` is written not to believe it. `weekly` is `unknown` because nothing downstream
  // may treat it as an array before `Array.isArray` has said so. Neither is an `as string`.
  const o = (raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as {
    weekly?: unknown;
    note?: string;
  };
  // A-21: one read each. `weekly` was read twice — `Array.isArray` said "array" and `.map` then
  // met a string, which is `TypeError: o.weekly.map is not a function` out of a function this
  // docstring says never throws, i.e. R15-2's closure reopened on a getter.
  const weekly: unknown = o.weekly;
  const note: string | undefined = o.note;
  return {
    weekly: Array.isArray(weekly) ? weekly.map(weeklyForCopy) : [],
    ...(note === undefined ? {} : { note: redacted(note) }),
  };
}

/** Same name, same city, same coordinates to ~1 m — the same place. Pure. */
function samePlace(a: Place, b: { cityKey: string; name: string; at: Place['at'] }): boolean {
  if (a.cityKey !== b.cityKey) return false;
  if (a.name.trim().toLowerCase() !== b.name.trim().toLowerCase()) return false;
  if (a.at === null || b.at === null) return a.at === b.at;
  return Math.abs(a.at.lat - b.at.lat) < 1e-5 && Math.abs(a.at.lng - b.at.lng) < 1e-5;
}

/**
 * A-14 (revision 12, QA R13-6) — steps 1 and 2 of rule 4's three-step decision.
 *
 * A `CityKey` answers *"which city **of this trip** is this filed under"*. It is minted by
 * and meaningful only inside one document (A-10), so it does not travel with the record:
 * when a place crosses a trip boundary it is **re-filed in the target's terms, or it does
 * not cross**.
 *
 *   1. Find the source's city by key. No such city and there is nothing to match on →
 *      `null`, i.e. step 3. This stays FIRST: a place filed under a key its own document
 *      cannot resolve has no city, `validateTrip` reports that as `unknown_city_key` (an
 *      error), and a copy may not paper over it by inventing one — even within one trip.
 *   2. **A-16 (revision 13, QA R14-2) — the source's own key wins when the source IS the
 *      target document and the target still holds that key.** Re-filing by name is a
 *      derivation of city identity *across* documents, and a derivation is only for the case
 *      where the primary answer is missing; when the source is the target, the primary answer
 *      is right there, because the target is the document that minted the key. No name is
 *      consulted here, so a blank name, a duplicate name and a missing `String.normalize` are
 *      all irrelevant on this path. Both conjuncts are load-bearing: `source.id === target.id`
 *      rather than `source === target` because the reducer applies the action to the store's
 *      current document while the UI passes whatever object it rendered from (a different
 *      object for the same document after any `openTrip` or dispatch); and the key is checked
 *      against `target`, not `source`, because `source.trip` is a snapshot and §0.6 is the
 *      rule that snapshots go stale — a stale source falls through to name matching, and then
 *      to step 3. A hole, never a wrong filing.
 *   3. Otherwise fold the source city's name. A name that folds to `''` is not an identity,
 *      so there is nothing to match on → `null`, i.e. step 3.
 *   4. Every city in the target whose folded name equals it is a candidate. The lowest
 *      `order` wins, ties broken by position in `target.cities` — a trip may legitimately
 *      hold two cities of the same name (A-10 blesses that) and the answer must not depend
 *      on which one the scan happened to reach first.
 *
 * Returns the target's key, or `null` when the place must not travel. Pure.
 */
function refileCityKey(source: Trip, target: Trip, cityKey: string): string | null {
  const sourceCity = source.cities.find((c) => c.key === cityKey);
  if (!sourceCity) return null;
  // A-16 step 2. A `CityKey` means nothing outside the document that minted it (A-10), so a
  // bare key match between two documents is a coincidence — every deterministic IdFactory in
  // this repo mints `city-1` in every document it builds. The same-document conjunct is what
  // turns key equality into an identity.
  if (source.id === target.id && target.cities.some((c) => c.key === cityKey)) return cityKey;
  const wanted = normalizeCityName(sourceCity.name);
  if (wanted === '') return null;

  let best: { key: string; order: number } | null = null;
  for (const c of target.cities) {
    if (normalizeCityName(c.name) !== wanted) continue;
    if (best === null || c.order < best.order) best = { key: c.key, order: c.order };
  }
  return best === null ? null : best.key;
}

/**
 * §2.14 **A-15** (revision 13, QA R14-4) — what of a `Place` may cross a trip boundary. Pure.
 *
 * *A string's classification does not change because of which record it is attached to.* A
 * door PIN in `Place.note` is the same credential as a door PIN in `Stop.note`, and §6.6 has
 * classified `Place.note` as free text since revision 2. If anything the copied place is the
 * worse carrier of the two: **a `Place` has no provenance** (A-6). The copied stop is stamped
 * `source:'friend'`, badged `'imported'` from the instant it exists and carries `attribution`
 * every view must render; the place beside it is badged by nothing, credited to nobody, and
 * the recipient never chose it — it rode along.
 *
 * This function exists in this shape because the two places in this system that decide what
 * may leave a document used to fail in opposite directions: §6.6's sample path fails **closed**
 * (redact every string except the structural ones, so a field added later is redacted by
 * default), while the copy path failed **open** (enumerate fields, and a field nobody
 * enumerated travels verbatim). So there is **no spread of a source `Place` into the target
 * document** anywhere below, and every field is classified:
 *
 *   - `id`       — a fresh one from the injected factory. Rule 1: ids never cross trips.
 *   - `cityKey`  — the re-filed key (A-14 step 2, A-16).
 *   - `name`     — verbatim. A place's name is a description of the world; rule 5 treats
 *                  `Stop.name` identically and §6.6 does not classify a name as free text.
 *   - `at`       — cloned, or `null`. Two documents may not share one mutable `LatLng`.
 *   - `category` — verbatim. An enum.
 *   - `note`     — `redactText`, and the key is present only if the source had one.
 *   - `links`    — **dropped entirely, key absent.** A `Link` is `{label, href}` and the href
 *                  is the entire payload, so a redacted href is a control that renders and
 *                  navigates nowhere — a confident wrong answer where a hole is honest. Rule 3
 *                  already decided this class (*"their ticket URL is an access credential"*),
 *                  and a vendor voucher URL does not become safe by being filed one record
 *                  further away from the stop. It also makes rule 4's two branches agree: the
 *                  reuse branch already gives the recipient no new links.
 *   - `hours`    — key present only if the source had one; `hoursForCopy`, which rebuilds each
 *                  `weekly` entry **field by field** (A-18, QA R15-1: `{...w}` was the one
 *                  surviving spread, over a field `parsePlace` did not then validate — A-20 has
 *                  since made it validate it, and the rebuild stays) and runs
 *                  `hours.note` through `redacted`, because opening times are a description of
 *                  the world and the note beside them is free text.
 *
 * A ninth field on `Place` must be classified here and in `copyStop.test.ts`'s key-set test,
 * which is the mechanical form of §6.6's *"redacted by default rather than leaking by
 * default"* inside a typed record.
 */
function placeForCopy(p: Place, cityKey: string, id: PlaceId): Place {
  // A-21: one read per field. `at` was read three times — the `null` test, `.lat` and `.lng` —
  // so a getter whose second read was `null` produced `Cannot read properties of null (reading
  // 'lat')` out of `copyStopInto`.
  const at: LatLng | null = p.at;
  const note: string | undefined = p.note;
  const hours: OpeningHours | undefined = p.hours;
  return {
    id,
    cityKey,
    name: p.name,
    at: at === null ? null : { lat: at.lat, lng: at.lng },
    category: p.category,
    ...(note === undefined ? {} : { note: redacted(note) }),
    ...(hours === undefined ? {} : { hours: hoursForCopy(hours) }),
  };
}

/**
 * Copies one stop from `source.trip` into `target`, stamped as the friend's.
 *
 * The source may be the target: copying inside one trip is a copy, not an alias, and the
 * credit then names that trip. **The credit points at the trip the stop was copied FROM,
 * not at the head of a chain** — if Marta's stop reached Jacob and Sam copies it from
 * Jacob, Sam's credit says Jacob, because Jacob is who Sam got it from.
 *
 * @throws {TypeError} if `ctx.actorUserId` is missing (`null`, `undefined` or `''`) — §2.14, R2-11.
 * @throws {Error} if the stop or the target day does not exist — programmer error, §2.1.
 * @throws {Error} if a `{kind:'pool'}` placement names a city the target does not have and
 *   which is not `TRANSIT_CITY_KEY` — A-19. A placement is an argument, so a caller naming a
 *   city the target lacks has made the same mistake as one naming a day it lacks. Nothing here
 *   throws because of what a *document* contains; that is R15-2's rule and it stands.
 */
export function copyStopInto(
  target: Trip,
  source: CopyStopSource,
  placement: StopPlacement,
  ctx: CopyStopCtx,
): Trip {
  // R2-11 (§2.14, revision 4): `ctx.actorUserId` was already non-nullable in the TYPE and
  // unchecked at runtime, and R2-11 went straight through it. Checked first, before anything
  // is copied, so nothing is partially mutated behind the exception.
  const actorUserId = requireActor('copyStopInto', ctx.actorUserId);
  const src = findAnywhere(source.trip, source.stopId);
  if (!src) throw new Error(`copyStopInto: no such stop ${source.stopId} in ${source.trip.id}`);
  // A-19 (revision 14, QA R15-6). A `placement` is not a record that crosses: it is an ARGUMENT
  // the caller supplies about the TARGET, in the same position and with the same authority as
  // `placement.dayId`. So it is validated exactly as `dayId` is and never re-filed — the primary
  // answer is never missing, because the caller holds the target document, and deriving one
  // inside core would write a filing nothing badges (the guess A-14 refused, from the other
  // side). `TRANSIT_CITY_KEY` is exempt because `validateTrip` exempts it and because it is the
  // designed "belongs to no city" group — the one honest answer a caller with no city of the
  // target can give. Checked before anything is copied, so nothing is partially built behind it.
  //
  // A-19 parts 2 and 3, and A-18 position 2 (*no spread of a source record into the target
  // document, at any depth*) applied to the one record the CALLER owns. `makeStop` assigns
  // `placement` as given and `reindex` keeps that same object when the order already matches, so
  // the natural call — `copyStopInto(target, src, srcStop.placement, ctx)`, "copy it where it
  // already sits" — aliased one mutable object into two documents. That is R14-3 one field over.
  //
  // The asymmetry between the throw and the dropped `hint` is the ruling, not an
  // inconsistency: a REQUIRED field with no honest unknown is refused; an OPTIONAL field with a
  // specified fallback becomes the hole. A hint naming the SOURCE's day is a fact about a
  // document the recipient does not have, and carried across it makes their "Add to the plan"
  // throw `scheduleFromPool: no such day`. Without it, `scheduleFromPool` falls back to
  // `pickDay` + `CAT_DEFAULT_TIME`, which is fully specified.
  //
  // **A-21 Part 4(c).** `placement.cityKey` was validated against `target.cities` and then a
  // SECOND read of it was emitted into the document — the banned form, even though A-19
  // classifies a `placement` as an argument rather than a document, because the throw and the
  // emission could then see different values and the recipient inherits `pool_stop_unknown_city`,
  // the uncleanable issue A-19 exists to prevent. The two validation throws and the rebuilt
  // `placed` merge into one branch on the discriminant so that each field is read once.
  // **A-19's rules are otherwise untouched: same throws, same messages, same `TRANSIT_CITY_KEY`
  // exemption, same dropped-hint fallback.** `placement.kind` is read once per branch rather than
  // hoisted, because hoisting a discriminant into a `const` loses TypeScript's narrowing and
  // would put back the very casts A-21 removes — that is what the discriminant carve-out is for.
  // The two throws are now in mutually exclusive branches, which is unobservable: they were
  // already mutually exclusive by `kind`.
  let placed: StopPlacement;
  if (placement.kind === 'scheduled') {
    const dayId = placement.dayId;
    const time = placement.time;
    const order = placement.order;
    if (!target.days.some((d) => d.id === dayId)) {
      throw new Error(`copyStopInto: no such day ${dayId} in ${target.id}`);
    }
    placed = { kind: 'scheduled', dayId, time, order };
  } else {
    const cityKey = placement.cityKey;
    const h = placement.hint;
    if (cityKey !== TRANSIT_CITY_KEY && !target.cities.some((c) => c.key === cityKey)) {
      throw new Error(`copyStopInto: no such city ${cityKey} in ${target.id}`);
    }
    // One read per hint field, into an object core owns. Everything below reads THAT object,
    // which is stable by construction — the carve-out, used deliberately.
    const hintFields = h === undefined ? undefined : { dayId: h.dayId, time: h.time, order: h.order };
    const hint =
      hintFields !== undefined && target.days.some((d) => d.id === hintFields.dayId)
        ? { dayId: hintFields.dayId, time: hintFields.time,
            ...(hintFields.order === undefined ? {} : { order: hintFields.order }) }
        : undefined;
    placed = { kind: 'pool', cityKey, ...(hint ? { hint } : {}) };
  }

  // Rule 2 — built from scratch, never spread from the source.
  const confidence: ProvenanceConfidence = src.provenance.confidence;   // A-21: one read.
  const provenance: Provenance = {
    source: 'friend',
    state: 'candidate',
    confidence: demote(confidence),
    origin: {
      friendUserId: source.trip.ownerId,
      sourceTripId: source.trip.id,
      sourceStopId: src.id,
    },
    addedAt: ctx.today,
    acceptedAt: null,
    actorUserId,
  };

  // Rule 4 — the place travels RE-FILED under the target's own city, or an equivalent one in
  // the target is reused, or it does not travel at all and the coordinate goes instead.
  const srcPlace: PlaceLink = src.place;   // A-21: ONE read of the field.
  let withPlace = target;
  // R14-3: the initial value must be a CLONE, not the source's own `PlaceLink`. Aliasing it
  // left the two documents sharing one `PlaceLink` object — and, for `{kind:'inline'}`, one
  // mutable `LatLng` — which is the same purity defect A-14's own step-3 branch below already
  // avoids. The `{kind:'place'}` case is fully replaced by the block below, in every branch.
  //
  // **A-21:** the hole is the DEFAULT, and every branch below overwrites it deliberately. It used
  // to be `: src.place` — so a cast-built link with an out-of-union `kind` put the SOURCE's own
  // object, with every key it carried, into the target document. A-18 position 2 forbids a spread
  // of a source record at any depth; an alias of one is worse, and this was the only one left.
  // `srcPlace.kind` is read in two tests, which the discriminant carve-out permits: each branch
  // constructs a fresh record and the worst an unstable `kind` yields is `{kind:'none'}`, a hole.
  let place: PlaceLink = { kind: 'none' };
  if (srcPlace.kind === 'inline') {
    place = { kind: 'inline', at: { lat: srcPlace.at.lat, lng: srcPlace.at.lng } };
  } else if (srcPlace.kind === 'place') {
    // `srcPlace.placeId` is read once, as a lookup KEY against the source-side row, which
    // `placeForCopy` then rebuilds field by field. The `as {placeId: string}` cast is gone —
    // narrowing a `const` of a discriminated union needs none.
    const original = source.trip.places.find((p) => p.id === srcPlace.placeId);
    // `original` missing → `place` stays `{kind:'none'}`: the source's own link dangled, and we
    // do not invent one. Everything below is A-14/A-15/A-16, unchanged.
    if (original) {
      const targetKey = refileCityKey(source.trip, target, original.cityKey);
      if (targetKey === null) {
        // A-14 step 3 — no city in the target answers to the source city's name, so there is
        // nothing to file this place under and every alternative writes a guess into the
        // document. The stop keeps the coordinate; no `Place` row is added and `cities` is
        // untouched.
        place = original.at === null
          ? { kind: 'none' }
          : { kind: 'inline', at: { lat: original.at.lat, lng: original.at.lng } };
      } else {
        // `refiled` is the PROBE the reuse search compares against — `samePlace` reads
        // `cityKey`, `name` and `at`, none of which A-15 changes, so reuse decisions are
        // bit-for-bit what A-14 left. It is no longer the thing that gets pushed, and it is
        // built from the three fields `samePlace` actually reads rather than spread from
        // `original`, so A-18 position 2's *"no spread of a source record"* holds for the whole
        // file rather than for the paths that write.
        const refiled = { cityKey: targetKey, name: original.name, at: original.at };
        const existing = target.places.find((p) => samePlace(p, refiled));
        if (existing) {
          // The reuse branch needs nothing from A-15: no field of the source place crosses at
          // all, and the row the recipient keeps is their own.
          place = { kind: 'place', placeId: existing.id };
        } else {
          // A-15: built field by field, never spread. §6.6 applies to a `Place` that crosses a
          // person boundary exactly as it applies to the stop beside it.
          const copy = placeForCopy(original, targetKey, ctx.ids.newId('place'));
          withPlace = { ...target, places: [...target.places, copy] };
          place = { kind: 'place', placeId: copy.id };
        }
      }
    }
  }

  // A-21, the file-wide rule applied to the source stop itself: every field of `src` is read
  // into a `const` ONCE, ahead of the literal. `cost`, `arrival` and `links` were each read
  // twice — a truthiness test and then the value passed on — which is the banned form: the value
  // that was tested is not necessarily the value that crosses. The rest are already single-read
  // and are hoisted anyway, so that the NEXT field added to `Stop` inherits the rule rather than
  // having to rediscover it.
  const name = src.name;
  const category = src.category;
  const note = src.note;
  const cost: Stop['cost'] = src.cost;
  const arrival: Stop['arrival'] = src.arrival;
  const travelRole = src.travelRole;
  const flags = src.flags;
  const links: Stop['links'] = src.links;
  const durationMins = src.durationMins;

  const init: StopInit = {
    id: ctx.ids.newId('stop'),
    name,
    category,
    place,
    // Rule 5 amended, BUILD-NOTES §1 KD-20: free text is where the leak was. `note` is prose
    // someone typed, and prose is exactly where a door PIN or a booking confirmation ends up.
    // Run it through the same pattern set §6.6 uses.
    note: redacted(note),
    // Rule 3 amended by A-18 (revision 14, QA R15-3) — the money is a description of the world;
    // the booking and the ticket are not, and NEITHER IS THE PROSE BESIDE THE MONEY. `cost.note`
    // and `arrival.label` are free text nested one record inward, and a field list is only
    // exhaustive down to the depth it recurses: naming `cost` in rule 3 says which FIELDS travel,
    // not which STRINGS do. §6.6's sample path redacts both today, so the two thresholds
    // disagreed about exactly these two strings — the "sample fails closed, copy fails open"
    // asymmetry A-15 called the finding, reproduced one record inward.
    cost: cost ? costForCopy(cost) : null,
    arrival: arrival ? arrivalForCopy(arrival) : null,
    travelRole,
    bookingId: null,
    flags: [...flags],
    provenance,
    durationMins,
    // A-18 position 2: same policy, different construction. A-15's disclosed residue stands —
    // a `Stop`'s links still travel, with the same reopening trigger (*the day anything writes
    // `Stop.links` from a source the user did not type*) — but `{ ...l }` is a spread of a source
    // record, and *no record that crosses the trip boundary is copied by spread, at any depth*
    // admits no exceptions. `qa/r2-copy.mjs` §H, which asserts two order-shaped hrefs travel, is
    // the policy this deliberately does not change.
    ...(links ? { links: links.map((l) => ({ label: l.label, href: l.href })) } : {}),
    // no `ticket`: §6.6, a ticket is an access credential
  };

  // `addStop` bumps the revision once, which is the whole operation.
  return addStop(withPlace, placed, init, {
    ids: ctx.ids,
    now: ctx.today,
    actorUserId: ctx.actorUserId,
  });
}
