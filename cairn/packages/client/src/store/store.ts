/**
 * `TripStore` — the local-first, multi-trip state machine (ARCHITECTURE §4.2).
 *
 * Runs in plain Node with the in-memory ports. No DOM, no React, no network.
 *
 * The six rules it enforces, each because of a specific failure:
 *   1. every mutation is `dispatch(action)` and every action is one core build function;
 *   2. `ui` is never written into the trip document;
 *   3. derived data is recomputed wholesale on `doc.revision`;
 *   4. autosave writes the whole document, debounced, behind the port's atomic
 *      compare-and-set against an opaque `StorageVersion` (§2.2a), and NEVER fails silently;
 *   5. undo/redo is snapshot-based over the immutable `Trip`, limit 50, and carries no
 *      authority over the write fence;
 *   6. a pending write is never outlived by its document — every one of the six transitions
 *      that changes `state.doc` flushes first, and a refused flush aborts the transition.
 */
import * as core from '../deps.ts';
import type { BuildCtx, Trip } from '../deps.ts';
import type { Ports, SchedulerPort, StorageVersion } from '../ports/types.ts';
import type { Action } from './actions.ts';
import type { AppState, UiState } from './reducer.ts';
import { initialState, redo, reduce, setUi, undo } from './reducer.ts';
import type { DerivedCache } from './derived.ts';
import { derivedFor } from './derived.ts';

export const AUTOSAVE_DEBOUNCE_MS = 400;

/**
 * What a refused write says, and the only place it is worded.
 *
 * §4.2 rule 6b requires the screen to name **both** things the user can actually do — merge
 * with the stored copy, or export this copy — because blocking a trip switch on a refused
 * flush is only tolerable if the way out is stated. It deliberately does not print the
 * `StorageVersion`s: they are opaque tokens (§2.2a rule 3) and mean nothing to a reader.
 */
