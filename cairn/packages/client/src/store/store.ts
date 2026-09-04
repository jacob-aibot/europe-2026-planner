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
import type { BuildCtx, PhotoAttachRef, Trip } from '../deps.ts';
import type { Ports, SchedulerPort, StorageVersion } from '../ports/types.ts';
import type { Action } from './actions.ts';
import type { AppState, PhotoImportFailure, PhotoSession, UiState } from './reducer.ts';
import { initialState, redo, reduce, setUi, undo } from './reducer.ts';
import type { DerivedCache } from './derived.ts';
import { derivedFor } from './derived.ts';
import type { Ticket } from './generation.ts';
import { createGenerationGuard } from './generation.ts';

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
 * How many times the `SUMMARY_VERSION` rescan re-reads the library before it stops
 * (ARCHITECTURE §8.4 clause 3, ROADMAP Phase 2 I-6).
 *
 * A pass is not a moment either. Between the first row it rewrites and the last, another
 * writer — a second tab, or a build that bumped `SUMMARY_VERSION` again — can put a row back
 * below the version. So a pass ends by re-reading the library **from storage** and asking the
 * rows themselves what is still outstanding (§0.6: completeness is a fact about the rows, not
 * about a pass having reached its own end), and repeats while anything is.
 *
 * That needs a bound for the same reason `FLUSH_MAX_ATTEMPTS` does, and it is a **bound, not
 * a timeout**: each pass awaits its own writes, so slow storage makes the loop take longer
 * rather than exhaust it. Convergence in the realistic worst case is two passes — the rows
 * that were stale when the pass started, then the ones that arrived behind it. Exhausting it
 * means something is rewriting old rows as fast as we can fix them, and the honest outcome is
 * to stop and let `summaryScan` keep reporting the library as out of date, which it does from
 * the rows and so cannot be fooled by the loop giving up.
 *
 * §8.4 does not name this constant, because it does not name the re-read that needs one —
 * BUILD-NOTES **KD-56**.
 */
export const RESCAN_MAX_PASSES = 5;

/** Does this stored row predate the current `SUMMARY_VERSION`? §8.4 clause 3. */
function needsRescan(row: core.TripSummaryRow): boolean {
  // `?? 0` — a row with no `summaryVersion` field at all was written by a build older than
  // the field, which is *below* every version and not "unknown, leave it alone".
  return (row.summaryVersion ?? 0) < core.SUMMARY_VERSION;
}

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

/**
 * What a **superseded** transition says — §4.2 rule **6d**, **A-67** Part 6.
 *
 * A supersession throws for a *creation* (`createTrip`, `adoptTrip`, `importDoc`) and returns
 * for a *navigation* (`openTrip`, `closeTrip`, `browseTrip`), and the split is a rule rather
 * than a list. A navigation aborts silently because *the outcome is on the screen*: a newer
 * transition is installing, and what the user is about to see is what their newest gesture
 * asked for. A creation has nothing on screen that will show it did not happen, and all three
 * creation paths have a caller that awaits and can render an error.
 */
export const TRANSITION_SUPERSEDED_MESSAGE =
  'Another trip was opened while this one was being prepared. Nothing was changed — try again.';

/**
 * What `dispatch`/`undo`/`redo` say while a `doc` claim is open — §4.2 rule **6d**, **A-67**
 * Part 6's last row.
 *
 * The window between `flushForTransition`'s return and the reseeding `set` used to accept an
 * edit and then discard it, with `persistence.status` reading `'idle'` over the loss (QA
 * **R47-1** face 1). Refusing is loud where accepting was silent. **This is a fence**: A-67
 * Part 11 residue 4 records that no surface in today's `apps/web` mounts an editable field on a
 * screen that calls `openTrip`, so nothing can reach it yet — and the first surface that can is
 * the one that decides whether to disable editing during a transition or to render this.
 */
export const TRANSITION_IN_PROGRESS_MESSAGE =
  'A trip is being opened or closed; that edit was not applied. Try again in a moment.';

/**
 * The byte ceiling `importPhotos` refuses **before** anything is decoded — §10.6's
 * `'too_large'`.
 *
 * 48 MiB, and the number is a decode-cost budget rather than a storage one: §10.3's measured
 * quota (*"up to 60% of the total disk space"* since Safari 17) says storage is not the binding
 * constraint, but `createImageBitmap` over a 100 MP file allocates its full decoded bitmap —
 * `w × h × 4` bytes — on a phone, and that is where an import actually dies. Every JPEG a phone
 * or a camera produces is far inside it; a multi-hundred-megapixel scan or a video mistyped as
 * an image is not, and gets a named refusal instead of a tab crash.
 *
 * Checked in `packages/client` rather than in the port so that both port implementations get it
 * and neither has to remember to — the R3-3 pattern.
 */
export const PHOTO_MAX_INPUT_BYTES = 48 * 1024 * 1024;

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

/**
 * A trip title as a download filename stem. Pure; never throws.
 *
 * One implementation because there are now two export paths — `exportActive` (a backup of the
 * open document) and `exportStoredDoc` (§2.9 **A-46** Part 4's rescue copy of a document that
 * will not open) — and the **suffix** is what distinguishes them, deliberately. Two hand-rolled
 * slugs would eventually differ in the part that is supposed to be the same.
 */
