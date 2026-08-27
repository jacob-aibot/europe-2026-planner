/**
 * `TripStore` — the local-first, multi-trip state machine (ARCHITECTURE §4.2).
 *
 * Runs in plain Node with the in-memory ports. No DOM, no React, no network.
 *
 * The six rules it enforces, each because of a specific failure:
 *   1. every mutation is `dispatch(action)` and every action is one core build function;
 *   2. `ui` is never written into the trip document;
 *   3. derived data is recomputed wholesale on `(document identity, today)`;
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
 * How many times `flushForTransition` will write before it gives up (QA R5-1).
 *
 * A transition flushes, and an edit that lands *during* that flush leaves the document dirty
 * again the instant the write returns — so the flush has to be re-asserted against `dirty()`
 * and repeated, not decided from the status enum. Repeating it needs a bound: a user typing
 * continuously for the whole of every write would otherwise keep the transition in flight
 * forever, which trades silent data loss for a hang and is not an improvement.
 *
 * Five is sized for what it actually has to drain — the keystrokes a person can land inside
 * one storage write's latency, not a workload. Two writes settle the realistic case (the
 * in-flight document, then the one that arrived behind it); the rest is headroom.
 */
export const FLUSH_MAX_ATTEMPTS = 5;

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

/**
 * What an exhausted `FLUSH_MAX_ATTEMPTS` says, and the only place it is worded (§4.2 rule
 * 6a″, revision 5, QA R6-1).
 *
 * This was the one path that aborted a transition without telling anyone: the loop returned
 * `false`, the caller returned `state` unchanged, `status` was still `'idle'`, and no banner
 * reads `'idle'` — so the click did nothing and said nothing. Rule 6b's sentence is *"aborts
 * the transition **and tells the user**"*, and this exit owes the same debt as the other two.
 *
 * It is deliberately **not** `'conflict'`: nothing refused the write and there is no other
 * writer to merge with, so offering a merge would be a lie about what went wrong. `'error'`
 * routes it through the banner that already exists and already offers the two recoveries it
 * needs — retry, and export this copy. BUILD-NOTES KD-28.
 */