export const CONFLICT_MESSAGE =
  'This trip was saved somewhere else — another tab, or another window — while you were ' +
  'editing. Nothing has been overwritten and your changes are still here. You can merge ' +
  'with the stored copy, or export this copy and sort it out by hand.';

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

  /**
   * Schedules the debounced autosave, **captured to the trip it was scheduled for**.
   *
   * Belt and braces for §4.2 rule 6: 6a/6b mean a pending write is flushed before the
   * active document can change at all, but a timer that fires late must not be able to hurt
   * anything either. Revision 2's `attemptSave` read `state.doc` at execution time, which is
   * how trip A's pending write came to be executed against trip B (QA R3-2). A save that
   * finds a different document is **dropped, never retargeted**.
   */
  function scheduleSave() {
    if (!autosave) return;
    cancelTimer();
    const forTripId = state.doc?.id ?? null;
    cancelPending = scheduler.schedule(() => {
      cancelPending = null;
      void save(forTripId);
    }, debounceMs);
  }

  /** Cancels the pending debounced write WITHOUT performing it. §4.2 rule 6c's exception. */
  function cancelTimer() {
    if (cancelPending) {
      cancelPending();
      cancelPending = null;
    }
  }

  /**
   * Writes the whole document, behind the storage port's **atomic compare-and-set**
   * (ARCHITECTURE §2.2a's `StorageVersion` fence; ROADMAP F's two-tab criterion).
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
   * indivisible step, which is what `saveIfVersion` is for.
   *
   * A storage failure is separate: `status = 'error'` with `lastError`. Either way the edit
   * is never dropped and nothing ever fails silently.
   *
   * `forTripId` is the trip the write was scheduled for; `null` means "whatever is active
   * now", which is what an explicit `flush()` asks for.
   */
  async function save(forTripId: string | null = null): Promise<void> {
    // One store never races ITSELF. Autosave and an explicit `flush()` can both be in
    // flight at once, and before the port became atomic that was invisible: the second
    // save read storage from before the first one's write, compared its stale snapshot
    // against a stale expectation, and agreed with itself. `saveIfVersion` refuses that
    // — correctly — so the overlap has to stop happening rather than be tolerated.
    // Chaining also means each attempt reads `savedVersion` *after* the previous one has
    // settled, which is the only point at which it is true.
    const run = saving.catch(() => {}).then(() => attemptSave(forTripId));
    saving = run;
    return run;
  }

  async function attemptSave(forTripId: string | null): Promise<void> {
    const doc = state.doc;
    if (!doc) return;
    // §4.2 rule 6, belt and braces: a late timer is dropped, never retargeted.
    if (forTripId !== null && doc.id !== forTripId) return;
    set({ ...state, persistence: { ...state.persistence, status: 'saving' } });
    try {
      await writeAndSettle(doc, doc, null, state.persistence.savedVersion);
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
    expected: StorageVersion | null,
  ): Promise<void> {
    const summary = core.tripSummary(toWrite);
    const outcome = await ports.storage.saveIfVersion(toWrite.id, expected, core.toJSON(toWrite), summary);
    if (!outcome.ok) {
      set({
        ...state,
        persistence: {
          ...state.persistence,
          status: 'conflict',
          lastError: CONFLICT_MESSAGE,
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
        savedVersion: outcome.version,
        status: 'idle',
        // A merge notice survives later clean saves; only closing or switching trips clears
        // it. A notice that vanishes on the next keystroke is not a disclosure.
        ...(merge ?? state.persistence.lastMerge ? { lastMerge: merge ?? state.persistence.lastMerge } : {}),
      },
    });
    if (!stillOurs) scheduleSave();
  }

  /**
   * §4.2 rule 6a — **a pending write is never outlived by its document.**
   *
   * Every transition that changes the active document begins here: the debounce timer is
   * cancelled and the write it was going to do is performed and awaited, *before* anything
   * touches `state.doc`. QA R3-2: a 400 ms debounced write was still pending when the user
   * clicked "Back to all trips", the timer fired against a document that was no longer
   * there, and the edit was gone with nothing on screen. One click, no second tab.
   *
   * Returns **false** when the transition must not happen (rule 6b): the flush was refused
   * (`'conflict'`) or failed (`'error'`), so the old document stays active and still holds
   * the edit. Discarding it with a notice would satisfy the letter of "the app says so" and
   * violate the product — the user's content is authoritative and conflicts are surfaced,
   * not resolved by guessing. The refusal reaches the screen through the conflict/error
   * banner that is already there; this is not a new mechanism.
   */
  async function flushForTransition(): Promise<boolean> {
    cancelTimer();
    // Nothing pending and nothing wrong: there is no edit to lose, so do not re-write a
    // 176 KB document (and burn a StorageVersion) on every navigation. `dirty` is content
    // bookkeeping — `savedRevision` — which is exactly what "is there an unwritten edit"
    // means; a write that FAILED leaves `status` non-idle, so this cannot skip past one.
    const idle = state.persistence.status === 'idle';
    if (state.doc && !(idle && !dirty())) {
      await save();
      await saving;
    }
    const { status } = state.persistence;
    return status !== 'conflict' && status !== 'error';
  }

  /** Content bookkeeping only — `Trip.revision` vs the last revision written (§2.2a rule 1). */
  function dirty(): boolean {
    return !!state.doc && state.doc.revision !== state.persistence.savedRevision;
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
      const stored = await ports.storage.load(doc.id);
      if (stored === null) {
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
      const remote = core.fromJSON(stored.doc);
      const merged = core.mergeTrips(baseDoc, doc, remote);
      set({ ...state, persistence: { ...state.persistence, status: 'saving' } });
      saving = (async () => {
        try {
          // The merge is only valid against the exact `remote` we just read, so the write
          // carries **that same version** as its expectation — never one recomputed from
          // the document (§2.2a, the merge case). A third writer landing in between moves
          // the version, the port refuses, the conflict stands unmerged and the edit stays
          // in memory.
          await writeAndSettle(
            doc,
            merged.trip,
            { message: core.describeMerge(merged.report), report: merged.report },
            stored.version,
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

    /**
     * Creates a trip and makes it active.
     * §4.2 rule 6a: the outgoing document's pending write is flushed first, and rule 6b:
     * if that flush cannot succeed the new trip is not created.
     */
    async createTrip(init: core.TripInit): Promise<AppState> {
      if (!(await flushForTransition())) return state;
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
     *
     * §4.2 rule 6a/6b: the outgoing document is flushed first, and a refused flush aborts.
     */
    async adoptTrip(doc: Trip): Promise<AppState> {
      if (!(await flushForTransition())) return state;
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
     *
     * §4.2 rule 6a/6b: the outgoing document is flushed first, and a refused flush aborts —
     * revision 2's pending write was executed against whatever `state.doc` had become, so
     * trip A's edit landed in trip B (QA R3-2).
     *
     * @throws {Error} if the id is not in storage or the stored document is corrupt.
     */
    async openTrip(id: string): Promise<AppState> {
      if (!(await flushForTransition())) return state;
      const stored = await ports.storage.load(id);
      if (stored === null) throw new Error(`openTrip: no trip ${id} in storage`);
      const doc = core.fromJSON(stored.doc);
      cache = null;
      baseDoc = doc;
      set({
        ...initialState(),
        library: state.library,
        activeTripId: doc.id,
        doc,
        // The fence comes from the port result and from nowhere else — §2.2a rule 1.
        persistence: { savedRevision: doc.revision, savedVersion: stored.version, status: 'idle' },
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
      const stored = await ports.storage.load(id);
      if (stored === null) throw new Error(`browseTrip: no trip ${id} in storage`);
      const doc = core.fromJSON(stored.doc);
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

    /**
     * "Back to all trips" (App.tsx's brand button). §4.2 rule 6a/6b: the pending write is
     * flushed and awaited first, and a refused flush leaves the trip open with its edit.
     */
    async closeTrip(): Promise<AppState> {
      if (!(await flushForTransition())) return state;
      cache = null;
      baseDoc = null;
      set({ ...initialState(), library: state.library });
      return state;
    },

    /**
     * Deletes a trip. §4.2 **rule 6c is the one exception to 6a/6b**: deleting the *active*
     * trip cancels the pending timer WITHOUT writing and proceeds anyway — the user asked
     * for that document to be destroyed, and blocking on a refused flush would make a
     * conflicted trip undeletable. Deleting some *other* trip is an ordinary transition and
     * flushes the active document first.
     */
    async deleteTrip(id: string): Promise<AppState> {
      if (state.activeTripId === id) cancelTimer();
      else if (!(await flushForTransition())) return state;
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
     * §4.2 rule 6a/6b: the outgoing document is flushed first, and a refused flush aborts
     * the import rather than replacing an unsaved trip with the restored one.
     *
     * @throws {TripParseError} with a JSON path for a malformed file.
     * @throws {Error} for a document owned by another person.
     */
    async importDoc(text: string): Promise<AppState> {
      if (!(await flushForTransition())) return state;
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

    /** Forces a save now and waits for it. Cancels the debounce timer and does its work. */
    async flush(): Promise<AppState> {
      cancelTimer();
      await save();
      await saving;
      return state;
    },

    /** True when there are unsaved edits. */
    isDirty(): boolean {
      return dirty();
    },
  };
}
