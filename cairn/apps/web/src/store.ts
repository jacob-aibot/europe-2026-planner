/**
 * The single store instance and its React binding.
 *
 * `useSyncExternalStore` rather than a context reducer: the store already is the state
 * machine, and it lives in `packages/client` so it can be tested in plain Node. React's job
 * here is to re-render, nothing more.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { createStore } from '@cairn/client';
import type { AppState, DerivedCache, Store } from '@cairn/client';
import { indexedDbStorage } from './ports/storage.ts';
import { downloadFile } from './ports/file.ts';
import { browserIds, systemClock } from './ports/env.ts';

export const store: Store = createStore({
  ports: {
    storage: indexedDbStorage(),
    file: downloadFile(),
    clock: systemClock(),
    ids: browserIds(),
  },
});

export function useAppState(): AppState {
  return useSyncExternalStore(
    useCallback((cb: () => void) => store.subscribe(cb), []),
    () => store.getState(),
  );
}

/**
 * Derived data for the active trip. Read through the store so the `(tripId, revision)`
 * cache is shared with everything else — never recomputed per component.
 */
export function useDerived(state: AppState): DerivedCache | null {
  void state.doc?.revision;
  void state.activeTripId;
  return store.getDerived();
}
