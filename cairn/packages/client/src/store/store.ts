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
  /**
   * The last document this store and storage agreed about — the common ancestor a
   * three-way merge needs when the revision guard fires. `null` means "we have never
   * agreed", and a write onto an id storage already holds is then refused outright rather
   * than guessed at.
   */
  let baseDoc: Trip | null = null;
  const listeners = new Set<(s: AppState) => void>();

  const localOwner = () => opts.ownerId ?? core.LOCAL_OWNER;

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
   * `savedRevision` as the storage port wants it: `null` means "this store has never agreed
   * with storage about this document, so nothing may be there yet". `initialState()` uses
   * `-1` for that, and passing `-1` down as a revision would compare equal to nothing and
   * refuse a legitimate first write.
   */
  function expectedRevision(): number | null {
    return state.persistence.savedRevision < 0 ? null : state.persistence.savedRevision;
  }

  /**
   * Writes the whole document, behind the storage port's **atomic compare-and-set**
   * (ARCHITECTURE §2.2's revision guard; ROADMAP F's two-tab criterion).
   *
   *   - storage untouched since we last agreed → write, as before;
   *   - storage moved → the write is **REFUSED**. `status` becomes `'conflict'`, the edit
   *     stays in memory, the stored document keeps the other writer's work, and the
   *     indicator does not say "Saved". Resolving it is `mergeWithStored()`, which is a
   *     button the user presses — never something a save does behind their back.
   *
   * The compare deliberately does **not** happen here. It used to: `load()` -> compare ->
   * `save()` is two awaits with an interleaving point between them, so two tabs saving at
   * the same moment both read revision R, both passed, and the second write destroyed the
   * first while the loser displayed "Saved" (QA R2-1). No amount of checking on this side
   * of the port closes that window — the port has to do the compare and the write as one
   * indivisible step, which is what `saveIfRevision` is for.
   *
   * A storage failure is separate: `status = 'error'` with `lastError`. Either way the edit
   * is never dropped and nothing ever fails silently.
   */
  async function save(): Promise<void> {
    // One store never races ITSELF. Autosave and an explicit `flush()` can both be in
    // flight at once, and before the port became atomic that was invisible: the second
    // save read storage from before the first one's write, compared its stale snapshot
    // against a stale expectation, and agreed with itself. `saveIfRevision` refuses that
    // — correctly — so the overlap has to stop happening rather than be tolerated.
    // Chaining also means each attempt computes `expectedRevision()` *after* the previous
    // one has settled, which is the only point at which it is true.
    const run = saving.catch(() => {}).then(() => attemptSave());
    saving = run;
    return run;
  }

  async function attemptSave(): Promise<void> {
    const doc = state.doc;
    if (!doc) return;
    set({ ...state, persistence: { ...state.persistence, status: 'saving' } });
    try {
      await writeAndSettle(doc, doc, null, expectedRevision());
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
  }

  /**
   * Persists `toWrite` if and only if storage still holds `expected`, updates the library
   * row and marks the store clean. A refusal leaves the document and the in-memory edit
   * completely untouched and reports `'conflict'`.
   *
   * `startedFrom` is the in-memory document the write began from: the user may have kept
   * typing while it was in flight, and a merged document may only replace `state.doc` when
   * it is still the one we started with.
   */
  async function writeAndSettle(
    startedFrom: Trip,
    toWrite: Trip,
    merge: { message: string; report: core.MergeReport } | null,
    expected: number | null,
  ): Promise<void> {
    const summary = core.tripSummary(toWrite);
    const outcome = await ports.storage.saveIfRevision(toWrite.id, expected, core.toJSON(toWrite), summary);
    if (!outcome.ok) {
      set({
        ...state,
        persistence: {
          ...state.persistence,
          status: 'conflict',
          lastError:
            `This trip was saved somewhere else — another tab, or another window — while you ` +
            `were editing. Nothing has been overwritten and your changes are still here. ` +
            `(stored revision ${String(outcome.storedRevision)}, this tab expected ${String(expected)})`,
        },
      });
      return;
    }
    baseDoc = toWrite;
    const stillOurs = state.doc === startedFrom;
    set({
      ...state,
      ...(stillOurs ? { doc: toWrite } : {}),
      library: upsertSummary(state.library, summary),
      persistence: {
        savedRevision: toWrite.revision,
        status: 'idle',
        // A merge notice survives later clean saves; only closing or switching trips clears
        // it. A notice that vanishes on the next keystroke is not a disclosure.
        ...(merge ?? state.persistence.lastMerge ? { lastMerge: merge ?? state.persistence.lastMerge } : {}),
      },
    });
    if (!stillOurs) scheduleSave();
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

    /**
     * Resolves a `'conflict'` — the user's explicit answer to "this trip was saved somewhere
     * else". Three-way merges the in-memory document with the stored one against the last
     * version this store and storage agreed about, then writes the result.
     *
     * This is a **button, not a behaviour**: ROADMAP F requires the automatic save path to
     * refuse, and §2.2's "last-writer-wins per stop" is what happens once the user asks for
     * it. Per-entity: disjoint edits both survive; a genuine collision resolves to this
     * tab's value and is listed in `persistence.lastMerge.report.overwritten`.
     *
     * @throws {Error} if there is no active trip, or no common ancestor to merge against —
     *         in which case the only safe options are "open it again" or "export this copy",
     *         and the store will not choose between them.
     */
    async mergeWithStored(): Promise<AppState> {
      const doc = state.doc;
      if (!doc) throw new Error('mergeWithStored: no active trip');
      const storedText = await ports.storage.load(doc.id);
      if (storedText === null) {
        // The trip was deleted while this tab held a conflict. Writing it back is what the
        // user asked for by pressing the button, and `null` is the honest expectation:
        // "nothing is stored under this id" — if that stops being true before we commit,
        // the port refuses and the conflict stands rather than clobbering the newcomer.
        set({ ...state, persistence: { ...state.persistence, status: 'saving' } });
        saving = (async () => {
          try {
            await writeAndSettle(doc, doc, null, null);
          } catch (err) {
            set({
              ...state,
              persistence: { ...state.persistence, status: 'error', lastError: (err as Error).message },
            });
          }
        })();
        await saving;
        return state;
      }
      if (!baseDoc || baseDoc.id !== doc.id) {
        throw new Error(
          'This tab never agreed with storage about this trip, so there is no common version ' +
            'to merge against. Export this copy, then open the trip again from the library.',
        );
      }
      const remote = core.fromJSON(storedText);
      const merged = core.mergeTrips(baseDoc, doc, remote);
      set({ ...state, persistence: { ...state.persistence, status: 'saving' } });
      saving = (async () => {
        try {
          // The merge is only valid against the `remote` we just read, so that is the
          // revision the write must still find. A third writer landing in between makes
          // this merge stale, and the port refusing is the correct outcome.
          await writeAndSettle(
            doc,
            merged.trip,
            { message: core.describeMerge(merged.report), report: merged.report },
            remote.revision,
          );
        } catch (err) {
          set({
            ...state,
            persistence: { ...state.persistence, status: 'error', lastError: (err as Error).message },
          });
        }
      })();
      await saving;
      return state;
    },

    /**
     * Dismisses the "this trip was edited elsewhere" notice left by `mergeWithStored`.
     * Touches persistence bookkeeping only; never the document, never a save.
     */
    clearMergeNotice(): AppState {
      if (!state.persistence.lastMerge) return state;
      const { lastMerge, ...rest } = state.persistence;
      void lastMerge;
      set({ ...state, persistence: rest });
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
      baseDoc = null;
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
     * Adds an already-built trip (the Europe 2026 sample, or an import).
     *
     * If storage ALREADY holds that id, the stored document wins and is opened instead.
     * Adopting is how the sample is loaded, and re-loading the sample must never overwrite
     * the copy Jacob has been editing — the same class of loss as F-2.
     */
    async adoptTrip(doc: Trip): Promise<AppState> {
      const existing = await ports.storage.load(doc.id);
      if (existing !== null) return this.openTrip(doc.id);
      cache = null;
      baseDoc = null;
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
      baseDoc = doc;
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

    /**
     * Opens another stored trip READ-ONLY beside the active one, for copying stops across
     * (§2.14). It does **not** become the active document, is never dispatched against and
     * is never written back.
     *
     * @throws {Error} if the id is not in storage or the stored document is corrupt.
     */
    async browseTrip(id: string): Promise<Trip> {
      const text = await ports.storage.load(id);
      if (text === null) throw new Error(`browseTrip: no trip ${id} in storage`);
      const doc = core.fromJSON(text);
      set({ ...state, browsing: doc });
      return doc;
    },

    async closeBrowse(): Promise<AppState> {
      set({ ...state, browsing: null });
      return state;
    },

    /**
     * Retires every stored resolution whose conflict is no longer reported (§2.7).
     *
     * The client calls this after recomputing the derived conflict set — it is the one
     * build function driven by derived data. Without it, content-addressing lets a
     * dismissed blocker come back still dismissed as soon as the data reverts, which is
     * exactly what §2.7 exists to prevent.
     */
    syncResolutions(): AppState {
      const doc = state.doc;
      if (!doc) return state;
      const derived = derivedFor(cache, doc, ports.clock.today());
      cache = derived;
      const next = core.syncResolutions(doc, derived?.conflicts ?? [], ports.clock.today());
      if (next === doc) return state;
      set({ ...state, doc: next });
      scheduleSave();
      return state;
    },

    async closeTrip(): Promise<AppState> {
      cache = null;
      baseDoc = null;
      set({ ...initialState(), library: state.library });
      return state;
    },

    async deleteTrip(id: string): Promise<AppState> {
      await ports.storage.delete(id);
      const library = state.library.filter((r) => r.id !== id);
      if (state.activeTripId === id) {
        cache = null;
        baseDoc = null;
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
     * Imports a document — **backup/restore of this user's own exports, and nothing else**.
     *
     * Two guards, both because Phase 1 lost data here (F-2):
     *
     *   1. A document whose `ownerId` is not this user's is REFUSED. Receiving a friend's
     *      itinerary is not what this button is for; friends build their own trip and copy
     *      individual activities across, which is Phase 2 work. Adopting a stranger's
     *      document would also put a trip with someone else's `ownerId` and 112 unbadged
     *      rows into storage, which §6.2 designs ownership now specifically to prevent.
     *   2. The collision check reads **storage**, not `state.library` — the library is a
     *      boot-time snapshot, and a tab that booted before a trip existed used to import
     *      straight over it. When the id is already stored, a fresh id is minted, so an
     *      import can never overwrite an existing trip.
     *
     * BUILD-NOTES §1, KD-11 — the architect is writing the formal contract into §2.10/§4.5
     * and it may supersede the refusal with adopt-and-badge.
     *
     * @throws {TripParseError} with a JSON path for a malformed file.
     * @throws {Error} for a document owned by another person.
     */
    async importDoc(text: string): Promise<AppState> {
      let doc = core.fromJSON(text);
      const owner = localOwner();
      if (doc.ownerId !== owner) throw new core.ForeignDocumentError(doc.ownerId, owner);
      if ((await ports.storage.load(doc.id)) !== null) {
        // The injected `IdFactory` is deterministic (it must be, for goldens), so a fresh
        // id can itself collide with a stored one. Keep minting until it does not.
        let fresh = ports.ids.newId('trip');
        for (let i = 0; i < 100 && (await ports.storage.load(fresh)) !== null; i++) {
          fresh = ports.ids.newId('trip');
        }
        if ((await ports.storage.load(fresh)) !== null) {
          throw new Error('Import could not mint a free trip id; nothing was written.');
        }
        doc = { ...doc, id: fresh, title: `${doc.title} (imported)` };
      }
      cache = null;
      baseDoc = null;
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
