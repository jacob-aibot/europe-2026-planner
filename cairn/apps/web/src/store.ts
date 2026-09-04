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
import { indexedDbStorage, requestPersistentStorage } from './ports/storage.ts';
import { downloadFile } from './ports/file.ts';
import { browserPhotos } from './ports/photo.ts';
import { browserIds, systemClock } from './ports/env.ts';

/**
 * The one clock in the web app. `ports/env.ts` is the only place `Date` is read (§2.1), and
 * this is the only handle on it — views that need `today` (the lifecycle chips, §8.1) take it
 * from here rather than calling `new Date()` themselves.
 */
export const clock = systemClock();

export const store: Store = createStore({
  ports: {
    storage: indexedDbStorage(),
    file: downloadFile(),
    // §10.2, Phase 2 I-13. Two DOM methods from `ports/photo.ts` and four storage methods from
    // `ports/storage.ts`, sharing the trip database so a trip delete cascades in one transaction.
    photo: browserPhotos(),
    clock,
    ids: browserIds(),
  },
});

/**
 * §10.3 quota consequence 2, called **once at boot** — QA **R45-16**, which found it called
 * nowhere at all. This module is imported once and its body runs once, which is what "at boot"
 * means in this app; it is deliberately not in a React effect, because the request is about this
 * origin's storage and not about a component's lifetime.
 *
 * The answer is *recorded* rather than acted on. Nothing retries it: WebKit grants persistence on
 * heuristics (chiefly whether the app was added to the Home Screen), so a refusal today is a fact
 * about how the app was opened and not a transient error. It is exported so the surface that
 * eventually explains eviction to Jacob — *"images may be removed if you do not open this for a
 * week"* — reads a measurement rather than an assumption. **Never awaited on a render path**, and
 * `requestPersistentStorage` never rejects, so no unhandled rejection can come from this line.
 */
export const storagePersistence = requestPersistentStorage();

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
