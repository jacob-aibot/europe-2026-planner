/**
 * Actions (ARCHITECTURE §4.2 rule 1).
 *
 * **Every action maps 1:1 onto a core build function.** The reducer holds no domain logic:
 * it looks the action up in `ACTION_SPECS`, calls `core[spec.coreFn](doc, ...spec.args(...))`
 * and then does history and persistence bookkeeping. If a feature needs logic the reducer
 * cannot express, the logic goes into core — that is the mechanism that keeps web and
 * native from drifting.
 *
 * `spec.args` is argument marshalling ONLY. It may reorder and default; it may not decide
 * anything about a trip.
 */
import type {
  Booking, BuildCtx, DayMetaPatch, ParticipantInit, ParticipantPatch, PhotoInit, PhotoPatch, Ref,
  ResolutionInit, StopInit, StopPatch, StopPlacement, Trip, TripMetaPatch,
} from '../deps.ts';

export type Action =
  | { type: 'setTripMeta'; patch: TripMetaPatch }
  | { type: 'setDayMeta'; dayId: string; patch: DayMetaPatch }
  | { type: 'ensureDays' }
  | { type: 'addStop'; placement: StopPlacement; stop: StopInit }
  | { type: 'updateStop'; stopId: string; patch: StopPatch }
  | { type: 'removeStop'; stopId: string }
  | { type: 'moveStop'; stopId: string; placement: StopPlacement }
  | { type: 'reorderStop'; stopId: string; delta: number }
  | { type: 'scheduleFromPool'; stopId: string; hint?: { dayId?: string; time?: string; order?: number } }
  | { type: 'returnToPool'; stopId: string; cityKey?: string }
  | { type: 'acceptCandidate'; ref: Ref }
  | { type: 'rejectCandidate'; ref: Ref }
  | { type: 'upsertBooking'; booking: Booking }
  | { type: 'linkBooking'; stopId: string; bookingId: string | null }
  | { type: 'resolveConflict'; resolution: ResolutionInit }
  | { type: 'unresolveConflict'; conflictId: string }
  | { type: 'copyStopInto'; source: { trip: Trip; stopId: string }; placement: StopPlacement }
  // §10.1, Phase 2 I-13. Three actions, three core build functions, 1:1 as rule 1 requires —
  // the import saga in `store.ts` does the ports and the ordering, and dispatches THIS for the
  // document half, so nothing about the photo path is a new write path (§10.2's step 5).
  | { type: 'addPhoto'; photo: PhotoInit }
  | { type: 'removePhoto'; photoId: string }
  | { type: 'updatePhoto'; photoId: string; patch: PhotoPatch }
  // §8.3, Phase 2 I-9. Three actions, three core build functions, 1:1 as rule 1 requires. There
  // is no saga and no port: a participant is a record in the document and nothing else, which is
  // the whole of §8.3's "embedded, not a second persisted structure".
  | { type: 'addParticipant'; participant: ParticipantInit }
  | { type: 'updateParticipant'; participantId: string; patch: ParticipantPatch }
  | { type: 'removeParticipant'; participantId: string };

export type ActionType = Action['type'];

export type ActionSpec = {
  /** The name of the single `@cairn/core` export this action calls. */
  coreFn: string;
  /** Arguments AFTER the trip. Marshalling only — no domain decisions. */
  args: (a: Action, ctx: BuildCtx) => unknown[];
};