export const FLUSH_EXHAUSTED_MESSAGE =
  "Couldn't finish saving before switching. Your edit is still here.";

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
   * The merge currently in flight, or `null` — QA R7-1.
   *
   * `mergeWithStored` is `load()` … `mergeTrips` … `chainOntoSaving(write)`, three awaits
   * with interleaving points between them. Two presses of "Merge and save" before the first
   * settles both read the SAME `stored.version`, so the first write moves storage on and the
   * second is refused against a version its own predecessor spent — leaving `status:
   * 'conflict'` and *"Not saved — edited elsewhere"* over a document that was merged and
   * written correctly (BUILD-NOTES KD-32). Chaining does not close it: serialising two merges still runs the
   * second one's stale expectation. The second press must not be a second merge at all.
   */
  let merging: Promise<AppState> | null = null;
  // `baseDoc` used to live here as a module-level `let`. It is now
  // `persistence.savedDoc` (§2.2b F2): exactly one pointer to "the last document this store
  // and storage agreed about", answering both the merge's common-ancestor question and
  // "is there an unwritten edit", moving only inside a `set()`, and assertable by a test.
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

  /**
   * Conflict ids with a LIVE (`retiredAt === null`) row in this document — §2.7 **A-5a**.
   *
   * The ledger may acquire a `conflictId` from a document only when the document holds no
   * live row for it. Without this veto, a second `resolveConflict` on a conflict that still
   * carries a retired row (the "it has come back; you dismissed it again" case) has its
   * brand-new live row immediately re-absorbed and re-stamped retired — KD-36. The veto never
   * removes a mark already held; it only stops one from being acquired.
   */
  function liveConflictIds(doc: Trip): ReadonlySet<string> {
    const ids = new Set<string>();
    for (const r of doc.resolutions) if (!r.retiredAt) ids.add(r.conflictId);
    return ids;
  }

  /**
   * How many resolution rows this document carries for one conflict id (live and retired
   * counted alike) — §2.7 **A-5b**.
   *
   * `resolveConflict` is the only writer in the system that APPENDS a row; nothing else does.
   * So a redo step that raises this count for an id is a redone `resolveConflict` on that id
   * and nothing else — the fact `redo()`'s release condition is built on.
   */
  function rowsFor(doc: Trip, conflictId: string): number {
    let n = 0;
    for (const r of doc.resolutions) if (r.conflictId === conflictId) n++;
    return n;
  }

  /** A trip's own retired rows, as a ledger. §2.7 A-5's "reconstructed on load". */
  function marksOf(doc: Trip | null): ReadonlyMap<string, string> {
    const marks = new Map<string, string>();
    if (!doc) return marks;
    const live = liveConflictIds(doc);
    for (const r of doc.resolutions) {
      if (r.retiredAt && !marks.has(r.conflictId) && !live.has(r.conflictId)) marks.set(r.conflictId, r.retiredAt);
    }
    return marks;
  }

  /**
   * **The one place `state` is assigned, and the one place the retirement ledger is
   * maintained** (ARCHITECTURE §2.7 A-5, revision 6, QA R8-1).
   *
   * Retirement is monotone metadata, not document history: `syncResolutions` writes
   * `retiredAt` into the *document* — outside the reducer, because §2.7 forbids bookkeeping
   * from consuming an undo slot — but §4.2 rule 5's undo is a snapshot restore over that same
   * document, and `history.past` already holds the pre-retirement `Trip`. Ctrl+Z therefore
   * restored `retiredAt: null` and a dismissed **blocker** rendered *"Marked dismissed on
   * <date>"* after a keystroke that acknowledged nothing. *Undo restores the plan; it does not
   * restore the user's ignorance of what has already been retired.*
   *
   * Five mechanical steps. One assignment site is the point — the R3-3 pattern — so no path
   * can opt out by forgetting to call something:
   *
   *   1. `next.doc === state.doc` → assign and emit, unchanged. Every UI-only `set` takes this
   *      branch and the cost is one comparison.
   *   2. `opts.reseed` → the ledger becomes **exactly** the arriving document's own retired
   *      rows (`null` when there is no document), and **no re-assertion runs**. A document
   *      installed from outside this store's own edits is the authority.
   *   3. No ledger, or a ledger for another trip → same as step 2. A ledger is per trip:
   *      conflict ids are content-addressed over subject ids, which do not cross trips, and a
   *      ledger that outlived its trip would only grow.
   *   4. **Absorb** — record every retired row the arriving document carries, **first write
   *      wins**, so the recorded date is the earliest retirement this session observed and does
   *      not drift.
   *   5. **Re-assert**, then assign and emit **ONCE**, with the corrected document. Never a
   *      `set` for the restored snapshot followed by a second `set` for the fix, or subscribers
   *      render the stale *"Marked dismissed"* for a frame — which is the defect.
   *
   * BUILD-NOTES KD-34 records the five implementation calls A-5 left to the builder. KD-36
   * objected that steps 2/3/4 as first specified could re-acquire an id from a retired row
   * while a live row for the same id sat in the same document — ARCHITECTURE §2.7 **A-5a**
   * upheld the objection and added the veto `liveConflictIds` implements, at both sites.
   */
  function set(next: AppState, opts?: { reseed?: boolean }) {
    // 1 — identity.
    if (next.doc === state.doc) {
      state = next;
      emit();
      return;
    }
    const doc = next.doc;
    // QA R10-3 (§4.2 rule 5). A caller opting `reseed` on means "this document was installed
    // from OUTSIDE this store's own dispatched edits" — A-5's own definition of the seven
    // paths that turn it on. `history` is built entirely from THIS store's
    // `dispatch`/`undo`/`redo` calls, so a document that bypassed all of them has no linear
    // relationship to whatever `past`/`future` this store was holding. The six
    // document-installing transitions already arrive with `next.history` zeroed by their own
    // `...initialState()` spread, so this was always a no-op for them; `doMerge` turned the
    // option on for the LEDGER'S sake (A-5) and left `history` untouched, which is the whole
    // defect: a Ctrl+Z after a successful merge could
    // restore a PRE-merge snapshot, and that snapshot's own autosave then wrote it to storage
    // under the POST-merge `savedVersion` — a version the write-fence genuinely agreed to,
    // over a document the fence was never asked about. Clearing `history` here, once, for
    // every reseed path, means there is nothing left to undo INTO the instant a document
    // arrives this way — not a flag on stale snapshots the rest of the store would have to
    // keep checking.
    const reseeded = opts?.reseed ? { ...next, history: { past: [], future: [], limit: next.history.limit } } : next;
    // 2 and 3 — the arriving document is the authority; a ledger never crosses a trip.
    // A `null` document takes this branch too: both steps say the ledger becomes `null`.
    if (opts?.reseed || doc === null || state.retired === null || state.retired.tripId !== doc.id) {
      state = { ...reseeded, retired: doc === null ? null : { tripId: doc.id, marks: marksOf(doc) } };
      emit();
      return;
    }
    // 4 — absorb. §2.7 A-5a: a conflictId with a LIVE row in `doc` may not be (re-)acquired —
    // otherwise a second dismissal of a conflict that still carries a retired row (KD-36) is
    // re-absorbed from that retired row and stamped onto the brand-new live one.
    const marks = new Map(state.retired.marks);
    const live = liveConflictIds(doc);
    for (const r of doc.resolutions) {
      if (r.retiredAt && !marks.has(r.conflictId) && !live.has(r.conflictId)) marks.set(r.conflictId, r.retiredAt);
    }
    // 5 — re-assert, then one emit with the corrected document.
    state = { ...next, doc: core.reassertRetirements(doc, marks), retired: { tripId: doc.id, marks } };
    emit();
  }

  /**
   * Releases one conflict id from the ledger, so a fresh answer is not stillborn (§2.7 A-5).
   *
   * `unresolveConflict` followed by a new `resolveConflict` for the same `conflictId` would
   * otherwise have its brand-new live row stamped retired by the ledger on the very next
   * `set`. Called from `dispatch`, **before** `set`, for exactly two action types and nothing
   * else. This does not weaken *"never un-retires"*: both are deliberate user acts on that
   * exact conflict, which is the opposite of the bookkeeping-with-no-user-action §2.7 exists to
   * stop. Undoing past a release restores a live row, and that is the user's own answer being
   * undone.
   *
   * It replaces the map rather than mutating it: a subscriber may be holding the previous
   * `AppState`, and `retired.marks` is reachable from it.
   *
   * Release alone is not sufficient — without §2.7 **A-5a**'s veto in `set`'s absorb/reseed,
   * the freshly-released id would be re-acquired from the retired row `resolveConflict` keeps
   * beside the new live one (KD-36). Both mechanisms are required; neither alone is.
   */
  function releaseRetirement(conflictId: string) {
    const ledger = state.retired;
    if (!ledger || !ledger.marks.has(conflictId)) return;
    const marks = new Map(ledger.marks);
    marks.delete(conflictId);
    state = { ...state, retired: { tripId: ledger.tripId, marks } };
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
      // QA R7-2. A timer has no caller to reject to, so an unhandled rejection here is a
      // process-level crash in a browser and a hard failure under `node --test`. It is not
      // silence: `attemptSave` already turns a *storage* failure into `status:'error'` with
      // `lastError`, so the only rejections that reach this line come from a subscriber
      // throwing inside `set()` — somebody else's error, in somebody else's callback, which
      // this store can neither fix nor honestly report as a save failure. An explicit
      // `flush()` still rejects for its own caller; only the fire-and-forget path absorbs.
      // Same shape as `chainOntoSaving`'s `.catch(() => {})`, one level out.
      void save(forTripId).catch(() => {});
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
    return chainOntoSaving(() => attemptSave(forTripId));
  }

  /**
   * **The only place `saving` is ever assigned.** Every write path queues here.
   *
   * One store never races ITSELF. Autosave and an explicit `flush()` can both be in
   * flight at once, and before the port became atomic that was invisible: the second
   * save read storage from before the first one's write, compared its stale snapshot
   * against a stale expectation, and agreed with itself. `saveIfVersion` refuses that
   * — correctly — so the overlap has to stop happening rather than be tolerated.
   * Chaining also means each attempt reads `savedVersion` *after* the previous one has
   * settled, which is the only point at which it is true.
   *
   * It is a function rather than three copies of one expression because two of those
   * copies were written as `saving = (async () => …)()` — an assignment, which *replaces*
   * the chain instead of extending it — and reopened the self-race in `mergeWithStored`,
   * the one path a user reaches while a conflict is on screen (QA R3-3). The invariant
   * now has one home, and a write path can only opt out of it by not calling this.
   *
   * `.catch(() => {})` swallows the PREVIOUS link's rejection only, so one failed write
   * cannot poison the queue; each `work` still reports its own failure for itself.
   */
  function chainOntoSaving(work: () => Promise<void>): Promise<void> {
    const run = saving.catch(() => {}).then(work);
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
    // §2.7 A-5's seventh reseeding path. `doMerge` installs `merged.trip` as the active
    // document through here, and a merged document is one storage and this tab have just
    // JOINTLY AGREED on, at the user's explicit request. The ledger's job is to defend
    // against this store's own undo stack — not to outvote a merge.
    opts?: { reseed?: boolean },
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
    const stillOurs = state.doc === startedFrom;
    // §2.2a A-7 / §4.2 rule 4a (QA R11-1). `savedDoc`/`savedVersion` may advance only to a
    // document this store still holds (`stillOurs`) or one it wrote itself (`toWrite ===
    // startedFrom`, true at both autosave call sites). The merged write is the one place
    // both can be false at once: the write landed, but this store no longer holds the
    // document it wrote. Advancing the fence there would let the NEXT ordinary autosave write
    // an un-merged document over another writer's saved edit with the fence's own blessing —
    // and advancing `savedDoc` alone is just as fatal, because `doMerge` reads it as the
    // three-way ancestor, and the other writer's incorporated edits would then read as
    // deletions a later merge performs on purpose. So: no install, no fence, no re-arm — the
    // write's success is a fact about `toWrite`, not a licence to overwrite storage with
    // `state.doc`. `library` still upserts: storage genuinely holds `summary` now. `lastMerge`
    // does NOT get set on this branch — it would describe content the user cannot see.
    if (!stillOurs && toWrite !== startedFrom) {
      set({
        ...state,
        library: upsertSummary(state.library, summary),
        persistence: { ...state.persistence, status: 'conflict', lastError: CONFLICT_MESSAGE },
      });
      return;
    }
    set({
      ...state,
      ...(stillOurs ? { doc: toWrite } : {}),
      library: upsertSummary(state.library, summary),
      persistence: {
        // Both are port results, and `savedDoc` is the EXACT document this write carried —
        // §2.2b F2. `stillOurs` is the other half of the same fact: if the user kept typing
        // while the write was in flight, `state.doc` has moved on and `doc !== savedDoc`
        // correctly reports the store as dirty rather than clean.
        savedDoc: toWrite,
        savedVersion: outcome.version,
        status: 'idle',
        // A merge notice survives later clean saves; only closing or switching trips clears
        // it. A notice that vanishes on the next keystroke is not a disclosure.
        ...(merge ?? state.persistence.lastMerge ? { lastMerge: merge ?? state.persistence.lastMerge } : {}),
      },
    }, opts);
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
    // §4.2 rule 6a″ (QA R5-1). The loop is the fix, and the reason it is a loop rather than
    // one pass is that a flush is not a moment — it is a `await` long enough for the user to
    // type into. Revision 3 flushed once and then decided from `persistence.status`, which is
    // a fact about *the write that just finished*, not about *the document about to be
    // abandoned*. When an edit landed while the write was in flight, `writeAndSettle`
    // correctly recorded `savedDoc` as the document it wrote — the old one — left `state.doc`
    // on the new one, and the status still read `'idle'`, so the transition proceeded and
    // `attemptSave`'s early return dropped the re-armed write against a `state.doc` that was
    // by then `null` or another trip. R4-1's error (a fact read somewhere other than where the
    // resource states it) inside the function §2.2b F1 was written to fix.
    //
    // So the exit condition is `dirty()` — the thing the guarantee is actually about — and it
    // is re-asserted AFTER every write, never sampled before one. `FLUSH_MAX_ATTEMPTS` bounds
    // it, because a user typing through every write could otherwise keep a transition in
    // flight forever, and a hang is not an improvement on data loss.
    for (let attempt = 0; ; attempt++) {
      // §4.2 rule 6a′ (QA R4-1). The skip that avoids rewriting a 176 KB document on every
      // navigation is where the whole of rule 6 was lost: it compared `doc.revision` against
      // the revision last written, and undo makes that counter non-injective over content, so a
      // fresh different edit landing on a number an earlier edit already used made the store report
      // "nothing to write", skip the write, complete the switch, and display "Saved" over a
      // document storage did not hold.
      //
      // The skip requires ALL THREE. `doc === savedDoc` is the real condition — reference
      // identity against the document storage agreed with us about (§2.2b F2). The other two
      // are belt and braces and are stated as such: each can only ever cause MORE writing,
      // never less, which is what F2's check requires of any conjunct.
      //
      // `cancelTimer()` runs on every pass, not just the first: a write that finished while
      // the document had moved on re-arms the debounce, and that timer must not outlive this
      // loop either.
      const timerPending = cancelPending !== null;
      cancelTimer();
      const idle = state.persistence.status === 'idle';
      const skip = idle && !timerPending && !dirty();
      if (!state.doc || skip) return true;
      // The bound is spent. Nothing has been discarded — the document is still active and
      // still dirty — but a store that cannot land a stable write must not be allowed to
      // proceed as though it had (rule 6b's spirit: a flush that did not succeed aborts the
      // transition).
      //
      // §4.2 rule 6a″, revision 5 (QA R6-1, R6-2). This exit owes the user two things the
      // other two exits already pay:
      //
      //   1. It is a refusal **for display as well as for control flow.** `'error'` with a
      //      `lastError` that names what happened, so the banner that already exists renders
      //      and offers retry and export. NOT `'conflict'`: nothing refused the write.
      //   2. It **re-arms the debounce**, because the loop cancelled the timer the user's own
      //      edit had scheduled — including on this pass — and cancelling scheduled work
      //      without putting it back is a bug on its own terms. What is re-armed is the
      //      ORDINARY debounced `attemptSave`, never another `flushForTransition`, so it
      //      cannot recurse into this loop; if that write also leaves the document dirty it
      //      re-arms only through the normal `scheduleSave` path, which is what typing does.
      //
      // The transition itself is never retried automatically: the user clicks again. An app
      // that navigates by itself some seconds after a click the user has given up on is worse
      // than one that does nothing.
      if (attempt >= FLUSH_MAX_ATTEMPTS) {
        set({
          ...state,
          persistence: { ...state.persistence, status: 'error', lastError: FLUSH_EXHAUSTED_MESSAGE },
        });
        if (dirty()) scheduleSave();
        return false;
      }
      await save();
      await saving;
      const { status } = state.persistence;
      // The other two exits do NOT re-arm, and this is a three-way rule, not one behaviour.
      // On `'conflict'` a re-armed autosave would spin against a fence that will refuse it
      // every 400 ms; the user must merge or export. On `'error'` the port is failing and the
      // banner's Retry is the deliberate act. Only the bound-exhausted exit above re-arms,
      // because it is the only one where nothing has actually refused anything.
      if (status === 'conflict' || status === 'error') return false;
    }
  }

  /**
   * "Is there an unwritten edit" — the whole predicate (ARCHITECTURE §2.2b F2).
   *
   * Reference identity against the last document storage agreed with us about. It is exact,
   * not approximate: `Trip` is immutable by §2.1 and every build function is asserted pure,
   * so the only way this can report a false "clean" is a `Trip` mutated in place, which would
   * have corrupted the undo stack and the derived cache long before it reached here.
   *
   * A false "dirty" costs one extra write. A false "clean" is silent data loss, and the
   * previous answer — `===` on a content revision — reached it in six lines (QA R4-1).
   * The failure profiles are not symmetric, and that is the whole argument.
   */
  function dirty(): boolean {
    return !!state.doc && state.doc !== state.persistence.savedDoc;
  }

  function upsertSummary(list: core.TripSummaryRow[], row: core.TripSummaryRow): core.TripSummaryRow[] {
    const i = list.findIndex((r) => r.id === row.id);
    if (i < 0) return [...list, row];
    const next = list.slice();
    next[i] = row;
    return next;
  }

  /**
   * §2.7's `syncResolutions`, run against a conflict set that was **just** computed (QA R2-7).
   *
   * The retirement is dated with `derived.today` — the cache's own record of the day its
   * conflict set was computed for — and not with a fresh clock read. §0.6: *a fact about a
   * resource is only valid at the moment, and in the place, the resource itself stated it.*
   * Retiring a row is bookkeeping, not a user edit: it does not go on the undo stack, exactly
   * as the explicit `syncResolutions()` method has always done it. It does make the document
   * dirty, which is correct — the retirement has to reach storage.
   *
   * Returns the cache for the document that now exists. This converges in one pass: retiring
   * a resolution cannot make a conflict appear or disappear, only detach a `resolution` from
   * one, so a second sync over the new set finds nothing left to retire.
   */
  function retireResolutions(derived: DerivedCache | null): DerivedCache | null {
    const doc = state.doc;
    if (!doc || !derived) return derived;
    const next = core.syncResolutions(doc, derived.conflicts, derived.today);
    if (next === doc) return derived;
    set({ ...state, doc: next });
    scheduleSave();
    // **After `set()`, read `state.doc` — never the local we passed in** (§2.7 A-5). `next` is
    // the PRE-re-assertion document, and keying the derived cache on it is §2.2b F2 in
    // miniature: the cache would be served for a document the store does not hold.
    return derivedFor(derived, state.doc, ports.clock.today());
  }

  /**
   * The merge itself. Split out of `mergeWithStored` so the in-flight guard has one thing to
   * guard and the body keeps its own shape — see `merging` above (QA R7-1).
   */
  async function doMerge(): Promise<AppState> {
    const doc = state.doc;
    if (!doc) throw new Error('mergeWithStored: no active trip');
    const stored = await ports.storage.load(doc.id);
    if (stored === null) {
      // The trip was deleted while this tab held a conflict. Writing it back is what the
      // user asked for by pressing the button, and `null` is the honest expectation:
      // "nothing is stored under this id" — if that stops being true before we commit,
      // the port refuses and the conflict stands rather than clobbering the newcomer.
      set({ ...state, persistence: { ...state.persistence, status: 'saving' } });
      // Queued behind whatever is already in flight — never in parallel with it (R3-3).
      await chainOntoSaving(async () => {
        try {
          await writeAndSettle(doc, doc, null, null);
        } catch (err) {
          set({
            ...state,
            persistence: { ...state.persistence, status: 'error', lastError: (err as Error).message },
          });
        }
      });
      return state;
    }
    const ancestor = state.persistence.savedDoc;
    if (!ancestor || ancestor.id !== doc.id) {
      throw new Error(
        'This tab never agreed with storage about this trip, so there is no common version ' +
          'to merge against. Export this copy, then open the trip again from the library.',
      );
    }
    const remote = core.fromJSON(stored.doc);
    const merged = core.mergeTrips(ancestor, doc, remote);
    set({ ...state, persistence: { ...state.persistence, status: 'saving' } });
    // Queued behind whatever is already in flight — never in parallel with it (R3-3). An
    // autosave still unsettled when the button was pressed used to run alongside this
    // write; the merge landed, the orphaned autosave was then refused against its stale
    // expectation, and the banner read "Not saved — edited elsewhere" over a document that
    // was fully and correctly saved.
    await chainOntoSaving(async () => {
      // §2.2a A-7 (QA R11-1). Checked HERE, inside the link, after the queue has drained —
      // checking before `chainOntoSaving` is a check-then-act with an interleaving point in
      // the middle, §0.6's error and R7-3's exact mistake. `doc` is the document this merge
      // began from; if the store no longer holds it, a dispatch landed somewhere in the
      // storage read, the parse, `mergeTrips`, or the serialization — the merge is stale.
      // `writeAndSettle`'s own guard would still catch this (the write's success is never a
      // licence to move the fence to a document `state.doc` doesn't hold), but this closes
      // the WIDE part of the window for free, without even attempting a write that storage
      // would accept and this store would then have to discard.
      if (state.doc !== doc) {
        set({ ...state, persistence: { ...state.persistence, status: 'conflict', lastError: CONFLICT_MESSAGE } });
        return;
      }
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
          { reseed: true },
        );
      } catch (err) {
        set({
          ...state,
          persistence: { ...state.persistence, status: 'error', lastError: (err as Error).message },
        });
      }
    });
    return state;
  }

  return {
    /** The current state. Treat as immutable. */
    getState(): AppState {
      return state;
    },

    /**
     * Derived data for the active trip, recomputed when the document or the date changes.
     *
     * **This is also where `syncResolutions` is called** (§2.7, QA R2-7). §2.7's own words:
     * *"a build function the client calls whenever it recomputes the derived conflict set"*.
     * The panel shipped **Acknowledge** and **Not a problem** and nothing ever called it, so
     * a dismissed conflict came back **still dismissed** the moment the data reverted to its
     * old value — content-addressing restores the same id, and the old resolution with it.
     * A dismissed blocker re-arming with no user action is exactly what §2.7 exists to
     * prevent, so the call belongs at the one place the conflict set is known to be current.
     *
     * §2.2b F2 is what makes calling it here safe: `syncResolutions` does not merely render,
     * it **writes the document**, so a stale conflict set retires resolutions against
     * conflicts the current document still has. `derivedFor` is keyed on `(document
     * identity, today)` — not on a revision — so the set this reads was computed from
     * `state.doc` itself, one statement earlier. BUILD-NOTES KD-25.
     */
    getDerived(): DerivedCache | null {
      cache = derivedFor(cache, state.doc, ports.clock.today());
      cache = retireResolutions(cache);
      return cache;
    },

    subscribe(fn: (s: AppState) => void): () => void {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** Applies one action. @throws {Error} if there is no active trip or the action is unknown. */
    dispatch(action: Action): AppState {
      // §2.7 A-5's release, and its whole closed list: exactly these two action types, both
      // of which are a deliberate user act ON that exact conflict. Nothing else releases.
      if (action.type === 'resolveConflict') releaseRetirement(action.resolution.conflictId);
      else if (action.type === 'unresolveConflict') releaseRetirement(action.conflictId);
      set(reduce(state, action, ctx()));
      scheduleSave();
      return state;
    },

    undo(): AppState {
      set(undo(state));
      scheduleSave();
      return state;
    },

    /**
     * §2.7 **A-5b** (QA R9-1): `redo` releases the retirement ledger too, because `redo` is a
     * snapshot restore and not a `dispatch` — `dispatch`'s release (above) never runs for it.
     *
     * The release cannot be the A-5a veto reapplied: A-5a's blessed corner (dismiss → retire
     * → undo → dismiss again → retire again → undo) and this one both install `[retired,
     * live]` over an identical held mark, and require OPPOSITE outcomes — stamp there, do not
     * stamp here. The only fact that tells them apart is which direction history moved, which
     * is known here and nowhere else `set` is called from.
     *
     * So: release a `conflictId` iff the redo actually moves to a new document, the ledger
     * holds a mark for it, the redone document has a LIVE row for it, and the row count for
     * that id ROSE — which is exactly "the redone step was a `resolveConflict` on this id"
     * (`rowsFor`'s doc comment). Without the row-count clause this would also fire on a
     * same-row live/retired difference and un-retire a mark with no user act behind it — R8-1
     * rebuilt inside `redo`.
     *
     * `undo()` gets none of this and must not: undoing a `resolveConflict` LOWERS the row
     * count (nothing to protect), undoing anything else leaves it equal (R8-1's own case, and
     * releasing there would be the defect), and the one shape a rowsFor-based rule WOULD catch
     * on undo — undoing an `unresolveConflict` — is exactly where staying silent is correct.
     */
    redo(): AppState {
      const next = redo(state);
      const doc = next.doc;
      if (doc && state.doc && doc !== state.doc && state.retired && state.retired.tripId === doc.id) {
        const live = liveConflictIds(doc);
        for (const conflictId of state.retired.marks.keys()) {
          if (live.has(conflictId) && rowsFor(doc, conflictId) > rowsFor(state.doc, conflictId)) {
            releaseRetirement(conflictId);
          }
        }
      }
      set(next);
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
    mergeWithStored(): Promise<AppState> {
      // QA R7-1 — an in-flight guard, not a queue. A second press while the first is still
      // running joins the first press's promise; it does not start a second merge against an
      // expectation the first one is about to spend. `App.tsx` has no disabled state on the
      // button and the button stays in the DOM until React re-renders, so a real double click
      // reaches here. `finally` clears the slot whichever way the merge ends, so a failed
      // merge never wedges the button.
      if (merging) return merging;
      const run = doMerge().finally(() => { merging = null; });
      merging = run;
      return run;
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
      set({
        ...initialState(),
        library: state.library,
        activeTripId: doc.id,
        doc,
        ui: { ...initialState().ui, activeDayId: doc.days[0]?.id ?? null, activeCityKey: doc.cities[0]?.key ?? null },
      }, { reseed: true });
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
      set({
        ...initialState(),
        library: state.library,
        activeTripId: doc.id,
        doc,
        ui: { ...initialState().ui, activeDayId: doc.days[0]?.id ?? null, activeCityKey: doc.cities[0]?.key ?? null },
      }, { reseed: true });
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
      set({
        ...initialState(),
        library: state.library,
        activeTripId: doc.id,
        doc,
        // Both come from the port result and from nowhere else — §2.2a rule 1, §2.2b F2.
        persistence: { savedDoc: doc, savedVersion: stored.version, status: 'idle' },
        ui: { ...initialState().ui, activeDayId: doc.days[0]?.id ?? null, activeCityKey: doc.cities[0]?.key ?? null },
      }, { reseed: true });
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
      cache = derivedFor(cache, state.doc, ports.clock.today());
      cache = retireResolutions(cache);
      return state;
    },

    /**
     * "Back to all trips" (App.tsx's brand button). §4.2 rule 6a/6b: the pending write is
     * flushed and awaited first, and a refused flush leaves the trip open with its edit.
     */
    async closeTrip(): Promise<AppState> {
      if (!(await flushForTransition())) return state;
      cache = null;
      set({ ...initialState(), library: state.library }, { reseed: true });
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
      // §4.2 rule 6c, revision 5 (QA R7-3). **The exception is about not WRITING. It is not
      // about not ORDERING.** A write already queued on the chain can settle *after*
      // `ports.storage.delete(id)` returns, and an expect-absent write (`expectedVersion:
      // null`) is *satisfied* by the record's absence — so it succeeds, `upsertSummary` puts
      // the library row back, and the trip is resurrected with the delete silently undone.
      //
      // `await saving; ports.storage.delete(id)` does not fix it: that is a check-then-act
      // with an interleaving point in the middle, which is §0.6's error one level up from
      // where §2.2a found it. The delete goes ON the chain, as a link of its own — "drain,
      // delete, forget", with all three inside the one link, so no later link can observe a
      // half-deleted store or write against a fence pointer for a trip that no longer exists.
      //
      // None of this reopens the exception: the ACTIVE trip's pending timer is still
      // cancelled without writing, so the queue this link drains holds only writes the store
      // had already committed to before the user asked for the deletion, and a conflicted
      // trip is still deletable (BUILD-NOTES KD-31) — a refused write ahead of the delete reports its own failure
      // and the delete still runs behind it.
      await chainOntoSaving(async () => {
        await ports.storage.delete(id);
        const library = state.library.filter((r) => r.id !== id);
        if (state.activeTripId === id) {
          cache = null;
          set({ ...initialState(), library }, { reseed: true });
        } else set({ ...state, library });
      });
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
      set({
        ...initialState(),
        library: state.library,
        activeTripId: doc.id,
        doc,
        ui: { ...initialState().ui, activeDayId: doc.days[0]?.id ?? null, activeCityKey: doc.cities[0]?.key ?? null },
      }, { reseed: true });
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