function slugTitle(title: string): string {
  return title.replace(/[^\w-]+/g, '-').toLowerCase();
}

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
  /**
   * The `SUMMARY_VERSION` rescan currently in flight, or `null` (§8.4 clause 3).
   *
   * Same shape and same reason as `merging`: two calls must not become two passes writing the
   * same rows against each other's expectations. A second call **joins** the first.
   */
  let rescanning: Promise<void> | null = null;
  /**
   * §4.2 rule **6d** / **A-67** — the generation guard, **one per store instance**.
   *
   * Closure state beside `merging`, `rescanning`, `saving` and `cancelPending`, and it is the
   * same classification all four of those carry: not in `AppState`, not in `history`, not in
   * `toJSON`, not exported (A-67 Part 9). A generation is a fact about an *operation*, and
   * operations are not part of the model — in `AppState` it would be snapshotted by `history`
   * (so `undo` would restore a generation, which is R8-1's defect class) and a subscriber could
   * render off it, and there is no honest thing to render for a window measured in
   * milliseconds.
   */
  const guard = createGenerationGuard();
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

  /**
   * **§4.2 A-71.** Errors that came out of a SUBSCRIBER, so no `catch` in this file can mistake
   * foreign code's failure for a port's. Closure-local like `cache`, `saving` and the
   * availability stamp: not in `AppState`, not persisted, not a selector input, and not shared
   * between two stores over one `memoryStorage` (A-67 Part 3 item 3's reason, one field over).
   *
   * *(A-71 Part 4a prints this sentence naming that stamp by its identifier. It is spelled out
   * here instead, because A-70 Part 6's **G28** counts occurrences of that identifier in this file
   * and pins them at three — the declaration, the assignment and the read. Prose only: no code
   * differs from what Part 4a prints, and G28 stays green and unmoved. BUILD-NOTES **KD-91**.)*
   *
   * A `WeakSet` and **not** a property on the error: the thrown object belongs to the subscriber
   * and this store does not write to it. It is also why no class is introduced — a
   * `SubscriberError extends Error` would wrap what the caller sees, and `cairn-constraints` §3's
   * `erasableSyntaxOnly` has an opinion about new syntax that a builtin does not need.
   *
   * **The brand's failure direction is safe.** A false positive (the same `Error` instance thrown
   * twice, once by a subscriber and once by a port) makes `attempt` **rethrow** rather than
   * misclassify, which is the conservative arm.
   */
  const fromSubscriber = new WeakSet<object>();

  function isSubscriberError(e: unknown): boolean {
    return typeof e === 'object' && e !== null && fromSubscriber.has(e);
  }

  function emit() {
    for (const l of [...listeners]) {
      try {
        l(state);
      } catch (e) {
        // **A-71 Part 4a.** Branded, then rethrown UNCHANGED — A-69 Part 7's *"the caller sees
        // the subscriber's error"* is preserved to the character, including the stack. **Who is
        // notified and who is not does not change here**: this still stops at the first throw.
        // That is A-69 Part 13 residue 1, it keeps its two remaining costs and its trigger, and
        // it stays open (A-71 Part 3, Part 5 item 1).
        //
        // A non-object throw is wrapped, because a `WeakSet` cannot hold a string — the only case
        // where the caller sees something other than exactly what was thrown, and `String(e)`
        // keeps the message.
        const marked = typeof e === 'object' && e !== null ? e : new Error(String(e));
        fromSubscriber.add(marked);
        throw marked;
      }
    }
  }

  type Attempted<T> = { ok: true; value: T } | { ok: false; error: unknown };

  /**
   * **§4.2 A-71 Part 4b — the ONE classifier in this file.** Runs one operation and returns its
   * outcome as a VALUE, so that the code which records a named failure is never lexically inside
   * a `catch`, and a `set` (and therefore an `emit`, and therefore a subscriber) can never be
   * inside the `try`.
   *
   * A subscriber's exception is **rethrown**: it is not this store's failure and this store may
   * not name it. That single line is why this is a boundary and not an enumeration (A-69 Part 3)
   * — a seventh caller added next year inherits the rule without anybody remembering it.
   *
   * QA **R50-5** and the four more faces A-71 Part 1 measured: `emit()` runs subscribers
   * synchronously, so every `catch` that classified a failure had a second source of exceptions
   * it could not tell from its subject — and it always guessed in the direction that blames the
   * user's data for the application's bug, then swallowed the bug.
   *
   * **It is a classifier, not a general try/catch** (A-71 Part 7 residue 3): its argument should
   * be **one** port call, or one internal function whose failure has exactly one meaning. An
   * `attempt` whose callback contains two awaits or a `set` is a finding before it is a
   * convenience.
   */
  async function attempt<T>(op: () => Promise<T>): Promise<Attempted<T>> {
    try {
      return { ok: true, value: await op() };
    } catch (error) {
      if (isSubscriberError(error)) throw error;
      return { ok: false, error };
    }
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

  /**
   * **The ONE place F-D is recorded** — ARCHITECTURE §2.9 **A-47** Part 2, ROADMAP **I-8f**.
   *
   * Every open path routes its `core.fromJSON` failure here, and nothing else in this file may
   * assign `openFailures`. One write site is the R3-3 pattern: no path can opt out by forgetting
   * to call something.
   *
   * The `set` is what makes the Trips list re-render carrying the chip and the rescue control,
   * so every caller must do it **before** rethrowing — the card the user just tapped has to come
   * back changed. The entry replaces any earlier one for the same id rather than accumulating.
   *
   * An **absent** document is deliberately not recorded here: it has no bytes to rescue, that is
   * R26-3's `missing`, and merging the two is the error `runRescan` already declines to make.
   */
  function noteOpenFailure(id: string, err: unknown): void {
    const message = (err as Error)?.message || String(err);
    set({ ...state, openFailures: [...state.openFailures.filter((f) => f.id !== id), { id, message }] });
  }

  /**
   * `openFailures` with `id` dropped — A-47 Part 2's two clear sites, `openTrip`/`browseTrip`
   * **success** and `deleteTrip`, and simultaneously the carry those transitions owe the field.
   *
   * R26-2's lesson applied here: a record that has since been repaired (hand-edited, or restored
   * over) stops being reported without anything having to remember that it was.
   */
  function clearOpenFailure(id: string): AppState['openFailures'] {
    return state.openFailures.filter((f) => f.id !== id);
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

  // ---- photos (§10.2, §10.3, §10.6) --------------------------------------------------------

  /**
   * Patches the session-scoped photo block through `set`, so subscribers see every step —
   * **but never the availability triple** (§4.2 **A-69** Part 5).
   *
   * `tripId`, `available` and `availabilityError` are one fact in three fields (**A-63**) and are
   * written by `setAvailability` alone. Writing `available` here fails to compile, which is the
   * criterion: A-69 Part 12 **G21** is a `npm run typecheck` transcript and not a test.
   */
  function setPhotos(patch: Partial<Omit<PhotoSession, 'tripId' | 'available' | 'availabilityError'>>) {
    set({ ...state, photos: { ...state.photos, ...patch } });
  }

  /**
   * §10.6's answers, as a closed set — **§4.2 A-69 Part 5**.
   *
   * There are three and there have been three since **A-63**; making that a union rather than a
   * convention is what stops a fourth from being written by accident, and stops `available` being
   * written without saying what `availabilityError` now is.
   */
  type AvailabilityAnswer =
    | { kind: 'ready'; tripId: string; available: ReadonlySet<string> }
    | { kind: 'unreadable'; tripId: string; message: string }
    | { kind: 'cleared' };   // no active document: §10.6 has no listing to report

  /**
   * The `photoAvailability` sequence the answer now in `state.photos` was written under —
   * **§4.2 A-70 Part 4**.
   *
   * Closure state beside `cache`, `merging` and `saving`: never in `AppState`, never persisted,
   * never a selector input, never visible to a subscriber, and **not shared between two stores
   * over one `memoryStorage`** — A-67 Part 3 item 3's reason, one field over. `null` means *"no
   * answer has been written by this store instance yet"*, and `current(slot, null)` is `false`,
   * which is what makes an unstamped reseed install read as unanswered rather than as current.
   */
  let availabilityAt: Ticket | null = null;

  /**
   * **The ONE place the availability triple is written** — A-69 Part 5. The R3-3 pattern, one
   * field over.
   *
   * A-69 Part 2's asymmetry, which is the sentence this function exists for: *the exits of this
   * store are an open set that grows every time somebody adds a `return` or a `throw`; the
   * writers of `photos.available` are a closed set that the type system and one grep can both
   * see.* The fence closes the **incremental** writers; the six whole-`AppState` reseeds still
   * install the triple as part of `...initialState()`, and that is precisely the case
   * `settleAvailability`'s boundary exists for (A-69 Part 5's last paragraph — neither mechanism
   * alone is the ruling).
   *
   * **It also stamps** — §4.2 **A-70** Part 4b. A-69 Part 5 having closed the incremental writers
   * to this one function is what makes the stamp complete by construction rather than by
   * discipline, which is why there is no second assignment site and adding one is a defect.
   */
  function setAvailability(answer: AvailabilityAnswer): void {
    // **A-70 Part 4.** Taken beside the write, with no `await` between, so it records the sequence
    // this answer is an answer FOR. `sequenceOf` and not `observe`: the caller that writes an
    // answer is usually the claimer holding this slot's window open, where `observe` is `null` by
    // design (A-67 Part 3 item 2) — which is the one place `observe` is the wrong question.
    availabilityAt = guard.sequenceOf('photoAvailability');
    switch (answer.kind) {
      case 'ready':
        // Copied into a set this store owns: the port's return value is `ReadonlySet` by type and
        // by nothing else, and a port that hands back its own live collection would let a later
        // write mutate state a subscriber is already holding (QA R43-1's shape, one port over).
        set({ ...state, photos: { ...state.photos, tripId: answer.tripId,
          available: new Set(answer.available), availabilityError: null } });
        return;
      case 'unreadable':
        set({ ...state, photos: { ...state.photos, tripId: answer.tripId,
          available: null, availabilityError: answer.message } });
        return;
      case 'cleared':
        set({ ...state, photos: { ...state.photos, tripId: null,
          available: null, availabilityError: null } });
        return;
      default: {
        // A-69 Part 5. A fourth answer is a COMPILE error here, and the error is the criterion.
        const exhaustive: never = answer;
        return exhaustive;
      }
    }
  }

  /**
   * §10.6 property 2 — **availability is read once, on open, through one port call.**
   *
   * `present(ids)` and not `read(id)` per photo: forty photos must not be forty transactions,
   * and the answer this produces is what keeps `'loading'` and `'empty'` distinguishable.
   *
   * A trip with no photos still records an answer (`available: new Set()`, `tripId` set): *"read,
   * and there are none"* is `'empty'`, and skipping the read would leave that trip permanently
   * `'loading'`. A store with **no photo port** records the same empty answer, which is honest —
   * on that host nothing has bytes.
   *
   * **A failed read is `'unreadable'`, and it is a fourth state rather than a slower
   * `'loading'`** — §10.6 property 5, **A-63** (QA R45-5). It leaves `available` at `null` *and*
   * writes `availabilityError`, so the two facts *"not read yet"* and *"read, and it failed"* are
   * distinguishable by the selector; `available: null` alone used to mean both, which left a
   * surface with a spinner it could never resolve and no method to retry with. A-57 Part 9
   * residue 5 is the separate, disclosed cost of reading once: bytes evicted *while* a trip is
   * open read as `'ready'` until the next open, and the render path's `read() === null` is what
   * makes that failure honest at the one moment it is visible.
   *
   * Every branch writes an answer **or a newer bump of this slot has taken responsibility for
   * one**, which is what makes property 5's *"exactly one terminal state follows every
   * `'loading'`"* true by construction rather than by inspection — **and the answer that stands
   * is the NEWEST one, ordered by TIME and not by trip** (§4.2 rule **6d**, **A-67**; QA
   * **R46-3**, then **R47-2**).
   *
   * **That second clause is A-68 Part 3, and A-69 changed what makes it true** (QA **R48-2**, then
   * **R49-1** and **R49-5**). A-67 put a `return` in front of all four branches, which made the
   * sentence above false: a read whose ticket had been invalidated wrote nothing at all, and if
   * the thing that invalidated it installed no document and issued no replacement read, nothing
   * ever answered. A-68 restored the property with a **pairing rule** — *a bump of a slot's
   * sequence is a promise to replace the answer it invalidated* — discharged at a list of named
   * sites, and that list was wrong within one round, for the third round running.
   *
   * **§4.2 A-69 Part 3 is the standing rule that replaced it:** *no correctness argument in this
   * store may rest on an exhaustive enumeration of control-flow exits.* The promise is now
   * discharged at a **boundary every path must pass through** — `settling(...)` around this
   * store's returned literal (site S1, which sees a `throw` as well as a `return`) and this
   * function's own tail after its `finally` (site S2, for a read dropped by a bump whose owner has
   * already returned). The invariant is unchanged and is directly testable: **when everything has
   * settled, either `state.doc === null`, or `photos.available !== null`, or
   * `photos.availabilityError !== null`.** A-68 Part 4.1's table still describes what each exit
   * does; it is no longer why the listing settles.
   *
   * **§4.2 A-70 strengthens that invariant without moving either site** (BUILD-NOTES **KD-84**):
   * an *answer* is not enough, it must be an answer **no bump has invalidated since it was
   * written** — so `setAvailability` stamps and `availabilityUnanswered` asks the guard. A failed
   * read therefore stops being permanently "answered": a byte write or delete this store performs
   * after it re-opens the question, and this function is re-issued to restate the failure with
   * current information or to succeed. It is still not the automatic retry A-63 Part 3 forbids,
   * because a failure restamps and so never re-reads itself.
   *
   * R46-3 asked *"is this answer for the trip that is open?"* and that is the wrong question
   * asked of the right subject. It covered two overlapping opens of two *different* trips and
   * could not see two overlapping reads of the **same** one — a double-tap on a library card, an
   * older `refreshPhotoAvailability` landing behind `doMerge`'s newer read, or a *Try again* that
   * succeeded being reverted by the failing read that preceded it. All three stamp an answer that
   * is stale rather than foreign, and a trip-id comparison is true of both. So the check is now a
   * **ticket on the `photoAvailability` slot**, claimed on line 1 before every branch and
   * asserted immediately before every `setPhotos` in this function: it is the same check with a
   * key fine enough to see time, and the old one is deleted rather than kept beside it (A-67
   * Part 7 — it is not weaker-but-independent, it is false in exactly the direction that costs
   * data).
   *
   * The cross-trip case R46-3 was written for is still covered, and by the same line: every
   * replacement of `state.doc` **supersedes** this slot at its reseed (A-68 Part 4 — it used to
   * *claim* it, which is R48-2), so a read issued for the outgoing document is invalidated one
   * synchronous statement before the incoming document is installed.
   *
   * **The guard is a drop, never a retarget** — `scheduleSave`'s rule for a late timer (QA R3-2),
   * one subsystem over. The losing read is discarded rather than re-aimed at a document it never
   * asked about.
   */
  async function readPhotoAvailability(doc: Trip | null): Promise<void> {
    try {
      await readAvailabilityOnce(doc);
    } finally {
      // **§4.2 A-69 Part 4, site S2.** The release has already happened — it is
      // `readAvailabilityOnce`'s own `finally`, one frame down — so this read is no longer the one
      // `observe` sees, which is A-69's stated requirement for this line. Unconditional: when this
      // read wrote an answer the predicate is false and this costs five comparisons. When it was
      // **DROPPED** — by a bump whose owner has already returned, so no S1 is coming — this is the
      // only thing left, and it is why S1 alone is not enough (A-69: *landing S1 without S2 leaves
      // R49-1's shape reachable*).
      //
      // **The split into two functions is the whole reason this line runs at all — BUILD-NOTES
      // KD-85.** A-69 Part 4 prints S2 as a statement *after* the `try`/`finally` in one function.
      // All four of that function's drop paths are `return`s **inside** the `try`, and a `return`
      // inside a `try` runs the `finally` and then leaves the function: it never reaches a
      // statement below the block. Transcribed literally, S2 is dead code on exactly the paths it
      // exists for, and reachable only where it is useless. A `finally` is the construct A-69 Part
      // 2 option 3 chose *because* all control flow passes through it, so the fix is to make S2 one
      // — the semantics A-69 states are unchanged, the placement is not.
      //
      // **Termination is an argument, not a bound.** This only issues a replacement when the read
      // it follows was dropped, and a read is only dropped by a bump taken *after* it claimed.
      // Bumps are produced by gestures, one per gesture, so each replacement consumes a bump that
      // has already happened; no loop runs without new gestures arriving. No artificial bound
      // ships, for the same reason A-67 Part 3 item 4 ships no wraparound handling.
      await settleAvailability();
    }
  }

  /**
   * One availability read, claim to release — the body A-69 Part 4's S2 wraps. Split out for the
   * reachability reason recorded at S2 above and in **BUILD-NOTES KD-85**, and for no other: every
   * line below is A-67 Part 6's and A-68's, unmoved.
   */
  async function readAvailabilityOnce(doc: Trip | null): Promise<void> {
    // A-67 Part 6: claimed on line 1, before every branch, and released in a `finally` that
    // covers every exit. A read is a replacement of this slot, so it claims rather than observes.
    const t = guard.claim('photoAvailability');
    try {
      if (!doc) {
        if (!guard.current('photoAvailability', t)) return;
        setAvailability({ kind: 'cleared' });
        return;
      }
      const ids = doc.photos.map((p) => p.id);
      // Captured, not asserted with `!`: the narrowing from the guard below does not survive into
      // the `attempt` callback, and a non-null assertion there would be a claim rather than a
      // fact (A-71 Part 4c).
      const photo = ports.photo;
      if (!photo || ids.length === 0) {
        if (!guard.current('photoAvailability', t)) return;
        setAvailability({ kind: 'ready', tripId: doc.id, available: new Set<string>() });
        return;
      }
      // **A-71 Part 4c.** The port call is the only thing whose failure this function may name, so
      // it is the only thing inside the classifier. `setAvailability` emits synchronously; with it
      // inside a `catch`'s reach, a subscriber throwing while rendering a SUCCESSFUL answer was
      // recorded as this store's own read failure and swallowed — QA **R50-5**, and §10.6 property
      // 6's *Try again* could never clear it (it re-read successfully, hit the same subscriber,
      // and wrote the same wrong message forever).
      const read = await attempt(() => photo.present(doc.id, ids));
      // One drop check for both arms, and it was always one rule: an answer stamped over a newer
      // answer is the same wrong answer whether it is `'ready'` or `'unreadable'`, and both are
      // terminal — §10.6 property 6's *"an `'unreadable'` listing carries an action"* is defeated
      // by the action working and then being undone (R47-2 face 3).
      if (!guard.current('photoAvailability', t)) return;
      setAvailability(read.ok
        ? { kind: 'ready', tripId: doc.id, available: read.value }
        // **The PORT's own words, and now only ever the port's** — `travelHistory`'s
        // `{ok:false, message}` shape one subject over. It carries no photo id, no caption and no
        // coordinate (§6.1 rule 1), and nothing logs it. That was true of the port's message and
        // false of the FIELD before A-71, because a subscriber's own exception string reached it
        // — R50-5's third note — and the classifier is what makes the sentence true of both.
        : { kind: 'unreadable', tripId: doc.id,
            message: (read.error as Error | null)?.message || 'the photo store could not be read' });
    } finally {
      guard.release('photoAvailability');
    }
  }

  /**
   * §10.6 property 5 as a question about right now — **§4.2 A-69 Part 4, narrowed at A-70 Part
   * 4**. True exactly when this store is showing a listing that nothing is going to answer.
   *
   * `observe(slot) !== null` is A-67 Part 3's own busy test, read for the one thing it is good at:
   * while a claim is open somebody is already responsible, so `observe` answers `null` and this
   * predicate is false. `observe('doc')` covers the synchronous span between a transition's
   * `supersede` and the read it issues after its release — a span with no `await` in it, so
   * nothing can resume inside it (A-67 Part 3's run-to-completion assumption, used here and
   * nowhere new).
   *
   * **The two `observe` terms are load-bearing and are not defensive checks to be tidied**
   * (ROADMAP I-13g): they are what stop the boundary issuing a read while somebody is already
   * responsible for one, which is the whole of A-69 Part 12's **G19** and **G23**.
   *
   * **Why the body below is a disjunction and not a fourth conjunct about the error field**
   * (A-70 Parts 3 and 4c, BUILD-NOTES **KD-84**). A-69 shipped
   * `state.photos.availabilityError === null` as a third conjunct, which reads a *consequence* of
   * an obligation — *"a past question was answered"* — as though it were the *record* of one. The
   * obligation actually in play is *"a bump of this slot has not been replaced"*, and **the record
   * of that obligation is the slot's sequence**, not the value of a field: a byte write's
   * unconditional `supersede` (A-68 Part 5a, kept) invalidates the only answer the store had
   * whenever R45-4's value guard is false, and a field cannot know that happened. So the answer on
   * display is stamped at `setAvailability` and this asks the guard. The two disjuncts are two
   * different facts — *"nothing has ever answered"* and *"what answered is an answer to a question
   * this store has since changed"* — and reading them as one is what produced this entry.
   */
  function availabilityUnanswered(): boolean {
    if (state.doc === null) return false;
    if (guard.observe('photoAvailability') === null) return false;
    if (guard.observe('doc') === null) return false;
    // (1) No answer has ever been written for this document — A-69's own disjunct, unchanged.
    if (state.photos.available === null && state.photos.availabilityError === null) return true;
    // (2) **A-70.** There is an answer, and a bump of this slot has invalidated it with nothing
    // written in its place. `current(slot, null)` is `false`, so an unstamped answer — which only
    // a whole-`AppState` reseed install can produce, and a reseed installs nulls — cannot reach
    // here and claim to be current.
    return !guard.current('photoAvailability', availabilityAt);
  }

  /**
   * The repair. At most one `present()`, and only when the alternative is a permanent spinner.
   *
   * **It repairs an ABSENT answer and never a wrong one** (A-69 Part 6 item 3, upheld unchanged at
   * A-70 Part 5 item 2). A stale-but-present answer — `deleteTrip`'s G12 scenario, where
   * `available` is a non-null set over bytes that are now gone — makes this predicate false,
   * because **nothing bumped the slot on that path** (`photo.removeTrip` is not a supersede site
   * and no reseed happened), so the stamp is still current. Staleness has one mechanism and it is
   * the `supersede` at the write.
   *
   * This is also why it is not the automatic retry A-63 Part 3 forbids: a failed read
   * **restamps**, which makes the predicate false, so a failure never re-reads itself. Only a bump
   * *this store took* re-opens the question — A-68 Part 5d's distinction, now enforced by the
   * guard rather than asserted in prose.
   */
  async function settleAvailability(): Promise<void> {
    if (availabilityUnanswered()) await readPhotoAvailability(state.doc);
  }

  /*
   * **`photoIdsOfStored` was deleted at I-13b, and its deletion is the fix.** QA R45-3's first
   * repair read the doomed `PhotoId`s out of `ports.storage.load(id)` so a non-active trip's
   * bytes could be swept. §10 **A-62** supersedes it: with tenancy in the key the cascade is a
   * key-range delete (`PhotoPort.removeTrip`), so no caller parses a document to learn what to
   * delete and no caller can get the list wrong for a trip it does not have open. A-62 Part 4
   * says so in both directions so the two passes do not fight.
   */

  /*
   * **`isLiveTrip` was deleted at I-13d, and its deletion is the fix** (§4.2 **A-67** Part 7).
   * R46-1's guard asked *"does this store still hold a trip under this id?"* immediately before
   * `importPhotos`' byte `write`. It is subsumed by `guard.current('doc', g)`, which is strictly
   * stronger and fires one step earlier: the only way a live batch's trip can be deleted is a
   * `deleteTrip` of the **active** trip, which claims; and a batch cannot be live for a
   * non-active trip, because opening any other trip claims and breaks it first. Keeping the old
   * check beside the new one would add nothing — the two run at the same instant — and a weaker
   * check left beside a stronger one is how round 46's readers came to believe the case was
   * closed.
   */

  /** `err.name` is the platform's own word for a full disk. Everything else is `'storage_failed'`. */
  function writeFailureReason(err: unknown): PhotoImportFailure {
    const name = (err as { name?: string } | null)?.name ?? '';
    return name === 'QuotaExceededError' ? 'quota_exceeded' : 'storage_failed';
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
    // **§4.2 A-71 Part 4c, and this is the face that says A-71 is not a photo defect.**
    // `writeAndSettle`'s install is a `set`, so it emits: a subscriber throwing while rendering a
    // write that LANDED used to be caught here and recorded as `status: 'error'` with the
    // subscriber's string in `lastError` — over a document storage holds, with `savedVersion`
    // already advanced to the version storage holds. That is the inverse of R11-1, it is governed
    // by §2.2a **A-7**, and it lies about the one fact the write fence exists to keep honest.
    // A genuine storage failure still records exactly what it recorded before (Part 5 item 2).
    const r = await attempt(() => writeAndSettle(doc, doc, null, state.persistence.savedVersion));
    if (!r.ok) {
      set({
        ...state,
        persistence: {
          ...state.persistence,
          status: 'error',
          lastError: (r.error as Error).message || String(r.error),
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
    const summary = core.tripSummary(toWrite, core.COUNTRY_INDEX);
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
    // **A-68 Part 4.2 item 2 — this install deliberately gets NO supersede, and it is the second
    // of the two sites a builder "completing the set" would break.** It is the seventh reseeding
    // install and it is `doMerge`'s alone, but it spreads `...state` and replaces **neither** `photos` nor
    // `browsing`, so there is nothing here to invalidate. `doMerge` already issues its own
    // `readPhotoAvailability` after the chain, **whose claim is itself the invalidation**. A merge
    // is still not a transition and still claims nothing (A-67 Part 7's last row).
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
   * Returns **`null`** when the transition must not happen (rule 6b): the flush was refused
   * (`'conflict'`) or failed (`'error'`), so the old document stays active and still holds
   * the edit. Discarding it with a notice would satisfy the letter of "the app says so" and
   * violate the product — the user's content is authoritative and conflicts are surfaced,
   * not resolved by guessing. The refusal reaches the screen through the conflict/error
   * banner that is already there; this is not a new mechanism.
   *
   * **On success it returns a `Ticket`, not `true`** — §4.2 rule **6d**, **A-67** (QA R47-1).
   * That is the whole of the generalisation, in one sentence: R5-1 made this loop re-assert
   * `dirty()` after every write; A-67 makes the **answer** it returns carry an expiry. A `true`
   * said *"there was nothing unwritten a moment ago"*, which is a fact about an instant that has
   * already passed by the time the caller acts on it — and `openTrip`'s `ports.storage.load(id)`
   * is another await on the far side of the closing brace, with nothing re-asserting `dirty()`
   * across it. A ticket says *"there is nothing unwritten now, and here is how you will know when
   * that stops being true."* Callers compare against `null`, never on truthiness.
   *
   * **The claim is this function's last synchronous act, in the same block as the `dirty()` read
   * it attests to**, and neither obvious alternative is allowed (A-67 Part 5). Not the
   * transition's first line: a dispatch that lands *during* the flush is not lost today — the
   * loop writes it and `openTrip`'s subsequent `load` reads it straight back — so claiming there
   * would make `dispatch` refuse an edit that currently survives correctly, a regression against
   * R5-1 paid to fix R5-1's successor. And not the line after the flush: `await
   * flushForTransition()` resumes in a microtask, and a `derive` promise resolving in exactly
   * that gap dispatches after the loop's last `dirty()` read and before the caller's first
   * statement.
   *
   * **It claims unconditionally, with no opt-out parameter, and that costs one deliberate false
   * positive** (A-67 Part 5, Part 11 residue 2): a `deleteTrip` of a **non**-active trip flushes
   * but installs no document, so its claim needlessly stops an import in flight for the trip that
   * *is* active — the batch stops, having kept and persisted everything it had already
   * dispatched. Rule 6a′ is this file's own record of what an opt-out on this exact function
   * costs, so the conservative stop is the cheaper failure and it is disclosed rather than
   * discovered.
   */
  async function flushForTransition(): Promise<Ticket | null> {
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
      // A-67 Part 5: the claim, beside the `dirty()` read it attests to, with no `await` between
      // them. Both success exits go through it.
      if (!state.doc || skip) return claimTransition();
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
        return null;
      }
      await save();
      await saving;
      const { status } = state.persistence;
      // The other two exits do NOT re-arm, and this is a three-way rule, not one behaviour.
      // On `'conflict'` a re-armed autosave would spin against a fence that will refuse it
      // every 400 ms; the user must merge or export. On `'error'` the port is failing and the
      // banner's Retry is the deliberate act. Only the bound-exhausted exit above re-arms,
      // because it is the only one where nothing has actually refused anything.
      if (status === 'conflict' || status === 'error') return null;
    }
  }

  /**
   * **The ONE place a live-document transition begins** — §4.2 rule **6d**, **A-68** Part 4.
   *
   * **It claims `doc` and NOTHING else, and the reason is written here because a reader who
   * finds a one-slot claim with no explanation will "restore" the other two** (QA **R48-2**).
   * Revision 47 claimed every slot a reseed replaces — `browsing` and `photoAvailability` as
   * well — on the rule *"the fields a reseed replaces"*, which a builder can apply without
   * judgement. It is the wrong rule, because **a claim is a promise to answer** (A-68 Part 3): it
   * invalidates whatever was in flight and undertakes to replace it on **every** exit, including
   * the throws. **Nine** exits of this function's holders install no document and issue no
   * replacement read — a delete of a *non*-active trip, an `openTrip` for a missing id, an
   * `openTrip` for a corrupt document, `importDoc`'s three refusals, an `adoptTrip` whose `load`
   * rejects, and `deleteTrip`'s rejecting cascade on both branches — so the availability read for
   * the trip that **stayed open** was dropped and nothing ever answered: `phase: 'loading'`
   * forever, which is §10 **A-63**'s unresolving spinner rebuilt (A-68 Part 4.1's table).
   *
   * The two ancillary slots are **superseded at the reseed that replaces them** instead, which is
   * where A-67 Part 4's own criterion puts them: a transition's write into `photos` and
   * `browsing` is `initialState()`'s constants, computed at the instant of writing, so it is a
   * synchronous replacement — invalidate, then write — and not a claim. An exit that never took
   * the claim cannot strand anything, which is how one line of deletion closes all nine.
   */
  function claimTransition(): Ticket {
    return guard.claim('doc');
  }

  /**
   * **The ONE place a live-document transition ends.** Always in a `finally`, on every exit.
   *
   * One slot, for the reason `claimTransition` gives above (A-68 Part 4). Releasing slots this
   * function never claimed would drive `busy` negative and make `observe` hand out tickets
   * inside somebody else's window.
   */
  function releaseTransition(): void {
    guard.release('doc');
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
   * §2.7's `syncResolutions` (QA R2-7), which since §2.7 **A-9** detects its own **un-gated**
   * set and no longer takes one (QA P2-1). The cache's `conflicts` are §8.2's *gated* set —
   * the right thing to render and the wrong thing to retire against — so the argument is
   * gone and the store cannot hand over the wrong one.
   *
   * The retirement is dated with `derived.today` — the cache's own record of the day its
   * conflict set was computed for — and not with a fresh clock read. §0.6: *a fact about a
   * resource is only valid at the moment, and in the place, the resource itself stated it.*
   * Retiring a row is bookkeeping, not a user edit: it does not go on the undo stack, exactly
   * as the explicit `syncResolutions()` method has always done it. It does make the document
   * dirty, which is correct — the retirement has to reach storage.
   *
   * `run` is A-9 point 3's cost control: retirement is now a pure function of
   * `(document, today)` — the same key `derivedFor` caches on — so on a cache **hit** it has
   * already run for that pair and running it again can only re-derive the same answer. The
   * render path passes `cache !== prev`; the explicit `syncResolutions()` method passes
   * `true`, because that is a request, it is idempotent, and it is not on a render path.
   *
   * Returns the cache for the document that now exists. This converges in one pass: retiring
   * a resolution cannot make a conflict appear or disappear, only detach a `resolution` from
   * one, so a second sync over the new set finds nothing left to retire.
   */
  function retireResolutions(derived: DerivedCache | null, run: boolean): DerivedCache | null {
    const doc = state.doc;
    if (!doc || !derived || !run) return derived;
    const next = core.syncResolutions(doc, derived.today);
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
        // **§4.2 A-71 Part 4c, site 6** — the same misattribution as `attemptSave`'s, on the
        // write-it-back branch. A subscriber throwing on this install told the user their work
        // could not be saved over a document that is in storage.
        const r = await attempt(() => writeAndSettle(doc, doc, null, null));
        if (!r.ok) {
          set({
            ...state,
            persistence: { ...state.persistence, status: 'error', lastError: (r.error as Error).message },
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
      // **§4.2 A-71 Part 4c, site 7.** The merge is only valid against the exact `remote` we just
      // read, so the write carries **that same version** as its expectation — never one
      // recomputed from the document (§2.2a, the merge case). A third writer landing in between
      // moves the version, the port refuses, the conflict stands unmerged and the edit stays in
      // memory. A subscriber throwing on the reseeding install is **not** that refusal and is no
      // longer recorded as one.
      const r = await attempt(() => writeAndSettle(
        doc,
        merged.trip,
        { message: core.describeMerge(merged.report), report: merged.report },
        stored.version,
        { reseed: true },
      ));
      if (!r.ok) {
        set({
          ...state,
          persistence: { ...state.persistence, status: 'error', lastError: (r.error as Error).message },
        });
      }
    });
    // §10.6 property 2, and it is **R45-4's defect on the path the fix pass did not cover** (QA
    // **R46-2**). A merge replaces `state.doc` with a document that can hold photo records this
    // session has never asked `present()` about — the other tab imported them — while
    // `state.photos.available` is whatever `openTrip` read minutes ago. Every taken-in record
    // then reads `'missing'`, which §10.6 property 3 renders as *"this photo's image is no longer
    // stored on this device"* over bytes that are on disk under this trip's own key. `importDoc`
    // gained exactly this line for exactly this reason; this is the same shape.
    //
    // Outside the chain, like `importDoc`'s: it is a read of a different port and must not sit
    // in front of another write. On the branches that changed nothing it re-reads an answer the
    // store already had, which costs one `present()` and cannot be wrong.
    await readPhotoAvailability(state.doc);
    return state;
  }

  /**
   * **The `SUMMARY_VERSION` rescan** — ARCHITECTURE §8.4 clause 3, ROADMAP Phase 2 I-6.
   *
   * A summary row is a *copy*, so §0.6 governs it: a row minted by an older build carries an
   * older answer forever unless something goes back to the document and asks again. This is
   * that something. For every stored row below `core.SUMMARY_VERSION`: load the document,
   * recompute the summary **from that document and nothing else**, and rewrite it through the
   * ordinary chained write.
   *
   * Four properties, each of which is a rule rather than an implementation detail:
   *
   *   1. **One document in memory at a time** (§4.2). `doc` is a local inside one link, used
   *      and dropped; the rows are processed one after another, never gathered. `state.doc` is
   *      not assigned by any path here. A screen that needs forty documents is out of scope.
   *   2. **Every mutation is on the serialization chain** (§4.3). The whole link — load,
   *      recompute, refresh — is issued from *inside* a `chainOntoSaving` callback, so it
   *      cannot interleave with an autosave, a merge or a delete. **So is the end-of-pass
   *      library re-read and its install** (QA R26-1): `listTrips` is exempt from the chain
   *      because it is a *read*, but the `set` that replaces `state.library` with its result
   *      is a write, and `deleteTrip` removes a row from `state.library` inside a link of its
   *      own. Off the chain, a delete landing while the read was in flight put the deleted
   *      trip's card back on screen, clickable and broken.
   *   3. **The write is the same compare-and-set every other write is.** The expectation is the
   *      version the load returned, so a row another writer has moved is *refused* — and that
   *      is the correct outcome, because that writer's own write carried a summary computed at
   *      the current version. The rescan never retries over somebody else's work.
   *   4. **The rescan never writes a document — not even the active one — and therefore never
   *      moves a fence** (§4.3 **A-30**, replacing I-6's property 4). The row is computed from
   *      the document **storage holds**, read in the same chained step, because a
   *      `TripSummaryRow` is a fact about the *stored record*: `listTrips()` is what serves it.
   *      `state.doc` is not consulted by this path, so a half-typed title is no longer flushed
   *      to storage ahead of its own debounce, and an unsaved edit is never described by a row.
   *      The next autosave recomputes the row from the document it writes, exactly as it always
   *      has. BUILD-NOTES **KD-57**'s subject — whether `writeAndSettle` may be aimed at a
   *      non-active document — disappears with the branch that raised it.
   *
   * Not a seventh document-installing transition: nothing here assigns `state.doc`,
   * `activeTripId` or `persistence` at all, and `refreshSummary` cannot.
   */
  async function runRescan(): Promise<void> {
    const unreadable = new Map<string, string>();
    /**
     * Ids whose `load()` came back `null` — QA **R26-3**. A document the pass cannot *parse* is
     * filed in `unreadable` and filtered out of every later pass; a document that is not there
     * at all was filed nowhere, so an **orphan row** (a summary whose document is gone — what a
     * half-completed delete or a partial restore leaves) stayed in `listTrips()`, stayed below
     * the version, and burned all `RESCAN_MAX_PASSES` passes on every single boot, forever. An
     * absent document is as final as an unreadable one.
     *
     * Not merged into `unreadable`: they are different facts and the report keeps them apart.
     * The row stays honestly `outdated`, which is what `summaryScan` says about it.
     */
    const missing = new Set<string>();
    const report = () => [...unreadable].map(([id, message]) => ({ id, message }));
    try {
      for (let pass = 0; pass < RESCAN_MAX_PASSES; pass++) {
        // Re-derived from the rows on every pass, never carried between them (§0.6): the
        // library is the only thing that knows what is still outstanding.
        const ids = state.library
          .filter(needsRescan)
          .map((r) => r.id)
          .filter((id) => !unreadable.has(id) && !missing.has(id));
        if (ids.length === 0) return;
        for (const id of ids) {
          await chainOntoSaving(async () => {
            const stored = await ports.storage.load(id);
            // Deleted between `listTrips` and here, or an orphan row. Either way there is no
            // document to compute a row from, and `refreshSummary` would refuse one anyway.
            if (stored === null) {
              missing.add(id);
              return;
            }
            let doc: Trip;
            try {
              doc = core.fromJSON(stored.doc);
            } catch (err) {
              // Reported, never silently dropped and never guessed at: the row keeps its old
              // summary, keeps its place in the library, and says it could not be read.
              unreadable.set(id, (err as Error).message || String(err));
              return;
            }
            // §8.4 clause 1, mechanically: the summary is computed from `doc`, and `doc` is
            // the document this same link just read out of storage. There is no other document
            // in scope to compute it from — not even `state.doc`, which this path never reads.
            const summary = core.tripSummary(doc, core.COUNTRY_INDEX);
            const outcome = await ports.storage.refreshSummary(id, stored.version, summary);
            if (!outcome.ok) return;
            set({ ...state, library: upsertSummary(state.library, summary), rescan: { running: true, unreadable: report() } });
          });
        }
        // The pass reached its own end, which is NOT the same fact as "the library is
        // current" (§0.6). Ask storage — on the chain, so the answer cannot be installed over
        // a delete that landed while it was in flight (R26-1). BUILD-NOTES **KD-60** records
        // why this rather than a row-by-row reconcile, and the ordering it makes observable:
        // a `deleteTrip` issued while this link is in flight now waits for it.
        await chainOntoSaving(async () => {
          const library = await ports.storage.listTrips();
          set({ ...state, library, rescan: { running: true, unreadable: report() } });
        });
      }
    } finally {
      set({ ...state, rescan: { running: false, unreadable: report() } });
    }
  }

  /** Starts a rescan, or joins the one already running. Never two passes at once. */
  function startRescan(): Promise<void> {
    if (rescanning) return rescanning;
    // `unreadable` is cleared here and not remembered across passes: it is an observation
    // about the last attempt, so a record another writer has since repaired stops being
    // reported without anything having to remember that it was.
    //
    // **Before the early return, not after it** (QA R26-2). When the repair also brings the row
    // current — which is exactly what a second tab opening and re-saving the trip leaves behind
    // — there is nothing left to rescan and no pass runs, so a clearing that lived past this
    // line never happened: the library went on rendering *"This trip's file could not be read"*
    // over a file that reads perfectly, and `summaryScan` stayed `'stale'` indefinitely.
    if (state.rescan.unreadable.length > 0) set({ ...state, rescan: { ...state.rescan, unreadable: [] } });
    if (!state.library.some(needsRescan)) return Promise.resolve();
    set({ ...state, rescan: { running: true, unreadable: [] } });
    const run = runRescan().finally(() => {
      rescanning = null;
    });
    rescanning = run;
    return run;
  }

  /**
   * **§4.2 A-69 Part 4, site S1 — the settling boundary.**
   *
   * Every async method of this store settles §10.6 property 5 on the way out — on success **and on
   * a throw**. It is a wrapper rather than a line in each method **because a line in each method is
   * an enumeration** (A-69 Part 3), and this arc has been wrong about such an enumeration three
   * rounds running: an exception in particular escapes any list of *returned* outcomes, which is
   * QA **R49-5** (a subscriber throwing from inside `emit()` during a transition that DOES install
   * a document). A method added to the literal below is covered without anyone remembering to
   * cover it.
   *
   * Synchronous methods are passed through untouched: they cannot `await` a repair, and none of
   * them writes the availability triple — which is not a promise, it is Part 5's type fence.
   *
   * `export type Store = ReturnType<typeof createStore>` is unchanged by this: `settling` is the
   * identity in the type system.
   */
  function settling<T extends object>(api: T): T {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(api)) {
      const value = (api as Record<string, unknown>)[key];
      if (typeof value !== 'function') { out[key] = value; continue; }
      const fn = value as (...args: unknown[]) => unknown;
      out[key] = function (...args: unknown[]): unknown {
        // `out` and not `api`, so a method calling `this.openTrip`/`this.dispatch` goes through
        // the wrapper too and the boundary composes rather than being escapable from inside.
        const result = fn.apply(out, args);
        if (!(result instanceof Promise)) return result;
        return result.then(
          async (v) => { await settleAvailability(); return v; },
          async (e) => { await settleAvailability(); throw e; },
        );
      };
    }
    return out as T;
  }

  return settling({
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
      // A-9 point 3: retirement is a function of `(document, today)` — `derivedFor`'s own
      // cache key — so it runs only when `derivedFor` returned a NEW cache object.
      const prev = cache;
      cache = derivedFor(cache, state.doc, ports.clock.today());
      cache = retireResolutions(cache, cache !== prev);
      return cache;
    },

    subscribe(fn: (s: AppState) => void): () => void {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /**
     * Applies one action.
     *
     * @throws {Error} if there is no active trip or the action is unknown.
     * @throws {Error} `TRANSITION_IN_PROGRESS_MESSAGE` while a document transition is in flight
     *         — §4.2 rule **6d**, **A-67** Part 6. The window between `flushForTransition`'s
     *         return and the reseeding `set` used to *accept* the edit and then discard it with
     *         `persistence.status` reading `'idle'` over the loss (QA R47-1 face 1). Refusing is
     *         loud where accepting was silent, and it is the only honest answer: the store cannot
     *         apply an edit to a document it is one statement away from replacing.
     */
    dispatch(action: Action): AppState {
      if (guard.observe('doc') === null) throw new Error(TRANSITION_IN_PROGRESS_MESSAGE);
      // §2.7 A-5's release, and its whole closed list: exactly these two action types, both
      // of which are a deliberate user act ON that exact conflict. Nothing else releases.
      if (action.type === 'resolveConflict') releaseRetirement(action.resolution.conflictId);
      else if (action.type === 'unresolveConflict') releaseRetirement(action.conflictId);
      set(reduce(state, action, ctx()));
      scheduleSave();
      return state;
    },

    /** @throws {Error} `TRANSITION_IN_PROGRESS_MESSAGE` — see `dispatch` (§4.2 rule 6d). */
    undo(): AppState {
      if (guard.observe('doc') === null) throw new Error(TRANSITION_IN_PROGRESS_MESSAGE);
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
     *
     * @throws {Error} `TRANSITION_IN_PROGRESS_MESSAGE` — see `dispatch` (§4.2 rule 6d).
     */
    redo(): AppState {
      if (guard.observe('doc') === null) throw new Error(TRANSITION_IN_PROGRESS_MESSAGE);
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

    /**
     * Reads the trip library from storage.
     *
     * It does **not** start the `SUMMARY_VERSION` rescan by itself. Reading rows and
     * rewriting them are two different acts with two different failure modes, and a
     * background pass nobody asked for and nobody can await is not testable and not
     * cancellable. The caller does `refreshLibrary()` then `rescanSummaries()` — `App.tsx`
     * does exactly that on boot. In between, `summaryScan` reports the library as out of
     * date, which is true, rather than as complete, which would not be. BUILD-NOTES **KD-56**.
     */
    async refreshLibrary(): Promise<AppState> {
      const library = await ports.storage.listTrips();
      set({ ...state, library });
      return state;
    },

    /**
     * Recomputes every library row below `core.SUMMARY_VERSION` from its own document
     * (ARCHITECTURE §8.4 clause 3) — see `runRescan` for the four properties it holds.
     *
     * Resolves when the pass has stopped. A second call while one is in flight **joins** it
     * rather than starting a second, exactly as `mergeWithStored` does. Never throws for a
     * document it could not read: that is reported through `summaryScan(state).unreadable`,
     * because one corrupt record out of forty must not take the library view down with it.
     */
    async rescanSummaries(): Promise<AppState> {
      await startRescan();
      return state;
    },

    /**
     * Creates a trip and makes it active.
     * §4.2 rule 6a: the outgoing document's pending write is flushed first, and rule 6b:
     * if that flush cannot succeed the new trip is not created.
     *
     * §4.2 rule **6d** (**A-67** Part 6): a supersession **throws**, because nothing else on the
     * screen would show that the creation did not happen and this method's caller awaits it.
     *
     * @throws {Error} `TRANSITION_SUPERSEDED_MESSAGE` if a newer transition claimed the document
     *         while this one was being prepared. Nothing is installed and nothing is written.
     */
    async createTrip(init: core.TripInit): Promise<AppState> {
      const t = await flushForTransition();
      if (t === null) return state;
      let doc: Trip | null = null;
      try {
        doc = core.createTrip(init, ctx());
        // The last statement before the write, with no `await` between them — A-67 Part 3.
        if (!guard.current('doc', t)) throw new Error(TRANSITION_SUPERSEDED_MESSAGE);
        // **A-68 Part 4, and it is the same call at all six reseed sites.** The reseed replaces
        // `photos` and `browsing` with `initialState()`'s values, so it is a *synchronous*
        // replacement of both slots: invalidate, then write (A-67 Part 3's own sentence for a
        // supersede). This is `closeBrowse`'s shipped pattern applied to the six writers that
        // were using a claim instead — see `claimTransition` for why a claim was wrong here.
        // Last statements before the install, with no `await` between them.
        guard.supersede('photoAvailability');
        guard.supersede('browsing');
        cache = null;
        set({
          ...initialState(),
          library: state.library,
          rescan: state.rescan,
          openFailures: state.openFailures,
          activeTripId: doc.id,
          doc,
          ui: { ...initialState().ui, activeDayId: doc.days[0]?.id ?? null, activeCityKey: doc.cities[0]?.key ?? null },
        }, { reseed: true });
      } finally {
        releaseTransition();
      }
      // §10.6 property 2. A new trip has no photos, and recording that ANSWER is what makes
      // `photosFor` say `'empty'` rather than sitting at `'loading'` forever.
      //
      // **After the release**, so this read claims its own `photoAvailability` ticket rather than
      // sitting inside the transition's claim (A-67 Part 6).
      await readPhotoAvailability(doc);
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
     *
     * §4.2 rule **6d** (**A-67** Part 6): a supersession **throws**, as for every creation path.
     * The `finally` covers the `openTrip` delegation too — that nested transition takes its own
     * claim, which is correct, and settles first.
     *
     * @throws {Error} `TRANSITION_SUPERSEDED_MESSAGE` if a newer transition claimed the document
     *         while this one was being prepared.
     */
    async adoptTrip(doc: Trip): Promise<AppState> {
      const t = await flushForTransition();
      if (t === null) return state;
      try {
        const existing = await ports.storage.load(doc.id);
        if (existing !== null) return await this.openTrip(doc.id);
        if (!guard.current('doc', t)) throw new Error(TRANSITION_SUPERSEDED_MESSAGE);
        // A-68 Part 4 — reseed site 2 of 6. See `createTrip` and `claimTransition`.
        guard.supersede('photoAvailability');
        guard.supersede('browsing');
        cache = null;
        set({
          ...initialState(),
          library: state.library,
          rescan: state.rescan,
          openFailures: state.openFailures,
          activeTripId: doc.id,
          doc,
          ui: { ...initialState().ui, activeDayId: doc.days[0]?.id ?? null, activeCityKey: doc.cities[0]?.key ?? null },
        }, { reseed: true });
      } finally {
        releaseTransition();
      }
      await readPhotoAvailability(doc);
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
     * §4.2 rule **6d** (**A-67** Part 6): a supersession **returns** and installs nothing, and
     * the silence is honest because *the outcome is on the screen* — a newer transition is
     * installing, and what the user is about to see is what their newest gesture asked for. That
     * is the case R6-1 distinguished from: R6-1's silent abort left the user on an **unchanged**
     * screen with no explanation, which is why the flush's bound-exhausted exit grew a banner.
     *
     * @throws {Error} if the id is not in storage or the stored document is corrupt.
     */
    async openTrip(id: string): Promise<AppState> {
      const t = await flushForTransition();
      if (t === null) return state;
      let installed: Trip | null = null;
      try {
        const stored = await ports.storage.load(id);
        if (stored === null) throw new Error(`openTrip: no trip ${id} in storage`);
        // §2.9 **A-47** Part 2. The failure is recorded where it happens and the ORIGINAL error is
        // rethrown unchanged — `App.tsx`'s banner and `Library.tsx`'s `openRow` catch are unmoved,
        // same class, same message, same JSON path. The `set` is before the rethrow so subscribers
        // re-render and the card the user just tapped comes back carrying the chip and the rescue
        // control (A-47 Part 8 residue 2: reachable *immediately after* the tap that establishes it).
        // Both stay inside the window, and both stay unchanged.
        let doc: Trip;
        try {
          doc = core.fromJSON(stored.doc);
        } catch (err) {
          noteOpenFailure(id, err);
          throw err;
        }
        // A-67 Part 6: the last statement before the install, with no `await` between them. This
        // is also what makes an OLDER transition unable to install over a newer one — two
        // `openTrip` calls whose `load`s resolve out of order (Part 10, G7).
        if (!guard.current('doc', t)) return state;
        // A-68 Part 4 — reseed site 3 of 6. See `createTrip` and `claimTransition`.
        guard.supersede('photoAvailability');
        guard.supersede('browsing');
        cache = null;
        set({
          ...initialState(),
          library: state.library,
          rescan: state.rescan,
          // Success clears this id and carries the rest: the clear is per id, never a wipe.
          openFailures: clearOpenFailure(id),
          activeTripId: doc.id,
          doc,
          // Both come from the port result and from nowhere else — §2.2a rule 1, §2.2b F2.
          persistence: { savedDoc: doc, savedVersion: stored.version, status: 'idle' },
          ui: { ...initialState().ui, activeDayId: doc.days[0]?.id ?? null, activeCityKey: doc.cities[0]?.key ?? null },
        }, { reseed: true });
        installed = doc;
      } finally {
        releaseTransition();
      }
      // §10.6 property 2 — **once per trip open**, one port call for all of them, and the one
      // moment `available` is allowed to be established. A-57 Part 9 residue 5 records the cost.
      await readPhotoAvailability(installed);
      return state;
    },

    /**
     * Opens another stored trip READ-ONLY beside the active one, for copying stops across
     * (§2.14). It does **not** become the active document, is never dispatched against and
     * is never written back.
     *
     * §4.2 rule **6d** (**A-67** Parts 4 and 6): `browsing` is a guarded slot of its own. It does
     * not flush and never has — nothing here replaces the active document — so it claims on line
     * 1 instead. Two overlapping browses would otherwise let the **older** pane win, and
     * `copyStopInto` reads that pane. A supersession **returns the parsed document** (this method
     * is a navigation, so the abort is silent) without installing it.
     *
     * @throws {Error} if the id is not in storage or the stored document is corrupt.
     */
    async browseTrip(id: string): Promise<Trip> {
      const t = guard.claim('browsing');
      try {
        const stored = await ports.storage.load(id);
        if (stored === null) throw new Error(`browseTrip: no trip ${id} in storage`);
        // §2.9 **A-47** Part 2, the same treatment as `openTrip`: browsing is a real open attempt
        // on a real document (§2.14) and it fails for exactly the same reason. Unchanged, and
        // inside the window.
        let doc: Trip;
        try {
          doc = core.fromJSON(stored.doc);
        } catch (err) {
          noteOpenFailure(id, err);
          throw err;
        }
        if (!guard.current('browsing', t)) return doc;
        set({ ...state, browsing: doc, openFailures: clearOpenFailure(id) });
        return doc;
      } finally {
        guard.release('browsing');
      }
    },

    async closeBrowse(): Promise<AppState> {
      // A SYNCHRONOUS replacement of the slot, which has no window: invalidate, then write
      // (A-67 Part 3). A browse still in flight must not install its pane over a close.
      guard.supersede('browsing');
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
      // Unconditionally `true`: an explicit request, idempotent, not on a render path (A-9).
      cache = retireResolutions(cache, true);
      return state;
    },

    /**
     * "Back to all trips" (App.tsx's brand button). §4.2 rule 6a/6b: the pending write is
     * flushed and awaited first, and a refused flush leaves the trip open with its edit.
     *
     * §4.2 rule **6d** (**A-67** Part 6): a supersession **returns** and installs nothing, as for
     * every navigation.
     */
    async closeTrip(): Promise<AppState> {
      const t = await flushForTransition();
      if (t === null) return state;
      try {
        if (!guard.current('doc', t)) return state;
        // A-68 Part 4 — reseed site 4 of 6. See `createTrip` and `claimTransition`. The document
        // goes to `null` here, so §10.6 has no listing to answer for and nothing is owed after it.
        guard.supersede('photoAvailability');
        guard.supersede('browsing');
        cache = null;
        set({ ...initialState(), library: state.library, rescan: state.rescan, openFailures: state.openFailures }, { reseed: true });
      } finally {
        releaseTransition();
      }
      return state;
    },

    /**
     * Deletes a trip. §4.2 **rule 6c is the one exception to 6a/6b**: deleting the *active*
     * trip cancels the pending timer WITHOUT writing and proceeds anyway — the user asked
     * for that document to be destroyed, and blocking on a refused flush would make a
     * conflicted trip undeletable. Deleting some *other* trip is an ordinary transition and
     * flushes the active document first.
     *
     * §4.2 rule **6d** (**A-67** Part 6): **this is the one transition that claims and never
     * checks.** Its install is computed from `state` at the instant of writing
     * (`if (state.activeTripId === id)`), which is Part 4's criterion answering the question for
     * it. It still claims the **`doc`** slot, because the delete must invalidate an import for a
     * trip it is destroying — and R46-1 face 3's requirement (*no byte record written for a file
     * that had not reached its `write`*) is met by the same check as everything else.
     * **`ports.storage.delete` and the library-row removal are never conditional on a ticket**;
     * only a document *install* is.
     *
     * **A-68 Parts 4 and 6 give this method three things, and two of them are absences.** The
     * **active** branch's reseed supersedes the two ancillary slots (site 5 of 6); the
     * **non**-active branch's install deliberately gets nothing at all, for the reason written
     * beside it; and the `catch` below re-reads availability when the cascade rejects with the
     * trip still open, which is the one exit §10 **A-65 T1** could otherwise be violated through.
     */
    async deleteTrip(id: string): Promise<AppState> {
      // Hoisted to the first line so the failure path below can read it — **A-68 Part 6**. It is
      // the same expression the install is computed from, evaluated before anything can move it.
      const wasActive = state.activeTripId === id;
      if (wasActive) { cancelTimer(); claimTransition(); }
      else if ((await flushForTransition()) === null) return state;
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
      // §10.3's third table row and §6.3's invariant — *"no row and no blob without a live
      // tenancy reference."* The photo bytes for this trip's assets go with it.
      //
      // **It takes no id list, and that is the point** (§10 **A-62** Part 4, QA **R45-3**). With
      // `[tripId, photoId]` in the key, `removeTrip` is a key-range delete: this store does not
      // parse a document to learn what to delete, cannot get the list wrong for a trip it does
      // not have OPEN, and cannot reach across into another trip's records. The first repair for
      // R45-3 read the doomed ids from `ports.storage.load(id)`; A-62 deleted it, because a
      // second mechanism in a caller is what the key shape makes unnecessary.
      //
      // `apps/web`'s `StoragePort` does the same range delete one layer down, inside the single
      // IndexedDB transaction that removes the document — which is what makes it atomic there and
      // is the whole reason §10.3 puts the two new stores in the SAME database. This is the belt:
      // the in-memory port and any future port get the cascade whether or not their storage can
      // span it.
      //
      // **The trip goes either way, and the bytes it leaves are NOT reclaimable** — §10 **A-62**
      // Part 8 residue 4 (QA R46-4, then R47-3). A failed byte delete does not abort the delete,
      // for §4.2 rule 6c's own reason one function up: an ancillary storage failure may not stand
      // between a user and a destruction they explicitly asked for, and `removeTrip` is one
      // transaction over both stores, so a rejection means it aborted WHOLE rather than half-way.
      //
      // What it leaves behind is unreachable, not recoverable. `reclaimPhotoBytes` needs an
      // active document (its `live` guard is `state.doc.photos`) and an id in
      // `state.photos.orphans`, and after a trip delete there is neither, permanently — the
      // document is gone and A-62 Part 4 deliberately removed the id list that would have named
      // the photographs. So these bytes are reclaimed by **A-62 Part 8 residue 2's unbuilt sweep
      // and by nothing before it**; on `apps/web` the braces below (`storage.delete`'s range
      // delete, inside the transaction that drops the document) usually take them anyway.
      try {
        await chainOntoSaving(async () => {
          if (ports.photo) {
            try {
              await ports.photo.removeTrip(id);
            } catch { /* not reclaimable by any shipped mechanism; a failed byte delete may not block a delete */ }
          }
          await ports.storage.delete(id);
          const library = state.library.filter((r) => r.id !== id);
          // §2.9 A-47 Part 2: the row is gone, so an observation about a record that no longer
          // exists is not an observation. Dropped in the same `set`, on both branches.
          const openFailures = clearOpenFailure(id);
          if (state.activeTripId === id) {
            // A-68 Part 4 — reseed site 5 of 6. See `createTrip` and `claimTransition`.
            guard.supersede('photoAvailability');
            guard.supersede('browsing');
            cache = null;
            set({ ...initialState(), library, rescan: state.rescan, openFailures }, { reseed: true });
          } else {
            // **A-68 Part 4.2 item 1 still holds for `photoAvailability` and a builder may NOT add
            // a supersede for it here** — narrowed by §4.2 **A-69** Part 8, not withdrawn. This
            // branch replaces no availability answer, and `ports.photo.removeTrip(id)` above is a
            // key-range delete over *another* trip's key space (§10 **A-62**), so it cannot change
            // what `present()` would answer for the trip that is open. R48-2's face 1 closes
            // **correctly** rather than by compensation: the in-flight read was never stale, so it
            // must be allowed to land.
            //
            // **`browsing` is different, and this is A-69 Part 8 (QA R49-4).** A pane is a
            // read-only view of a document that has just been destroyed, and §2.14's
            // `copyStopInto` copies stops OUT of it — so without this a user can copy from a trip
            // with no row, no record and no bytes, which is `BRIEF.md`'s *"deletion and export as a
            // designed cascade"* with a hole in it. The supersede is **UNCONDITIONAL** because a
            // `browseTrip(id)` whose `load` already resolved would otherwise install its pane one
            // statement after the delete; the write is **conditional** because only the deleted
            // trip's pane is stale.
            //
            // The disclosed cost, in A-67 Part 5's own terms: the unconditional supersede drops a
            // concurrent browse of an *unrelated* trip — the pane does not open and the user taps
            // again. Same shape as A-67 Part 5's deliberate false positive, and cheaper: a browse
            // is a free gesture to repeat and `browsing === null` is terminal (A-68 Part 3
            // consequence 2), so dropping it creates no liveness obligation. **A-68 Part 4.3's
            // removal of the `browsing` claim from the six transitions is not reversed** — this is
            // one `supersede` on one gesture that genuinely destroys a document.
            guard.supersede('browsing');
            set({ ...state, library, openFailures,
              browsing: state.browsing?.id === id ? null : state.browsing });
          }
        });
      } catch (err) {
        // **A-68 Part 6 — the tenth exit, which is neither finding's.** The cascade threw with the
        // trip still open and `ports.photo.removeTrip` may already have run, so what `present()`
        // would answer has changed and no reseed happened to record it. Without this line the
        // listing keeps reading `'ready'` over bytes that are gone — §10 **A-65 T1**'s exact
        // prohibition, produced by a fault path rather than by a race. Ask the port instead.
        //
        // `readPhotoAvailability`'s own claim **is** the invalidation, so there is no supersede
        // here; it touches a different slot from the `doc` claim this still holds, and it
        // dispatches nothing. The happy path is unchanged and costs nothing: the reseed's own
        // supersede covers `removeTrip` there, and a document-less state has no listing to answer
        // for.
        if (wasActive) await readPhotoAvailability(state.doc);
        throw err;
      } finally {
        releaseTransition();
      }
      return state;
    },

    /**
     * **The import saga** — ARCHITECTURE §10.2's five-step flow, in order, and the order is the
     * ruling rather than a preference.
     *
     *   1. `pickImages()` → N files, or `null`. **A cancel is not an error.**
     *   2. Per file, in order: `readExif(bytes)` — pure, core, no port — then
     *      `derive(bytes, type)`.
     *   3. `derive` returns `null` ⇒ **no asset is created.** The file is reported as a failure
     *      by NAME with a reason, and the next file is processed. *"One bad file does not fail
     *      an import."*
     *   4. `write(id, thumb, display)` — **bytes first**.
     *   5. `dispatch(addPhoto(...))` — the document second, through the ordinary reducer →
     *      autosave → `saveIfVersion` chain. **Nothing about the photo path bypasses the fence,
     *      and nothing about it is a new write path to the document.**
     *
     * **Why bytes first**, since it is the one ordering decision here: bytes-then-document
     * leaves orphaned bytes if the document write is refused; document-then-bytes leaves a
     * dangling reference if the byte write fails. The two failures are not symmetric — *"a
     * dangling reference is a record the user can see and cannot fix, while orphaned bytes are
     * invisible, bounded, and reclaimable"* — and the platform produces the second state anyway
     * (Safari evicts under storage pressure and under ITP's non-interaction rule, and an
     * export/restore round trip carries metadata without bytes). So `availability: 'missing'` is
     * a **designed state, not an error path**.
     *
     * The id is minted HERE rather than by `addPhoto`, because step 4 needs it before step 5
     * exists. It comes from the injected `IdPort` like every other id — no `crypto.randomUUID`,
     * no `Math.random` (`cairn-constraints` §4).
     *
     * **A batch belongs to ONE trip, and steps 4 and 5 each check that it still does** (QA
     * **R46-1**, then **R47-1**). `tripId` is captured before the first `await` and is the only
     * trip this batch may write to — bytes *or* record.
     *
     * **The check is a generation, not a trip id** — §4.2 rule **6d**, **A-67** Parts 6 and 7.
     * `guard.observe('doc')` is taken in the same synchronous block as `tripId`, so the two agree
     * by construction, and both loop guards ask *"is the document generation I observed still the
     * current one?"* rather than *"is a trip with this id still around?"*. Identity by id is true
     * of two different document instances for one trip, which is why re-opening the **same** trip
     * mid-batch used to pass both of R46-1's guards on both sides of the transition and cost one
     * photograph per tap, unbounded and unreported (R47-1 face 3: four picked, four decoded, four
     * written, three lost, `failures: []`). A generation is false the instant any transition
     * claims, so the batch stops at the first file whose decode completes on or after it.
     *
     * It stops rather than retargeting, and the abandoned files are reported as **nothing** —
     * §10.6 **A-66** (BUILD-NOTES KD-82, ruled): `PhotoSession` resets at every reseed site, so by
     * the time the loop notices, a failure entry would land against the trip the user moved to and
     * name files that trip never had. `PhotoImportFailure` stays at five arms.
     *
     * **Re-entrancy, and it is QA R45-11's subject.** `importPhotos` takes no guard — a double-tap
     * on an import control starts two of these — so nothing here may be batch-local state written
     * over session state. `failures` accumulates onto `state.photos.failures` one at a time and
     * is cleared only by `dismissPhotoFailures` (§10.6: *"kept until the user dismisses them.
     * Never silently dropped"*), and `pending`/`total` add to an in-flight batch rather than
     * replacing it, so the fraction counts the files actually being processed.
     *
     * **Every write this batch makes to `state.photos` goes through `setBatch`** — §10 **A-66**
     * Part 11 (QA **R50-2**). It is `setPhotos` gated on `guard.current('doc', g)`, and it is what
     * makes the paragraph above true rather than predicted: `fail()` and the progress settlement
     * both write after an `await`, so without it a file picked in trip A was reported by name on
     * trip B, and an abandoned batch subtracted its remaining count from B's own fraction.
     *
     * @throws {Error} if there is no active trip — a programmer error, per §2.1.
     */
    async importPhotos(attach: PhotoAttachRef = { kind: 'trip' }): Promise<AppState> {
      if (!state.doc) throw new Error('importPhotos: no active trip');
      const photo = ports.photo;
      if (!photo) return state;
      // Captured before the first `await`: every byte written by this batch belongs to the trip
      // the user was looking at when they picked the files, and §10.3's key now says so. A
      // `state.doc.id` read after an await could name a different trip (§4.2 rule 6's shape, one
      // subsystem over) and would file the bytes under a tenancy that never asked for them.
      const tripId = state.doc.id;
      // A-67 Part 6, in the SAME synchronous block as `tripId`, and **before** `pickImages()`.
      // `observe` and not `claim`: this batch writes THROUGH the document slot rather than
      // replacing it. `null` means a transition's window is already open — a ticket taken inside
      // it would capture the value that transition has already minted and would survive its
      // install, so it is unrepresentable rather than merely discouraged (A-67 Part 3 item 2).
      const g = guard.observe('doc');
      if (g === null) return state;
      /**
       * **The ONE place this batch writes its own session state** — §10 **A-66** Part 11 (QA
       * **R50-2**), and it is A-69 Part 5's fence shape one subsystem over. `PhotoSession` resets
       * at every reseed, so after a transition `state.photos` belongs to the trip the user moved
       * to: a write from here would put this batch's report, or this batch's remaining count,
       * into a trip that never had these files. Measured before the gate: a decode that failed in
       * trip A named `holiday.jpg` on trip B, and an abandoned four-file batch of A's took four
       * off B's own in-flight fraction, leaving B's spinner reading *"done"* with four files
       * still to come.
       *
       * **Dropped, never retargeted** — `scheduleSave`'s rule for a late timer (QA R3-2), the same
       * answer `removePhoto`'s tail and `reclaimPhotoBytes` already give (A-68 Part 5c). The file
       * genuinely failed, so Part 5 item 1's *"nothing failed"* does not apply; it is dropped
       * anyway because there is nowhere correct to put it, and giving `failures` a tenancy is the
       * machinery A-66 Part 3 already priced and refused.
       *
       * **A gate here and not at each caller**: the callers are an open set that grows every time
       * somebody adds a `setPhotos` to this loop, which is §4.2 **A-69** Part 3's defect in
       * miniature.
       *
       * It gates on the **document**, not on the batch, so it does not and should not separate two
       * batches of the *same* trip — R45-11's subject, unchanged.
       *
       * *(This is the one `setPhotos(` call in the file whose argument is a **variable** rather
       * than a fresh object literal, so excess-property checking does not fire **here**. The A-69
       * Part 5 fence is not weakened: `patch` is already of `setPhotos`' own parameter type, so
       * every `setBatch` call site is checked exactly as a `setPhotos` call site was. Disclosed
       * because `qa/r50-i13h.mjs` **E2** asserts the literal-argument property by grep — BUILD-NOTES
       * **KD-94**.)*
       */
      const setBatch = (patch: Parameters<typeof setPhotos>[0]): void => {
        if (!guard.current('doc', g)) return;
        setPhotos(patch);
      };
      const picked = await photo.pickImages();
      // A cancel. Not an error, not a failure, and it does not clear an earlier batch's report.
      if (picked === null || picked.length === 0) return state;
      // The picker is a modal and the app is frozen behind it — but not on every host, and the
      // fraction must not move for a batch that can no longer land anything.
      //
      // **This explicit check STAYS** (§10 A-66 Part 11): it aborts the whole batch rather than
      // gating one write, which is strictly more, and `setBatch`'s check one statement later is
      // then trivially true.
      if (!guard.current('doc', g)) return state;

      // An idle store starts a fresh fraction; a store with a batch in flight joins it. Read
      // after the `await` above, because that is where the other batch can have started.
      const joining = state.photos.pending > 0;
      setBatch({
        pending: state.photos.pending + picked.length,
        total: (joining ? state.photos.total : 0) + picked.length,
      });
      let remaining = picked.length;

      try {
        for (const f of picked) {
          const fail = (reason: PhotoImportFailure) => {
            // Appended to what the SESSION holds, never to a batch-local array: two overlapping
            // imports must not write over each other's reports (R45-11). Through `setBatch`, so a
            // report for a file picked in this trip can never land on the trip the user moved to
            // (§10 **A-66** Part 11, QA **R50-2**).
            setBatch({ failures: [...state.photos.failures, { name: f.name, reason }] });
          };
          // Refused BEFORE the decode, both of them: a ceiling enforced after `createImageBitmap`
          // has already allocated the bitmap is not a ceiling.
          //
          // **An EMPTY type is not a refusal** (R45-12). Browsers report `File.type === ''` for
          // extensions they do not recognise, and §10.6 defines `'unsupported_type'` as *"the
          // picker returned something we **cannot decode**"* — a claim this layer cannot make
          // without asking. `apps/web`'s port already handles it (`type || 'image/jpeg'`), so
          // refusing here made that line unreachable and the two files disagree.
          if (f.type !== '' && !f.type.startsWith('image/')) fail('unsupported_type');
          else if (f.bytes.length > PHOTO_MAX_INPUT_BYTES) fail('too_large');
          else {
            // Pure, in core, and it never throws for any byte sequence (§10.2 rule 1).
            const meta = core.readExif(f.bytes);
            // **§4.2 A-71 Part 4c, site 3.** The two outcomes this store may name are the port's
            // and are separated here rather than by a `catch` around the whole file: `!ok` is an
            // unexpected throw out of the port (`'storage_failed'`), `value === null` is §10.2
            // rule 1's contract (`'decode_failed'`). Neither can any longer be a subscriber's
            // exception, which is what the deleted per-file `catch` was reporting by file name.
            const d = await attempt(() => photo.derive(f.bytes, f.type));
            if (!d.ok) fail('storage_failed');
            else if (d.value === null) fail('decode_failed');
            else {
              const derived = d.value;
              // **The document this batch belongs to is gone** — QA **R46-1** face 3, then
              // **R47-1**. `deleteTrip`'s cascade may already have run, so a byte record written
              // now can have no document, no library row and nothing that can ever name it:
              // §6.3's *"no row and no blob without a live tenancy reference"*, broken by a race
              // rather than by a missing cascade. The batch stops here, **before the write**, and
              // the user is not told `'storage_failed'` for a trip they deleted themselves.
              // **Nothing is reported at all** — §10.6 **A-66** (KD-82, ruled): the transition has
              // already reseeded `state.photos`, so a failure entry appended now would land
              // against whatever trip the user moved to.
              //
              // This is the guard that used to be `isLiveTrip(tripId)`, deleted at I-13d (A-67
              // Part 7). The generation is strictly stronger — a trip cannot be deleted or
              // re-opened without a claim — and §10 **A-66 Part 10** item 2 is what it buys:
              // §10.4's halving loop makes `derive` seconds of canvas work per file, so the
              // overwhelmingly likely place for a transition to land is inside the decode, where
              // breaking here costs **zero** stranded bytes.
              if (!guard.current('doc', g)) break;
              const id = ports.ids.newId('photo');
              // **§4.2 A-71 Part 4c, site 4.** P9: no asset is created, no orphaned byte record,
              // no partial document write — and `writeFailureReason` still maps
              // `QuotaExceededError` to `'quota_exceeded'` and everything else to
              // `'storage_failed'`, unchanged (Part 5 item 2). The `'handled'` sentinel and the
              // per-file `catch` that existed to read it are both **deleted** (Part 4d): with
              // `derive` and `write` classified, no awaited port call is left inside the loop
              // body, so a `catch` there recording `'storage_failed'` **about the user's file**
              // is a lie in every case that can reach it.
              const w = await attempt(() => photo.write(tripId, id, derived.thumb.bytes, derived.display.bytes));
              if (!w.ok) { fail(writeFailureReason(w.error)); continue; }
              // **The other half of the invariant `tripId` is captured for** — QA **R46-1**, and
              // it is the finding itself. `tripId` pins the BYTES to the trip the user picked
              // from; `state.doc` is live, so without this the RECORD is pinned to whatever trip
              // is open when the decode finishes — and `derive` is seconds of canvas work during
              // which the library and every other trip stay interactive. The two used to be
              // allowed to disagree: the bytes landed under `[A, photo-1]`, the record landed in
              // B, B's listing read `'ready'` over a `read()` that returns `null` and `'missing'`
              // after a re-open, and a `{kind:'day'}` attach made `validateTrip` report
              // `photo_attach_dangling` — the store writing a document its own validator refuses.
              // A-62 is what made that fatal instead of cosmetic: with tenancy in the key, a
              // mismatch is a lost photograph rather than a misfiled one.
              //
              // Stopping is the only correct answer, and it is `scheduleSave`'s rule for a late
              // timer (QA R3-2) one subsystem over: **dropped, never retargeted.** §4.2 rule 1
              // holds exactly one document in memory, so the record cannot be filed into trip A
              // from here, and filing it into trip B would be writing a photograph into a trip
              // that was never asked for it. The bytes stay under their own trip's key, where
              // they are that trip's to reclaim — §10 **A-66 Part 10**: **at most one derivative
              // pair per abandoned batch, and it is a property enforced by a check rather than by
              // where two guards happen to sit.** The residual window is the duration of the
              // `write` above and nothing wider; `removeTrip` is still its only reaper.
              //
              // **The check is `guard.current('doc', g)` and NOT `state.doc?.id !== tripId`**
              // (A-67 Part 7). The old form was R47-1 face 3 in one sentence: identity by id is
              // true of two different document instances for one trip, so re-opening the trip the
              // batch is importing into passed it on both sides of the transition and the record
              // was accepted into a document the reseed was one statement away from replacing.
              // Nothing is reported either, because the transition has already reseeded
              // `state.photos` and the report would land against the wrong trip (A-66 Part 3).
              if (!guard.current('doc', g)) break;
              this.dispatch({
                type: 'addPhoto',
                photo: {
                  id,
                  attach,
                  caption: '',
                  // §10.1: what the FILE said, and `metaSource` records that it was the file.
                  // Never inferred from the stop, the day or anything else.
                  capturedAt: meta.capturedAt,
                  at: meta.at,
                  metaSource: meta.capturedAt || meta.at ? 'exif' : null,
                  // The port's decoded dimensions are authoritative over EXIF's claim: EXIF
                  // describes the file's intent, the decoder describes what came out.
                  source: derived.source,
                  thumb: { w: derived.thumb.w, h: derived.thumb.h, bytes: derived.thumb.bytes.length },
                  display: { w: derived.display.w, h: derived.display.h, bytes: derived.display.bytes.length },
                },
              });
              // The asset exists, so its bytes are available in this session without a re-read.
              //
              // **Only if availability was actually read for THIS trip** — QA R45-4. `available:
              // null` means *"not read"* and not *"read, and empty"*, which is the whole of §10.6
              // property 2; `?? []` collapsed the two, so one import after a failed `present()`
              // built a set holding just the id it had written and stamped `tripId` on it. Every
              // pre-existing photo then read `'missing'`, which §10.6 property 3 renders as *"this
              // photo's image is no longer stored on this device"* over bytes that are on disk.
              // Leaving `null` alone keeps the listing `'loading'` — honestly unknown, not wrong.
              //
              // **A write that changes the subject an in-flight read is reading must invalidate
              // that read** — §4.2 **A-67** Part 4, and the rule is **unconditional** (**A-68**
              // Part 5a, QA **R48-1**). Revision 47 shipped this call *inside* R45-4's value guard
              // below, so with `available === null` a byte `write` invalidated nothing and an
              // availability read issued *before* those bytes existed landed *after* them and
              // reported `'missing'` over them — R45-4's own rendered defect, reached through a
              // third door. It is hoisted out, and R45-4's guard is **kept verbatim, nested inside
              // it**: the two answer different questions (*"is this answer the newest one"* versus
              // *"was availability ever read for this trip"*) and only the first is about ordering.
              //
              // Unconditional within the subject: the step-5 `guard.current('doc', g)` check is
              // one statement up with no `await` since, so `state.doc` is still the document these
              // bytes were written for. A synchronous replacement has no window: invalidate, then
              // write.
              //
              // **The `else` branch that used to raise A-68 Part 5b's owed flag here is DELETED** — §4.2
              // **A-69** Part 6 item 1. A supersede that cannot write the answer still owes one;
              // what changed is *where the debt is paid*. It was paid at a hand-written discharge
              // line below, gated on the **`doc`** slot — the slot every one of A-68 Part 4.1's
              // nine stranding exits bumps — so seven of the nine were re-opened by the fix for the
              // other half of the same finding (QA **R49-1**). It is now paid at A-69's settling
              // boundary, which no exit can miss and which no list has to contain. **The
              // `supersede` above and R45-4's value guard below are untouched: they are *ordering*,
              // a different obligation, and removing either re-opens R48-1.**
              guard.supersede('photoAvailability');
              if (state.photos.available !== null && state.photos.tripId === state.doc.id) {
                const available = new Set(state.photos.available);
                available.add(id);
                setAvailability({ kind: 'ready', tripId: state.doc.id, available });
              }
            }
          }
          remaining--;
          setBatch({ pending: Math.max(0, state.photos.pending - 1) });
        }
      } finally {
        // **§4.2 A-71 Part 4d — group 3a.** Settle THIS batch and no other (R45-11) on EVERY exit,
        // including a throw out of the loop: a flat `pending: 0` would report a concurrent batch
        // as finished, and `remaining` is 0 unless the loop was cut short. The deleted per-file
        // `catch` was keeping the fraction settling **by accident**; this keeps it settling on
        // purpose. **A `finally`, not a statement below the block**, for KD-85's exact reason:
        // `break` and a propagating throw both leave the loop, and a statement below it runs on
        // neither.
        //
        // Through `setBatch` — §10 **A-66** Part 11's second half, and the one a user notices
        // first: an abandoned four-file batch of trip A's used to subtract four from trip B's own
        // in-flight fraction, leaving B's spinner reading *"done"* with four files still to come.
        if (remaining > 0) setBatch({ pending: Math.max(0, state.photos.pending - remaining) });
      }
      // **There is no discharge line here any more** — §4.2 **A-69** Part 6 item 1. A-68's
      // owed-flag discharge — a `guard.current('doc', g)`-gated `await readPhotoAvailability(...)`
      // — is deleted rather than left beside the boundary: its gate was on the `doc` slot, which
      // every non-installing exit bumps, so it did not fire after exactly the exits it was written
      // for (QA **R49-1**). This method settles on the way out through `settling(...)` — on this
      // return and on every throw — and a read this batch dropped settles behind itself at
      // `readPhotoAvailability`'s own tail. Neither costs anything on the ordinary path, which is
      // A-69 Part 12's **G23**.
      return state;
    },

    /**
     * Clears the import failure report — §10.6's *"kept until the user **dismisses** them"*, which
     * had no dismisser at all (QA **R45-13**).
     *
     * It touches `failures` and nothing else: not the document, not availability, not the
     * orphan list. A dismissal is a statement about a **report**, not about the photographs, and
     * it is `void` rather than `Promise` because no port is involved. Idempotent.
     */
    dismissPhotoFailures(): AppState {
      if (state.photos.failures.length > 0) setPhotos({ failures: [] });
      return state;
    },

    /**
     * Re-reads byte availability for the active trip — §10.6 property 6, **A-63** Part 3.
     *
     * `'unreadable'` is a terminal state, and *"a terminal error state with no exit is the
     * unresolving spinner moved one card to the right"*: this is the exit. It is named for
     * `refreshLibrary`/`refreshSummary` rather than `retry…` because it is the same idea — read
     * the fact again, on demand.
     *
     * Two things it deliberately is not. **There is no automatic retry** — a read that failed
     * because IndexedDB is unavailable will fail again, and a loop is not honesty. **There is no
     * in-flight flag**: during a refresh the listing keeps the previous answer until the new one
     * lands, so it does not flicker back through `'loading'`, and the busy state of a *Try again*
     * button belongs to the surface that owns the button.
     */
    async refreshPhotoAvailability(): Promise<AppState> {
      await readPhotoAvailability(state.doc);
      return state;
    },

    /**
     * Removes a photo: **the document record first, the bytes second** — §10.3's table, which is
     * the inverse of import *"and for the same reason: the reachable-but-absent state is the
     * safe one."*
     *
     * A byte delete that fails leaves a **reported** orphan rather than a silent one (§10.2), and
     * nothing sweeps it: reclaiming is an explicit user action, per §6.3's *"a nightly sweeper
     * fails loudly, it does not silently delete."*
     *
     * **Undo restores the record and never the photograph** — §10 **A-65** (QA R45-14), which
     * rules this behaviour and is why it is stated plainly rather than as a defect. History is a
     * `Trip` snapshot, so §10.1 point 1's *"attaching a photo is undoable for free"* is scoped to
     * `addPhoto` and does not hold here: after `removePhoto` + `undo` the asset is back with every
     * field intact — caption, `capturedAt`, `at`, both derivative descriptors, `provenance` — and
     * its bytes are gone, reported as `availability: 'missing'` with §10.6 property 3's offer to
     * re-import. That is the **honest** state, not a degraded one, and the byte delete below is
     * synchronous **by design**: §10.3's cascade table (*"both derivatives, in the same transaction
     * as the document write that drops the asset"*), upheld at A-65.
     *
     * **This is not a gap awaiting a later fix.** A *deferred* byte delete — hold the derivatives
     * until the removal leaves the undo window — was proposed and **refused**. The reason is
     * mechanical: `history` is never persisted and is cleared wholesale at every reseed site in
     * this file (`openTrip`, `closeTrip`, `deleteTrip`, `importDoc`), so *"still in the undo
     * window"* is not a condition anything below the store can key off, and a reload or a trip
     * switch would strand the derivatives of every photograph removed that session, permanently and
     * unreported. **A-65 Part 4** is the argument and it is not re-run here. No timer, no
     * pending-delete queue, no tombstone and no `PhotoAsset` liveness field belongs on this path
     * (§10.1 point 4).
     *
     * @throws {Error} if there is no active trip, or no photo with that id — both §2.1.
     * @throws {Error} `TRANSITION_IN_PROGRESS_MESSAGE` — thrown **through its own `this.dispatch`**
     *         while a document transition is in flight (§4.2 rule **6d**, QA **R48-3**'s second
     *         note). The record is not removed and no byte is touched.
     */
    async removePhoto(photoId: string): Promise<AppState> {
      if (!state.doc) throw new Error('removePhoto: no active trip');
      const tripId = state.doc.id;
      this.dispatch({ type: 'removePhoto', photoId });
      // **A-68 Part 5c — the `doc` observation this method has never had, and the hoist below is
      // what makes its absence load-bearing.** `observe` and not `claim`: this writes THROUGH the
      // document slot, exactly as `importPhotos` does, so it must not invalidate anybody. Taken
      // after the `dispatch`, whose own refusal (A-67 Part 6) means a transition window cannot be
      // open here; `current(slot, null)` is `false` anyway, so no narrowing is needed.
      //
      // Until A-68 a transition landing inside the `remove` below was absorbed *by accident* — the
      // reseed leaves `available === null`, so the value guard did nothing. With the supersede
      // hoisted out of that guard it would fire against the trip the user moved to and drop
      // **that** trip's read: R48-2 committed from a new site by R48-1's own fix.
      const g = guard.observe('doc');
      const photo = ports.photo;
      if (!photo) return state;
      // **§4.2 A-71 Part 4c, site 2.** The byte delete is the only thing whose failure this method
      // may name, so it is the only thing inside the classifier. The tail below emits — a
      // subscriber throwing while rendering a remove that SUCCEEDED was recorded as *"the record
      // is gone and the bytes are not"* over bytes that are gone, and the user was offered a
      // reclaim for a photograph nobody could reclaim.
      const r = await attempt(() => photo.remove(tripId, photoId));
      if (r.ok) {
        // **The whole tail is the subject's**, and a transition landing in the `remove` above takes
        // it away: `state.photos` has already been reseeded for another trip, so an availability
        // write here would edit that trip's set and an orphan appended here would be reported
        // against it (§10 **A-66** Part 3, the same rule the import loop keeps).
        if (guard.current('doc', g)) {
          // A-67 Part 4, hoisted for the same reason as `importPhotos`' (A-68 Part 5a): the
          // `remove` above changed what `present()` would answer, so a read issued before it must
          // not land after it and report bytes that are gone as present — and the rule does not
          // stop applying because this store has not read availability yet.
          guard.supersede('photoAvailability');
          // R45-4's rule, on the other side of the same distinction, kept verbatim and now nested
          // inside the ordering call: an UNREAD availability stays unread. Manufacturing
          // `new Set()` here would answer *"read, and none of this trip's photos have bytes"* on
          // the strength of one delete.
          //
          // **No `tripId` conjunct is added** and A-68 Part 5c says why: under `current('doc', g)`
          // the document has not been replaced, and `photos.tripId` is `null` only when
          // `available` is `null` too, because `readPhotoAvailability` writes the pair together. A
          // conjunct that can never change an outcome is a third answer to R45-4's question.
          //
          // **The `else` that used to raise A-68 Part 5b's owed flag is DELETED** — §4.2 **A-69** Part 6 item 1, the
          // same deletion as `importPhotos`'. The debt is real and is paid at the settling
          // boundary instead of at a discharge line gated on the wrong slot (QA **R49-1**).
          if (state.photos.available !== null) {
            const available = new Set(state.photos.available);
            available.delete(photoId);
            setAvailability({ kind: 'ready', tripId: state.doc.id, available });
          }
          setPhotos({ orphans: state.photos.orphans.filter((id) => id !== photoId) });
        }
      } else {
        // The record is gone and the bytes are not. Observed, recorded, never swept — and reported
        // against the trip it happened to, or not at all. Unchanged to the character: only what
        // can reach this arm has narrowed (Part 5 item 2).
        if (guard.current('doc', g)) {
          setPhotos({
            orphans: state.photos.orphans.includes(photoId)
              ? state.photos.orphans
              : [...state.photos.orphans, photoId],
          });
        }
      }
      // **No discharge line** — §4.2 **A-69** Part 6 item 1, deleted with `importPhotos`'. The
      // `observe('doc')` above and the `guard.current('doc', g)` gate over the whole tail **stay**
      // (A-68 Part 5c): they stop this operation writing into *another* trip's session, which the
      // boundary does not do and is not asked to.
      return state;
    },

    /**
     * Deletes byte records the user has explicitly asked to reclaim — §10.2's *"deleted only by
     * an explicit user action"*, and the only path in this store that removes bytes without a
     * document write in front of it.
     *
     * It refuses any id that a live asset still references, rather than trusting the caller's
     * list: an orphan is a claim about the document, and the document is right here.
     *
     * **The `live` guard became sound at A-62.** Its set is the ACTIVE document's photo ids and
     * its subject is now the active trip's key range, so the two agree by construction — an
     * orphan observed while trip B was open can no longer be reclaimed against trip A. With no
     * active trip there is no key range to reclaim within, so it is a no-op.
     *
     * **The `doc` observation is A-68 Part 5c, applied to the one photo method that never had it**
     * (QA **R50-3**). `kept` is a claim about the document that was open when the loop started, and
     * `setPhotos({ orphans: kept })` sits after an `await`: a reclaim whose byte delete fails while
     * the user navigates would otherwise report trip A's orphan against trip B, which is Part 5c's
     * *"they stop this operation writing into another trip's session"* from a second site. Same
     * pattern as `removePhoto`'s — `observe` and not `claim`, because this writes THROUGH the
     * document slot rather than replacing it, and `current(slot, null)` is `false`, so a reclaim
     * begun inside somebody else's transition window writes nothing rather than writing blind.
     *
     * **No `supersede`, and that is ruled rather than omitted** — §4.2 **A-68** Part 8 item 5, kept
     * verbatim by **A-69** Part 11 item 1: this method's subject is ids that are *not* in
     * `state.doc.photos`, so no `present()` query set contains them and no availability read is
     * stale because of it. Nothing else in the method moves.
     */
    async reclaimPhotoBytes(ids: readonly string[]): Promise<AppState> {
      if (!ports.photo || !state.doc) return state;
      const tripId = state.doc.id;
      const live = new Set(state.doc.photos.map((p) => p.id));
      const g = guard.observe('doc');
      const kept: string[] = [];
      for (const id of state.photos.orphans) {
        if (!ids.includes(id) || live.has(id)) {
          if (!live.has(id)) kept.push(id);
          continue;
        }
        try {
          await ports.photo.remove(tripId, id);
        } catch {
          kept.push(id); // still there, still reported
        }
      }
      // The report belongs to the trip it was observed for, or to nothing — §10 **A-66** Part 3,
      // the rule `removePhoto`'s tail and the import loop both keep.
      if (guard.current('doc', g)) setPhotos({ orphans: kept });
      return state;
    },

    /** Serialises the active trip through the `FilePort`. */
    async exportActive(): Promise<string> {
      if (!state.doc) throw new Error('exportActive: no active trip');
      const text = core.toJSON(state.doc);
      const name = `${slugTitle(state.doc.title)}.cairn.json`;
      if (ports.file) await ports.file.exportDoc(name, new TextEncoder().encode(text));
      return text;
    },

    /**
     * The stored document for `id`, byte-for-byte, with **no parse** — ARCHITECTURE §2.9
     * **A-46** Part 4, ROADMAP Phase 2 **I-8e**. This is the export path for a trip that
     * cannot be **opened**.
     *
     * The gap it closes (QA **R34-2**): `exportActive` requires `openTrip`, and `openTrip` is
     * exactly what §2.9 **A-45** made throw for a document carrying a calendar-invalid date —
     * so the only affordance left on that card was Delete, with the bytes sitting intact in
     * storage. *"Deletion and export as a designed cascade"* is public-grade from day one, and
     * an export that works only for documents we can already read is not that cascade.
     *
     * Five clauses, and they are the whole of it:
     *
     *   - **`ports.storage.load(id)` then `ports.file.exportDoc`, both of which already exist.**
     *     No `StoragePort` change, no `FilePort` change, no new port method. As with
     *     `exportActive`, the text is returned even when `ports.file` is absent, which is what
     *     makes this checkable in bare Node against `ports/memory.ts`.
     *   - **The bytes are `stored.doc` verbatim.** No re-serialisation, no normalisation, no
     *     repair, no envelope, no `StorageVersion` (§2.2a rule 4 — an export carries no storage
     *     state). Any transformation would be a guess about a document we have just said we
     *     cannot read, and *"a silently corrected date is a guessed date"* (A-45 Part 3).
     *   - **The filename is deliberately not a backup's**: `.cairn-unreadable.json`, not
     *     `.cairn.json`. Restoring it is guaranteed to be refused with the same message, and
     *     handing the user something that looks restorable would be the promise broken one
     *     screen later.
     *   - **No ownership check, stated rather than skipped.** `importDoc` already refuses a
     *     foreign `ownerId`, so Phase 1 storage holds only this user's documents — and the check
     *     cannot be performed anyway, because parsing is the thing that fails. **This is safe
     *     only while storage is single-owner (`LOCAL_OWNER`) and must be revisited when Phase 3
     *     accounts can put another person's document on the device.**
     *   - **It touches no state:** no flush, no `set()`, no transition. It is a read, so it does
     *     not queue behind the save chain and cannot disturb an open trip. **Amended by §2.9
     *     A-47 Part 5 (QA R35-5): it gains a PRECONDITION rather than losing that property.**
     *     `id === state.activeTripId` is refused as a programmer error, because the stored bytes
     *     for the open document may be superseded by a pending debounced write and
     *     `exportActive()` is the correct export for it. The fix is deliberately *not* a flush:
     *     making a **rescue** read queue behind the save chain would make the rescue fail in
     *     exactly the state the app is unhealthy (`persistence.status === 'conflict'`), which is
     *     the worst possible coupling for the one path that exists to get a user's bytes out. It
     *     costs no behaviour anyone can reach — by construction the active document *parsed*, so
     *     it has `exportActive()` and never needs the rescue path.
     *
     * The title for the filename comes from the **library row**, not from the document: reading
     * it out of the document would be a parse. A row that is not in the library falls back to
     * the id.
     *
     * @throws {Error} if `id` is the active trip (§2.9 A-47 Part 5 — a programmer error).
     * @throws {Error} if nothing is stored under `id`.
     */
    async exportStoredDoc(id: string): Promise<string> {
      if (id === state.activeTripId) {
        throw new Error(
          `exportStoredDoc: ${JSON.stringify(id)} is the active trip — use exportActive(); ` +
            'the stored bytes may be superseded by a pending write.',
        );
      }
      const stored = await ports.storage.load(id);
      if (!stored) throw new Error(`exportStoredDoc: nothing is stored under ${JSON.stringify(id)}`);
      const text = stored.doc;
      const title = state.library.find((r) => r.id === id)?.title ?? id;
      const name = `${slugTitle(title)}.cairn-unreadable.json`;
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
     * §4.2 rule **6d** (**A-67** Part 6): a supersession **throws**, as for every creation path.
     * The window covers `fromJSON`, the ownership refusal and the whole id-minting loop — which
     * is several `ports.storage.load` awaits, and is exactly the shape R47-1 measured in
     * `openTrip`.
     *
     * @throws {TripParseError} with a JSON path for a malformed file.
     * @throws {Error} for a document owned by another person.
     * @throws {Error} `TRANSITION_SUPERSEDED_MESSAGE` if a newer transition claimed the document
     *         while this one was being prepared. Nothing is installed and nothing is written.
     */
    async importDoc(text: string): Promise<AppState> {
      const t = await flushForTransition();
      if (t === null) return state;
      try {
        let doc = core.fromJSON(text);
        const owner = localOwner();
        // §2.14 rule 1 refuses a document whose `ownerId` is "present and is neither the local
        // user … nor absent" — so the refusal is on a PRESENT, foreign owner, and an ownerless
        // document (an old export, a build older than the field) is a backup of this user's own
        // trip. It is adopted here rather than in `fromJSON`, because this is the only layer
        // that knows who the local user is; core carries absence through as `''` and
        // `validateTrip` reports `owner_missing` for anything that reaches it still ownerless.
        // Adopting an ownerless file is not rule 1's "it does not adopt ownership": that
        // sentence is about the document owned by somebody else, which is still refused.
        if (doc.ownerId && doc.ownerId !== owner) throw new core.ForeignDocumentError(doc.ownerId, owner);
        if (!doc.ownerId) doc = { ...doc, ownerId: owner };
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
        if (!guard.current('doc', t)) throw new Error(TRANSITION_SUPERSEDED_MESSAGE);
        // A-68 Part 4 — reseed site 6 of 6. See `createTrip` and `claimTransition`.
        guard.supersede('photoAvailability');
        guard.supersede('browsing');
        cache = null;
        set({
          ...initialState(),
          library: state.library,
          rescan: state.rescan,
          // Carried, and deliberately **not cleared** (A-47 Part 2): `importDoc` never overwrites
          // an existing document — on an id collision it mints a fresh id above — so it cannot
          // repair an id already in `openFailures`. A clear here would be code that can never fire.
          openFailures: state.openFailures,
          activeTripId: doc.id,
          doc,
          ui: { ...initialState().ui, activeDayId: doc.days[0]?.id ?? null, activeCityKey: doc.cities[0]?.key ?? null },
        }, { reseed: true });
      } finally {
        releaseTransition();
      }
      // Both **after the release** — A-67 Part 6.
      await save();
      // §10.6 property 5's terminal guarantee — **A-63**. A restored document becomes the active
      // one without going through `openTrip`, so nothing here used to establish availability and
      // its listing sat at `'loading'` until the trip was closed and re-opened: the unresolving
      // spinner §10.6 opens by forbidding, on the one path a user takes right after a restore.
      // The answer it gets is `'ready'` with every photo `'missing'`, which is exactly right — §7
      // has always said an export carries metadata without bytes.
      await readPhotoAvailability(state.doc);
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
  });
}
