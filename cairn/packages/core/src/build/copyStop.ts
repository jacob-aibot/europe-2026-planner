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
 *      not yours, and their ticket URL is an access credential (§6.6). `cost` is copied,
 *      with `confidence` demoted.
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
 *   5. `flags`, `name`, `category`, `durationMins`, `arrival` and `travelRole` copy verbatim
 *      — they describe a place and a journey, not a claim about the user. `note` does NOT
 *      copy verbatim: it is prose, and prose is exactly where a door code or a booking
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
 * Pure apart from consuming ids from the injected factory.
 */
import type { Place, PlaceLink, Provenance, ProvenanceConfidence, Stop, StopPlacement, Trip } from '../model/types.ts';
import type { IdFactory, IsoDate, PlaceId, StopId, UserId } from '../model/ids.ts';
import { addStop } from './stops.ts';
import type { StopInit } from './stops.ts';
import { redactText } from './redactText.ts';
import { requireActor } from './candidates.ts';
import { normalizeCityName } from '../model/cityName.ts';

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
 *   - `hours`    — key present only if the source had one; `weekly` cloned entry by entry;
 *                  `hours.note` through `redactText`, because opening times are a description
 *                  of the world and the note beside them is free text.
 *
 * A ninth field on `Place` must be classified here and in `copyStop.test.ts`'s key-set test,
 * which is the mechanical form of §6.6's *"redacted by default rather than leaking by
 * default"* inside a typed record.
 */
function placeForCopy(p: Place, cityKey: string, id: PlaceId): Place {
  return {
    id,
    cityKey,
    name: p.name,
    at: p.at === null ? null : { lat: p.at.lat, lng: p.at.lng },
    category: p.category,
    ...(p.note === undefined ? {} : { note: redactText(p.note) as string }),
    ...(p.hours === undefined
      ? {}
      : {
        hours: {
          weekly: p.hours.weekly.map((w) => (w === null ? null : { ...w })),
          ...(p.hours.note === undefined ? {} : { note: redactText(p.hours.note) as string }),
        },
      }),
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
  if (placement.kind === 'scheduled' && !target.days.some((d) => d.id === placement.dayId)) {
    throw new Error(`copyStopInto: no such day ${placement.dayId} in ${target.id}`);
  }

  // Rule 2 — built from scratch, never spread from the source.
  const provenance: Provenance = {
    source: 'friend',
    state: 'candidate',
    confidence: demote(src.provenance.confidence),
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
  let withPlace = target;
  // R14-3: the initial value must be a CLONE, not the source's own `PlaceLink`. Aliasing it
  // left the two documents sharing one `PlaceLink` object — and, for `{kind:'inline'}`, one
  // mutable `LatLng` — which is the same purity defect A-14's own step-3 branch below already
  // avoids. The `{kind:'place'}` case is fully replaced by the block below, in every branch.
  let place: PlaceLink =
    src.place.kind === 'inline'
      ? { kind: 'inline', at: { ...src.place.at } }
      : src.place.kind === 'none'
        ? { kind: 'none' }
        : src.place;
  if (src.place.kind === 'place') {
    const original = source.trip.places.find((p) => p.id === (src.place as { placeId: string }).placeId);
    if (!original) {
      place = { kind: 'none' }; // the source's own link dangled; do not invent one
    } else {
      const targetKey = refileCityKey(source.trip, target, original.cityKey);
      if (targetKey === null) {
        // A-14 step 3 — no city in the target answers to the source city's name, so there is
        // nothing to file this place under and every alternative writes a guess into the
        // document. The stop keeps the coordinate; no `Place` row is added and `cities` is
        // untouched.
        place = original.at === null ? { kind: 'none' } : { kind: 'inline', at: { ...original.at } };
      } else {
        // `refiled` is the PROBE the reuse search compares against — `samePlace` reads
        // `cityKey`, `name` and `at`, none of which A-15 changes, so reuse decisions are
        // bit-for-bit what A-14 left. It is no longer the thing that gets pushed.
        const refiled = { ...original, cityKey: targetKey };
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

  const init: StopInit = {
    id: ctx.ids.newId('stop'),
    name: src.name,
    category: src.category,
    place,
    // Rule 5 amended, BUILD-NOTES §1 KD-20: free text is where the leak was. `note` is prose
    // someone typed, and prose is exactly where a door PIN or a booking confirmation ends up.
    // Run it through the same pattern set §6.6 uses.
    note: redactText(src.note) as string,
    // Rule 3 — the money is a description of the world; the booking and the ticket are not.
    cost: src.cost ? { ...src.cost, amounts: src.cost.amounts.map((a) => ({ ...a })) } : null,
    arrival: src.arrival ? { ...src.arrival } : null,
    travelRole: src.travelRole,
    bookingId: null,
    flags: [...src.flags],
    provenance,
    durationMins: src.durationMins,
    ...(src.links ? { links: src.links.map((l) => ({ ...l })) } : {}),
    // no `ticket`: §6.6, a ticket is an access credential
  };

  // `addStop` bumps the revision once, which is the whole operation.
  return addStop(withPlace, placement, init, {
    ids: ctx.ids,
    now: ctx.today,
    actorUserId: ctx.actorUserId,
  });
}
