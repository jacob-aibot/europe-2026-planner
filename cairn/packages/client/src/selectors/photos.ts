/**
 * The three photo selectors of ARCHITECTURE **§10.6** — *"the signals the data layer owes a UI"*.
 *
 * The UI is a later increment. **The signals are not**, because a surface built on the wrong
 * signals produces dishonest states: a spinner that never resolves, an *"empty"* that is really
 * a failure, a broken image icon where a sentence belongs. All three are pure, all three are
 * derived, and none of them holds a byte.
 *
 * Six properties a consuming surface may rely on, and they are the contract:
 *
 *   1. **Aspect ratio is known before bytes are.** `asset.thumb.w/h` is on the record (§10.4),
 *      so a skeleton is the right shape and nothing reflows when an image lands.
 *   2. **`'loading'` and `'empty'` are never the same value.** Availability is read once, on
 *      open, through `present(ids)` — one port call, not one per photo.
 *   3. **`'missing'` is a sentence, not a broken image.** The asset is still there, still has
 *      its caption, its date and its place; only the bytes are gone. A surface says *"this
 *      photo's image is no longer stored on this device"* and offers re-import. It never renders
 *      a `null` object URL.
 *   4. **A failure is attributable.** `failures` carries the **file name**, so *"3 of 12 photos
 *      could not be added"* can name which three and why. A count with no names is the *"a count
 *      is not a result"* failure ROADMAP sequencing rule 5 forbids.
 *   5. **`'loading'` always terminates** (**A-63**, QA R45-5). Exactly one of `'empty'`,
 *      `'ready'` or `'unreadable'` follows every `'loading'`, for every trip — including a trip
 *      with no photos and a host with no photo port, the two paths that skip the port entirely.
 *      A failed read is a fourth state and never a permanent first one.
 *   6. **An `'unreadable'` listing carries an action, not just a diagnosis.** The store exposes
 *      `refreshPhotoAvailability()`, so *"we could not check whether these images are still on
 *      this device"* comes with **Try again**.
 */
import type { PhotoAsset, PhotoAttachRef, PhotoId } from '../deps.ts';
import type { AppState, PhotoImportFailure } from '../store/reducer.ts';

/** Import in flight. Session-scoped — §2.9 A-47's shape: an observation, not a record. */
export type PhotoImport = {
  /** Files still being decoded and written. 0 when nothing is running. */
  pending: number;
  /** Files in this batch, total. `pending`/`total` is an honest progress fraction. */
  total: number;
  /** Per-file failures, kept until the user dismisses them. Never silently dropped. */
  failures: ReadonlyArray<{ name: string; reason: PhotoImportFailure }>;
};

/** Pure. The three numbers a progress surface needs and nothing it does not. */
export function photoImport(state: Pick<AppState, 'photos'>): PhotoImport {
  const { pending, total, failures } = state.photos;
  return { pending, total, failures };
}

/** What a surface renders for one attachment point. */
export type PhotoListing = {
  /**
   * `'loading'` — availability has not been read yet for this trip. `'empty'` — read, and there
   * are none. `'ready'` — read, and there is at least one. `'unreadable'` — the read was
   * **attempted and it failed**, which is a fourth thing and not a slower `'loading'`
   * (**A-63**, QA R45-5).
   *
   * `'empty'` and `'loading'` are **different** and a surface that collapses them shows *"no
   * photos yet"* to someone whose photos are one tick away. This is A-31 Part 4's *"no places
   * yet"* sentence, on a second subject. `'unreadable'` and `'loading'` are different for the
   * stronger reason: **`'loading'` is transient by contract** — exactly one of `'empty'`,
   * `'ready'` or `'unreadable'` follows every one of them, for every trip, including a trip with
   * no photos and a host with no photo port — and `'unreadable'` is terminal, so collapsing them
   * is the unresolving spinner §10.6's opening sentence forbids.
   */
  phase: 'loading' | 'empty' | 'ready' | 'unreadable';
  items: ReadonlyArray<{
    asset: PhotoAsset;
    /**
     * `'missing'` is EXPECTED, not an error: eviction, or a restored export. §10.2.
     *
     * `'unknown'` is the `'unreadable'` phase's only value — we did not learn whether this
     * photo's bytes are there, and saying `'missing'` instead invites the user to re-import
     * photographs that never left (QA R45-4).
     */
    availability: 'ready' | 'missing' | 'unknown';
  }>;
  /**
   * How many of `items` are `'missing'`, so a surface can say so once instead of N times.
   *
   * **`0` on `'unreadable'`, by its own definition** — none is *known* to be missing. There is
   * deliberately no `unknown` counter: on that branch it is `items.length`, and a second
   * spelling of a derivable number is how two readers come to disagree.
   */
  missing: number;
  /**
   * The port's own words for why the read failed. **Non-null on `'unreadable'` and null on every
   * other phase** — `travelHistory`'s `{ok:false, message}` shape (§8.4 A-46/A-59), one subject
   * over, including its disclosure: it may exceed what a shipped surface reads today. It carries
   * no photo id, no caption and no coordinate (§6.1 rule 1).
   */
  message: string | null;
};

