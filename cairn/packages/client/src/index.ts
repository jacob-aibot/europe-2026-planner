/**
 * `@cairn/client` — the trip store, ports and selectors.
 *
 * Platform-agnostic by construction: no DOM, no React, no network. `apps/web` and (later)
 * `apps/mobile` differ only in port implementations and view components.
 */
export { createStore, AUTOSAVE_DEBOUNCE_MS } from './store/store.ts';
export type { Store, StoreOptions } from './store/store.ts';
export { initialState, reduce, applyAction, undo, redo, setUi, INITIAL_UI, HISTORY_LIMIT } from './store/reducer.ts';
export type { AppState, UiState, HistoryState, PersistenceState } from './store/reducer.ts';
export { ACTION_SPECS, describeAction } from './store/actions.ts';
export type { Action, ActionType, ActionSpec } from './store/actions.ts';
export { computeDerived, derivedFor } from './store/derived.ts';
export type { DerivedCache, DayDerived } from './store/derived.ts';
export * from './selectors/index.ts';
export type {
  StoragePort, FilePort, MapPort, MapHandle, MapPoint, MapBoundsLike, ClockPort, IdPort,
  SchedulerPort, Ports, TripDoc, SaveOutcome,
} from './ports/types.ts';
export { revisionOf } from './ports/types.ts';
export {
  memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, manualScheduler, immediateScheduler,
} from './ports/memory.ts';
export type { MemoryStorage, MemoryFile, ManualScheduler } from './ports/memory.ts';
