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
import type { StorageVersion } from '../ports/types.ts';

export type UiState = {
  activeDayId: string | null;
  activeCityKey: string | null;
  mapScope: 'focus' | 'all';
  selectedStopId: string | null;
  panel: 'timeline' | 'conflicts' | 'validation' | 'pool' | 'places' | 'browse';
  ruleFilter: string | null;
};

export type PersistenceState = {
  /**
   * **The document storage last agreed with us about** (ARCHITECTURE §2.2b F2).
   *
   * One pointer answering both questions that need it: "is there an unwritten edit"
   * (`doc !== savedDoc`, reference identity, exact because `Trip` is immutable) and "what is
   * the merge's common ancestor". `null` means "we have never agreed", and a write onto an id
   * storage already holds is then refused outright rather than guessed at.
   *
   * It replaces the revision counter this field used to hold, which is **deleted** rather
   * than corrected (QA R4-1): a content counter cannot answer "unchanged", because `undo()`
   * restores a snapshot verbatim and makes `revision` non-injective over content — and a
   * field that exists is a field the next person compares.
   *
   * Like `savedVersion` it is **assigned from a port result and from nowhere else** — the
   * exact document a successful `saveIfVersion()` carried, or `load()`'s — and **never touched
   * by the reducer**, including by `undo`/`redo`: undo changes the document, not what storage
   * holds. Living in `persistence` rather than in a module-level `let` means it moves only
   * inside a `set()`, so no subscriber can render an indicator computed against a pointer the
   * state it was handed does not contain.
   */
  savedDoc: Trip | null;
  /**
   * The WRITE FENCE (ARCHITECTURE §2.2a). `null` = "nothing is stored under this id yet".
   *
   * **Assigned from a port result and from nowhere else** — `load()`'s version, or a
   * successful `saveIfVersion()`'s. It is never computed from the document, never copied out
   * of `Trip`, and **never touched by the reducer**, including by `undo`/`redo`. That one
   * sentence is what makes R3-1 structurally unreachable: no in-memory document operation
   * can advance or rewind the fence.
   */
  savedVersion: StorageVersion | null;
  /**
   * `'conflict'` is ROADMAP F's fourth status: storage moved under us, so the write was
   * REFUSED. It is not `'error'` — storage is fine, somebody else edited the trip — and it
   * is emphatically not `'idle'`, because the indicator must not say "Saved".
   */
  status: 'idle' | 'saving' | 'error' | 'conflict';
  lastError?: string;
  /**
   * Set by `store.mergeWithStored()` — the explicit, user-initiated resolution of a
   * `'conflict'`. Never set by an automatic save: ROADMAP F requires the automatic path to
   * refuse, so merging is a button, not a behaviour.
   * See BUILD-NOTES §1 "Known divergences from the contract", KD-10.
   */
  lastMerge?: { message: string; report: core.MergeReport };
};

export type HistoryState = { past: Trip[]; future: Trip[]; limit: number };

/**
 * The `SUMMARY_VERSION` rescan's bookkeeping — ARCHITECTURE §8.4 clause 3, Phase 2 I-6.
 *
 * **What is deliberately NOT here: the list of rows that still need recomputing.** That is
 * derived from `library` on every read, by comparing each row's own `summaryVersion` against
 * `core.SUMMARY_VERSION`. §0.6 is the reason — a cached "still to do" list is a second copy
 * of a fact the rows already state, and it goes stale the moment another writer touches one.
 * The two fields below are the two things the rows genuinely cannot say for themselves.
 *
 * Not persisted, not exported, not in `history`: it is an observation about the last pass.
 */
export type RescanState = {
  /** True from the moment a pass starts until it stops. Nothing claims completeness inside it. */
  running: boolean;
  /**
   * Documents the last pass could not read. **Reported, never silently dropped** — a row
   * whose document will not parse keeps its old summary, keeps its place in the library, and
   * says so. Cleared and re-derived at the start of every pass, so a record another writer
   * repairs stops being reported without anything having to remember that it was.
   */
  unreadable: ReadonlyArray<{ id: string; message: string }>;
};

export type AppState = {
  library: core.TripSummaryRow[];
  activeTripId: string | null;
  doc: Trip | null;
  /**
   * Another trip, open READ-ONLY beside the active one (§2.14's "Browse another trip").
   *
   * It is never dispatched against and never saved — the only thing it feeds is
   * `copyStopInto`. In Phase 1 its source is the local library, which is genuinely useful
   * on its own (a second trip reusing the first one's stops) and means the provenance rule
   * is exercised by a real user path months before there is a friend to break it. In Phase
   * 2 the source list gains shared trips and nothing else changes.
   */
  browsing: Trip | null;
  ui: UiState;
  history: HistoryState;
  persistence: PersistenceState;
  /**
   * **The retirement ledger** (ARCHITECTURE §2.7 A-5, revision 6, QA R8-1).
   *
   * `syncResolutions` writes `retiredAt` into the *document*, outside the reducer, because
   * §2.7 forbids bookkeeping from consuming an undo slot — but §4.2 rule 5's undo is a
   * snapshot restore over that same document, so Ctrl+Z restored `retiredAt: null` and a
   * dismissed **blocker** came back reading *"Marked dismissed"* after a keystroke that
   * acknowledged nothing.
   *
   * *Undo restores the plan. It does not restore the user's ignorance of what has already been
   * retired.* One date per `conflictId`, per trip, re-asserted onto every restored snapshot.
   *
   * It is **not persisted, not exported and not in `history`**: it is reconstructed on load
   * from the stored document's own `retiredAt` fields, so there is no new storage record and
   * no change to `toJSON`/`fromJSON`, the §6.3 cascade or `importDoc`.
   *
   * There is **exactly one place it is maintained** — `store.set()` — plus the two-action
   * release in `store.dispatch`. That is the R3-3 pattern: one assignment site, so no path can
   * opt out, rather than a closed list of callers to keep in step. The reducer never touches
   * it; `reduce`/`undo`/`redo`/`setUi` carry it through by spread and nothing more.
   */
  retired: { tripId: string; marks: ReadonlyMap<string, string> } | null;
  /**
   * §8.4 clause 3's rescan bookkeeping. It is **library-scoped, not document-scoped**, so it
   * survives every transition that replaces `state.doc` — see the six `...initialState()`
   * sites in `store.ts`, each of which carries it across exactly as it carries `library`.
   */
  rescan: RescanState;
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
    browsing: null,
    ui: { ...INITIAL_UI },
    history: { past: [], future: [], limit: HISTORY_LIMIT },
    persistence: { savedDoc: null, savedVersion: null, status: 'idle' },
    retired: null,
    rescan: { running: false, unreadable: [] },
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
 * data is keyed on `(document identity, today)` and recomputed wholesale — §4.2 rule 3). Pure.
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
