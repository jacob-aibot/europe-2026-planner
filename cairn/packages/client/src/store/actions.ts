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
import type { Booking, BuildCtx, DayMetaPatch, Ref, ResolutionInit, StopInit, StopPatch, StopPlacement, Trip, TripMetaPatch } from '../deps.ts';

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
  | { type: 'copyStopInto'; source: { trip: Trip; stopId: string }; placement: StopPlacement };

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
    default:
      return a.type;
  }
}

export type { Trip };
