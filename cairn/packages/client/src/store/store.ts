/**
 * `TripStore` — the local-first, multi-trip state machine (ARCHITECTURE §4.2).
 *
 * Runs in plain Node with the in-memory ports. No DOM, no React, no network.
 *
 * The five rules it enforces, each because of a specific failure:
 *   1. every mutation is `dispatch(action)` and every action is one core build function;
 *   2. `ui` is never written into the trip document;
 *   3. derived data is recomputed wholesale on `doc.revision`;
 *   4. autosave writes the whole document, debounced, and NEVER fails silently;
 *   5. undo/redo is snapshot-based over the immutable `Trip`, limit 50.
 */
import * as core from '../deps.ts';
import type { BuildCtx, Trip } from '../deps.ts';
import type { Ports, SchedulerPort } from '../ports/types.ts';
import type { Action } from './actions.ts';
import type { AppState, UiState } from './reducer.ts';
import { initialState, redo, reduce, setUi, undo } from './reducer.ts';
import type { DerivedCache } from './derived.ts';
import { derivedFor } from './derived.ts';

export const AUTOSAVE_DEBOUNCE_MS = 400;

const defaultScheduler: SchedulerPort = {
  schedule(fn, ms) {
    const t = setTimeout(fn, ms);
    if (typeof (t as unknown as { unref?: () => void }).unref === 'function') {
      (t as unknown as { unref: () => void }).unref();
    }
    return () => clearTimeout(t);
  },
};

export type StoreOptions = {
  ports: Ports;
  ownerId?: string;
  autosave?: boolean;
  debounceMs?: number;
};

export type Store = ReturnType<typeof createStore>;