/** True when `asset` hangs off exactly this attachment point. Pure; no coordinate is read. */
function matches(asset: PhotoAsset, ref: PhotoAttachRef): boolean {
  const a = asset.attach;
  if (a.kind !== ref.kind) return false;
  if (a.kind === 'day' && ref.kind === 'day') return a.dayId === ref.dayId;
  if (a.kind === 'stop' && ref.kind === 'stop') return a.stopId === ref.stopId;
  if (a.kind === 'place' && ref.kind === 'place') return a.placeId === ref.placeId;
  return a.kind === 'trip';
}

/**
 * Photos for one attachment point, with their byte availability. Pure.
 *
 * The `'loading'` branch is deliberately wider than *"`available === null`"*: a set read for
 * **another** trip answers for the wrong trip, and answering for the wrong trip is worse than
 * saying "not yet". That is the same reasoning §2.7 A-5 gives for a retirement ledger never
 * crossing a trip.
 *
 * **No document at all is `'empty'`, not `'loading'`.** There is no trip open, so there is
 * nothing to wait for, and a spinner over nothing is the dishonest state §10.6 exists to stop.
 */
export function photosFor(state: AppState, ref: PhotoAttachRef): PhotoListing {
  const doc = state.doc;
  if (!doc) return { phase: 'empty', items: [], missing: 0, message: null };
  const { available, availabilityError, tripId } = state.photos;
  const found = doc.photos.filter((p) => matches(p, ref));
  // **The read was attempted and it failed** — A-63. The assets are document facts and are known
  // either way, so `items` is populated and only their byte availability is `'unknown'`. A
  // failure recorded for ANOTHER trip is not this trip's answer, and is `'loading'` below.
  if (available === null && availabilityError !== null && tripId === doc.id) {
    if (found.length === 0) return { phase: 'empty', items: [], missing: 0, message: null };
    return {
      phase: 'unreadable',
      items: found.map((asset) => ({ asset, availability: 'unknown' as const })),
      missing: 0,
      message: availabilityError,
    };
  }
  if (available === null || tripId !== doc.id) return { phase: 'loading', items: [], missing: 0, message: null };
  if (found.length === 0) return { phase: 'empty', items: [], missing: 0, message: null };
  const items = found.map((asset) => ({
    asset,
    availability: available.has(asset.id) ? ('ready' as const) : ('missing' as const),
  }));
  return {
    phase: 'ready',
    items,
    missing: items.filter((i) => i.availability === 'missing').length,
    message: null,
  };
}

/**
 * Byte records no live asset references — §10.2's reclaimable orphans. **Never auto-deleted.**
 *
 * A read of what this session observed, not a sweep: see `PhotoSession.orphans` for why the
 * distinction is load-bearing. A surface offers *"reclaim N stored images that no photo uses"*
 * as an explicit action and never performs it on its own.
 */
export function orphanPhotoBytes(state: Pick<AppState, 'photos'>): readonly PhotoId[] {
  return state.photos.orphans;
}
