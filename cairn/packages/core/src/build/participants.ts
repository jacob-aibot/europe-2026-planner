/**
 * Participant editing (ARCHITECTURE **§8.3**, ROADMAP Phase 2 **I-9**).
 *
 * Three build functions in the shape §2.1 requires of every one: `(trip, args) => Trip`, pure,
 * immutable, `revision` bumped **once** each. One core function per action, which is what §4.2
 * rule 1 needs from the reducer's side — `packages/client`'s `ACTION_SPECS` resolves
 * `core[spec.coreFn]` off the index and holds no domain logic of its own.
 *
 * **Participation grants nothing** (§8.3). Nothing in this file touches `access/predicates.ts`,
 * `TripMember`, `TripShare` or a coordinate, and nothing may: a participant is a statement about
 * who was on the trip and not a grant of anything. The record is **embedded in the trip
 * document** rather than kept as a second persisted structure — §8.3 refuses that as §2.7
 * **A-5**'s rejected option — which is why deletion, undo and export parity need no code here.
 *
 * **What is deliberately not enforced here:** *at most one `'self'`*, and id uniqueness across
 * the list. Both are `validateTrip`'s (§2.9's standing rule — a document that already carries
 * one must **open**, so the user can see it and act), and neither is reachable from these three
 * functions anyway: the id comes from the injected factory and nothing else.
 */
import type { Participant, ParticipantKind, Trip } from '../model/types.ts';
import type { ParticipantId } from '../model/ids.ts';
import type { BuildCtx } from './createTrip.ts';

/**
 * What a caller may supply when adding a participant.
 *
 * **There is no `id` and no `userId`, and both omissions are load-bearing.**
 *
 * - `id` is minted from the injected `IdFactory`, exactly as every other id in core is. Letting
 *   a caller choose one is the only path by which a shipped build could mint the duplicate
 *   `validateTrip` reports, so it is closed rather than checked.
 * - `userId` is `null` until Phase 3 (§8.3). A caller that could supply one could claim a
 *   participant *is* an account holder with nothing having linked them, which is the assertion
 *   §8.7's five separate edges exist to stop anyone making by accident.
 */
export type ParticipantInit = {
  displayName: string;
  /** Defaults to `'contact'`. `'self'` is the owner in their own list and must be explicit. */
  kind?: ParticipantKind;
  note?: string;
};

/**
 * Adds a participant to the end of the list. **Grants them nothing** (§8.3). Pure apart from
 * consuming one id from the injected factory.
 *
 * Every field is written by name — no spread of `init` — so an unenumerated key on an untyped
 * caller's object cannot reach the document (§2.14 **A-18**'s rule, applied to a record class on
 * the day it is added rather than after a finding).
 */
export function addParticipant(trip: Trip, init: ParticipantInit, ctx: BuildCtx): Trip {
  const participant: Participant = {
    id: ctx.ids.newId('participant'),
    displayName: init.displayName,
    kind: init.kind ?? 'contact',
    // §8.3: permanently `null` in this phase, and not readable from `init` at all. This is the
    // enforcement of "until that person has an account AND the user links them".
    userId: null,
    ...(init.note !== undefined ? { note: init.note } : {}),
  };
  return { ...trip, participants: [...trip.participants, participant], revision: trip.revision + 1 };
}

export type ParticipantPatch = {
  displayName?: string;
  kind?: ParticipantKind;
  note?: string;
};

/**
 * Keys a patch may never carry — `updateStop`'s `FORBIDDEN_PATCH_KEYS` and `updatePhoto`'s
 * `FORBIDDEN_PHOTO_PATCH_KEYS`, one record over, and for §2.1's reason: *"every `*Patch` type is
 * enforced at runtime by an explicit key allowlist, not by TypeScript"*, because every caller
 * that matters is `any`-shaped at its boundary (an action, a form, a JSON body).
 *
 * - `id` is a participant's identity and rewriting it is how a duplicate is minted.
 * - `userId` is the link to an account and **there is no transition for it in this phase**
 *   (§8.3). Linking a participant to a person is Phase 3's, with whatever confirmation that
 *   turns out to need; a patch key would let it happen silently in the meantime.
 */
const FORBIDDEN_PARTICIPANT_PATCH_KEYS = ['id', 'userId'] as const;

/** @throws {Error} on any forbidden key, present even with an `undefined` value. */
function assertPatchable(patch: object): void {
  for (const k of FORBIDDEN_PARTICIPANT_PATCH_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      throw new Error(
        `updateParticipant: "${k}" may not be patched — ` +
          (k === 'id'
            ? 'a participant id is immutable, and rewriting one is how a duplicate is minted'
            : 'linking a participant to an account is Phase 3\'s, not a patch (ARCHITECTURE §8.3). ' +
              'The field is carried and round-trips; nothing in this phase may fill it'),
      );
    }
  }
}

/**
 * Patches a participant's name, kind or note. Pure.
 *
 * It does **not** refuse a second `'self'`: §8.3 puts that check on `validateTrip`'s mechanism,
 * and a build function that threw would make the state unreachable rather than reportable —
 * which is the wrong half of §2.1's split for a fact about a document.
 *
 * @throws {Error} if no participant with that id exists, or if the patch carries a forbidden
 *         key — both programmer error, per §2.1.
 */
export function updateParticipant(trip: Trip, participantId: ParticipantId, patch: ParticipantPatch): Trip {
  assertPatchable(patch);
  const i = trip.participants.findIndex((p) => p.id === participantId);
  if (i < 0) throw new Error(`updateParticipant: no such participant ${participantId}`);
  const participants = trip.participants.slice();
  participants[i] = { ...participants[i], ...patch };
  return { ...trip, participants, revision: trip.revision + 1 };
}

/**
 * Removes a participant. Pure.
 *
 * **Nothing cascades**, and that is the whole of §8.3's *"deletion … comes for free"*: no stop,
 * day, place, booking or photo refers to a participant in this phase (participants on a *stop*
 * are named as not-in-this-phase), so there is no second structure to keep in step and no
 * reference count to take. If a later phase adds a referent, this is the function that gains the
 * repair — and a builder who finds one has found an architect's ruling, not an omission here.
 *
 * @throws {Error} if no participant with that id exists.
 */
export function removeParticipant(trip: Trip, participantId: ParticipantId): Trip {
  if (!trip.participants.some((p) => p.id === participantId)) {
    throw new Error(`removeParticipant: no such participant ${participantId}`);
  }
  return {
    ...trip,
    participants: trip.participants.filter((p) => p.id !== participantId),
    revision: trip.revision + 1,
  };
}
