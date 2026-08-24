/**
 * The reducer (ARCHITECTURE §4.2).
 *
 * `doc = core[action.fn](doc, ...args)` plus history and persistence bookkeeping, and
 * nothing else. There is deliberately no `switch` over domain cases here: adding one is how
 * web and native start disagreeing about what a trip is.
 */
import * as core from '../deps.ts';
import type { BuildCtx, Trip } from '../deps.ts';
import type { Action } from './actions.ts';
import { ACTION_SPECS } from './actions.ts';

export type UiState = {
  activeDayId: string | null;
  activeCityKey: string | null;
  mapScope: 'focus' | 'all';
  selectedStopId: string | null;
  panel: 'timeline' | 'conflicts' | 'validation' | 'pool' | 'places';
  ruleFilter: string | null;
};

export type PersistenceState = {
  savedRevision: number;
  status: 'idle' | 'saving' | 'error';
  lastError?: string;
};

export type HistoryState = { past: Trip[]; future: Trip[]; limit: number };

export type AppState = {
  library: core.TripSummaryRow[];
  activeTripId: string | null;
  doc: Trip | null;
  ui: UiState;
  history: HistoryState;
  persistence: PersistenceState;
};

export const INITIAL_UI: UiState = {
  activeDayId: null,
  activeCityKey: null,
  mapScope: 'focus',
  selectedStopId: null,
  panel: 'timeline',
  ruleFilter: null,
};

export const HISTORY_LIMIT = 50;

export function initialState(): AppState {
  return {
    library: [],
    activeTripId: null,
    doc: null,
    ui: { ...INITIAL_UI },
    history: { past: [], future: [], limit: HISTORY_LIMIT },
    persistence: { savedRevision: -1, status: 'idle' },
  };
}

type CoreFn = (trip: Trip, ...args: unknown[]) => Trip;

/**
 * Applies one action by calling exactly one core build function. Pure.
 *
 * @throws {Error} if the action type has no spec, or the named core function does not exist
 *         — both are programmer errors, and both are worth failing loudly on.
 */
export function applyAction(doc: Trip, action: Action, ctx: BuildCtx): Trip {
  const spec = ACTION_SPECS[action.type];
  if (!spec) throw new Error(`reducer: unknown action ${action.type}`);
  const fn = (core as unknown as Record<string, unknown>)[spec.coreFn];
  if (typeof fn !== 'function') throw new Error(`reducer: core has no export "${spec.coreFn}"`);
  return (fn as CoreFn)(doc, ...spec.args(action, ctx));
}

/**
 * The pure state transition for an edit: apply, push history, invalidate nothing (derived
 * data is keyed on `doc.revision` and recomputed wholesale — §4.2 rule 3). Pure.
 */
export function reduce(state: AppState, action: Action, ctx: BuildCtx): AppState {
  if (!state.doc) throw new Error('reducer: no active trip');
  const before = state.doc;
  const doc = applyAction(before, action, ctx);
  if (doc === before) return state;
  const past = [...state.history.past, before];
  while (past.length > state.history.limit) past.shift();
  return { ...state, doc, history: { ...state.history, past, future: [] } };
}

/** Pure. Returns the state unchanged when there is nothing to undo. */
export function undo(state: AppState): AppState {
  if (!state.doc || state.history.past.length === 0) return state;
  const past = state.history.past.slice();
  const prev = past.pop() as Trip;
  return { ...state, doc: prev, history: { ...state.history, past, future: [state.doc, ...state.history.future] } };
}

/** Pure. Returns the state unchanged when there is nothing to redo. */
export function redo(state: AppState): AppState {
  if (!state.doc || state.history.future.length === 0) return state;
  const [next, ...future] = state.history.future;
  return { ...state, doc: next, history: { ...state.history, past: [...state.history.past, state.doc], future } };
}

/** UI state is never part of the document (§4.2 rule 2). Pure. */
export function setUi(state: AppState, patch: Partial<UiState>): AppState {
  return { ...state, ui: { ...state.ui, ...patch } };
}
