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
 * Derived data for the active trip. Read through the store so the
 * `(document identity, today)` cache is shared with everything else — never recomputed per
 * component.
 *
 * The `void` reads exist so this hook is re-evaluated whenever React re-renders on a new
 * `AppState`; they are deliberately on the *document* and not on `doc.revision`, because a
 * revision is a content counter and `===` on one cannot prove sameness (§2.2b F2).
 */
export function useDerived(state: AppState): DerivedCache | null {
  void state.doc;
  void state.activeTripId;
  return store.getDerived();
}