/** Creates a store. Impure: it owns state, a subscriber list and a debounce timer. */
export function createStore(opts: StoreOptions) {
  const { ports } = opts;
  const scheduler = ports.scheduler ?? defaultScheduler;
  const debounceMs = opts.debounceMs ?? AUTOSAVE_DEBOUNCE_MS;
  const autosave = opts.autosave !== false;

  let state: AppState = initialState();
  let cache: DerivedCache | null = null;
  let cancelPending: (() => void) | null = null;
  let saving: Promise<void> = Promise.resolve();
  const listeners = new Set<(s: AppState) => void>();

  const ctx = (): BuildCtx => ({
    ids: { newId: (kind: string) => ports.ids.newId(kind) },
    now: ports.clock.today(),
    actorUserId: opts.ownerId ?? core.LOCAL_OWNER,
  });

  function emit() {
    for (const l of [...listeners]) l(state);
  }

  function set(next: AppState) {
    state = next;
    emit();
  }

  function scheduleSave() {
    if (!autosave) return;
    if (cancelPending) cancelPending();
    cancelPending = scheduler.schedule(() => {
      cancelPending = null;
      void save();
    }, debounceMs);
  }

  /**
   * Writes the whole document. A failure sets `persistence.status = 'error'` and keeps the
   * edit in memory — it is never dropped, and never fails silently.
   */
  async function save(): Promise<void> {
    const doc = state.doc;
    if (!doc) return;
    const revision = doc.revision;
    set({ ...state, persistence: { ...state.persistence, status: 'saving' } });
    const summary = core.tripSummary(doc);
    const text = core.toJSON(doc);
    saving = (async () => {
      try {
        await ports.storage.save(doc.id, text, summary);
        set({
          ...state,
          library: upsertSummary(state.library, summary),
          persistence: { savedRevision: revision, status: 'idle' },
        });
      } catch (err) {
        set({
          ...state,
          persistence: {
            ...state.persistence,
            status: 'error',
            lastError: (err as Error).message || String(err),
          },
        });
      }
    })();
    return saving;
  }

  function upsertSummary(list: core.TripSummaryRow[], row: core.TripSummaryRow): core.TripSummaryRow[] {
    const i = list.findIndex((r) => r.id === row.id);
    if (i < 0) return [...list, row];
    const next = list.slice();
    next[i] = row;
    return next;
  }

  return {
    /** The current state. Treat as immutable. */
    getState(): AppState {
      return state;
    },

    /** Derived data for the active trip, recomputed only when `doc.revision` changes. */
    getDerived(): DerivedCache | null {
      cache = derivedFor(cache, state.doc, ports.clock.today());
      return cache;
    },

    subscribe(fn: (s: AppState) => void): () => void {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** Applies one action. @throws {Error} if there is no active trip or the action is unknown. */
    dispatch(action: Action): AppState {
      set(reduce(state, action, ctx()));
      scheduleSave();
      return state;
    },

    undo(): AppState {
      set(undo(state));
      scheduleSave();
      return state;
    },

    redo(): AppState {
      set(redo(state));
      scheduleSave();
      return state;
    },

    /** UI state only. Never touches the document and never schedules a save. */
    setUi(patch: Partial<UiState>): AppState {
      set(setUi(state, patch));
      return state;
    },

    /** Reads the trip library from storage. */
    async refreshLibrary(): Promise<AppState> {
      const library = await ports.storage.listTrips();
      set({ ...state, library });
      return state;
    },

    /** Creates a trip and makes it active. */
    async createTrip(init: core.TripInit): Promise<AppState> {
      const doc = core.createTrip(init, ctx());
      cache = null;
      set({
        ...initialState(),
        library: state.library,
        activeTripId: doc.id,
        doc,
        ui: { ...initialState().ui, activeDayId: doc.days[0]?.id ?? null, activeCityKey: doc.cities[0]?.key ?? null },
      });
      await save();
      return state;
    },

    /** Adds an already-built trip (the Europe 2026 sample, or an import). */
    async adoptTrip(doc: Trip): Promise<AppState> {
      cache = null;
      set({
        ...initialState(),
        library: state.library,
        activeTripId: doc.id,
        doc,
        ui: { ...initialState().ui, activeDayId: doc.days[0]?.id ?? null, activeCityKey: doc.cities[0]?.key ?? null },
      });
      await save();
      return state;
    },

    /**
     * Switches trips. History, derived data and UI selection are all reset — two trips must
     * not leak state into each other.
     * @throws {Error} if the id is not in storage or the stored document is corrupt.
     */
    async openTrip(id: string): Promise<AppState> {
      const text = await ports.storage.load(id);
      if (text === null) throw new Error(`openTrip: no trip ${id} in storage`);
      const doc = core.fromJSON(text);
      cache = null;
      set({
        ...initialState(),
        library: state.library,
        activeTripId: doc.id,
        doc,
        persistence: { savedRevision: doc.revision, status: 'idle' },
        ui: { ...initialState().ui, activeDayId: doc.days[0]?.id ?? null, activeCityKey: doc.cities[0]?.key ?? null },
      });
      return state;
    },

    async closeTrip(): Promise<AppState> {
      cache = null;
      set({ ...initialState(), library: state.library });
      return state;
    },

    async deleteTrip(id: string): Promise<AppState> {
      await ports.storage.delete(id);
      const library = state.library.filter((r) => r.id !== id);
      if (state.activeTripId === id) {
        cache = null;
        set({ ...initialState(), library });
      } else set({ ...state, library });
      return state;
    },

    /** Serialises the active trip through the `FilePort`. */
    async exportActive(): Promise<string> {
      if (!state.doc) throw new Error('exportActive: no active trip');
      const text = core.toJSON(state.doc);
      const name = `${state.doc.title.replace(/[^\w-]+/g, '-').toLowerCase()}.cairn.json`;
      if (ports.file) await ports.file.exportDoc(name, new TextEncoder().encode(text));
      return text;
    },

    /**
     * Imports a document. @throws {TripParseError} with a JSON path for a malformed file.
     * A fresh id is minted when the incoming id already exists, so an import never
     * overwrites an existing trip.
     */
    async importDoc(text: string): Promise<AppState> {
      let doc = core.fromJSON(text);
      if (state.library.some((r) => r.id === doc.id)) {
        doc = { ...doc, id: ports.ids.newId('trip'), title: `${doc.title} (imported)` };
      }
      cache = null;
      set({
        ...initialState(),
        library: state.library,
        activeTripId: doc.id,
        doc,
        ui: { ...initialState().ui, activeDayId: doc.days[0]?.id ?? null, activeCityKey: doc.cities[0]?.key ?? null },
      });
      await save();
      return state;
    },

    /** Forces a save now and waits for it. */
    async flush(): Promise<AppState> {
      if (cancelPending) {
        cancelPending();
        cancelPending = null;
      }
      await save();
      await saving;
      return state;
    },

    /** True when there are unsaved edits. */
    isDirty(): boolean {
      return !!state.doc && state.doc.revision !== state.persistence.savedRevision;
    },
  };
}