export const ACTION_SPECS: Record<ActionType, ActionSpec> = {
  setTripMeta: { coreFn: 'setTripMeta', args: (a, ctx) => [(a as { patch: TripMetaPatch }).patch, ctx] },
  setDayMeta: {
    coreFn: 'setDayMeta',
    args: (a) => [(a as { dayId: string }).dayId, (a as { patch: DayMetaPatch }).patch],
  },
  ensureDays: { coreFn: 'ensureDays', args: (_a, ctx) => [ctx] },
  addStop: {
    coreFn: 'addStop',
    args: (a, ctx) => [(a as { placement: StopPlacement }).placement, (a as { stop: StopInit }).stop, ctx],
  },
  updateStop: { coreFn: 'updateStop', args: (a) => [(a as { stopId: string }).stopId, (a as { patch: StopPatch }).patch] },
  removeStop: { coreFn: 'removeStop', args: (a) => [(a as { stopId: string }).stopId] },
  moveStop: {
    coreFn: 'moveStop',
    args: (a) => [(a as { stopId: string }).stopId, (a as { placement: StopPlacement }).placement],
  },
  reorderStop: { coreFn: 'reorderStop', args: (a) => [(a as { stopId: string }).stopId, (a as { delta: number }).delta] },
  scheduleFromPool: {
    coreFn: 'scheduleFromPool',
    args: (a) => [(a as { stopId: string }).stopId, (a as { hint?: unknown }).hint],
  },
  returnToPool: {
    coreFn: 'returnToPool',
    args: (a) => [(a as { stopId: string }).stopId, (a as { cityKey?: string }).cityKey],
  },
  acceptCandidate: {
    coreFn: 'acceptCandidate',
    args: (a, ctx) => [(a as { ref: Ref }).ref, ctx.actorUserId, ctx.now],
  },
  rejectCandidate: {
    coreFn: 'rejectCandidate',
    args: (a, ctx) => [(a as { ref: Ref }).ref, ctx.actorUserId, ctx.now],
  },
  upsertBooking: { coreFn: 'upsertBooking', args: (a) => [(a as { booking: Booking }).booking] },
  linkBooking: {
    coreFn: 'linkBooking',
    args: (a) => [(a as { stopId: string }).stopId, (a as { bookingId: string | null }).bookingId],
  },
  resolveConflict: { coreFn: 'resolveConflict', args: (a) => [(a as { resolution: ResolutionInit }).resolution] },
  unresolveConflict: { coreFn: 'unresolveConflict', args: (a) => [(a as { conflictId: string }).conflictId] },
  // §2.14's social primitive. The reducer holds no domain logic: this maps 1:1 onto
  // `core.copyStopInto`, which is where the provenance stamp is built.
  addPhoto: { coreFn: 'addPhoto', args: (a, ctx) => [(a as { photo: PhotoInit }).photo, ctx] },
  removePhoto: { coreFn: 'removePhoto', args: (a) => [(a as { photoId: string }).photoId] },
  updatePhoto: {
    coreFn: 'updatePhoto',
    args: (a) => [(a as { photoId: string }).photoId, (a as { patch: PhotoPatch }).patch],
  },
  // §8.3, Phase 2 I-9. Marshalling only — the defaults (`kind:'contact'`, `userId:null`) are
  // core's, not the client's, which is what keeps web and native agreeing on what a participant
  // is. **Participation grants nothing**, so no access, share or member state is touched here.
  addParticipant: {
    coreFn: 'addParticipant',
    args: (a, ctx) => [(a as { participant: ParticipantInit }).participant, ctx],
  },
  updateParticipant: {
    coreFn: 'updateParticipant',
    args: (a) => [
      (a as { participantId: string }).participantId,
      (a as { patch: ParticipantPatch }).patch,
    ],
  },
  removeParticipant: {
    coreFn: 'removeParticipant',
    args: (a) => [(a as { participantId: string }).participantId],
  },
  copyStopInto: {
    coreFn: 'copyStopInto',
    args: (a, ctx) => {
      const x = a as { source: { trip: Trip; stopId: string }; placement: StopPlacement };
      return [x.source, x.placement, { ids: ctx.ids, today: ctx.now, actorUserId: ctx.actorUserId }];
    },
  },
};

/** Human label for an action, used by the undo indicator. Pure. */
export function describeAction(a: Action): string {
  switch (a.type) {
    case 'addStop':
      return `add “${a.stop.name}”`;
    case 'removeStop':
      return 'remove a stop';
    case 'moveStop':
      return 'move a stop';
    case 'reorderStop':
      return 'reorder stops';
    case 'updateStop':
      return 'edit a stop';
    case 'scheduleFromPool':
      return 'add from the pool';
    case 'returnToPool':
      return 'return a stop to the pool';
    case 'resolveConflict':
      return 'resolve a conflict';
    case 'copyStopInto':
      return 'copy a stop from another trip';
    case 'addPhoto':
      return 'add a photo';
    case 'removePhoto':
      return 'remove a photo';
    case 'updatePhoto':
      return 'edit a photo';
    case 'addParticipant':
      return `add “${a.participant.displayName}”`;
    case 'updateParticipant':
      return 'edit someone on this trip';
    case 'removeParticipant':
      return 'remove someone from this trip';
    default:
      return a.type;
  }
}

export type { Trip };
