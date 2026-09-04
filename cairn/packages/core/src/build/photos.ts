/**
 * Photo editing (ARCHITECTURE §10.1, §10.3, **A-57** Part 6).
 *
 * Three build functions in the shape §2.1 requires of every one: `(trip, args) => Trip`, pure,
 * immutable, `revision` bumped **once** each. Nothing here touches bytes — §10.1 point 1: the
 * record lives in the document and the bytes never do, so attaching a photo is undoable for
 * free because history is a `Trip` snapshot (§2.7 A-6a point 4's precedent).
 */
import type { LatLng, PhotoAsset, PhotoAttachRef, PhotoDerivative, Provenance, Trip } from '../model/types.ts';
import type { ClockTime, IsoDate, PhotoId } from '../model/ids.ts';
import { userProvenance } from '../model/provenance.ts';
import type { BuildCtx } from './createTrip.ts';

export type PhotoInit = {
  id?: PhotoId;
  attach?: PhotoAttachRef;
  caption?: string;
  capturedAt?: { date: IsoDate; time: ClockTime } | null;
  at?: LatLng | null;
  metaSource?: 'exif' | 'user' | null;
  source?: { w: number; h: number } | null;
  thumb: PhotoDerivative;
  display: PhotoDerivative;
  provenance?: Provenance;
};

/**
 * A-57 Part 3, enforced rather than described.
 *
 * §8.6's model carries four arms and §10.1's type carries all four so that adding `place` is a
 * build change and not a schema change — but only three are BUILT, and the reason is not photos
 * at all. §2.13 **A-6a**'s prune deletes a copy-borne `Place` when the last stop referencing it
 * goes; with photos referencing places, that prune can delete a `Place` a photograph still
 * points at. The increment that adds `place` attachment does A-6a's reference-counted delete
 * **first**, as its own pass.
 *
 * Refused here — as a throw, because §2.1 makes an unbuilt capability a programmer error rather
 * than a domain problem — so the deferral cannot be defeated by a caller who read the union and
 * not the ruling.
 */
function assertBuiltAttach(where: string, attach: PhotoAttachRef): void {
  if (attach.kind === 'place') {
    throw new Error(
      `${where}: attaching a photo to a place is not built (ARCHITECTURE §10.1, A-57 Part 3). ` +
        'The increment that adds it does §2.13 A-6a\'s reference-counted Place delete first. ' +
        'Attach to the stop, the day or the trip.',
    );
  }
}

/** Adds a photo. `attach` defaults to the trip — §8.6's honest "somewhere on this trip". Pure. */
export function addPhoto(trip: Trip, init: PhotoInit, ctx: BuildCtx): Trip {
  const attach: PhotoAttachRef = init.attach ?? { kind: 'trip' };
  assertBuiltAttach('addPhoto', attach);
  const photo: PhotoAsset = {
    id: init.id ?? ctx.ids.newId('photo'),
    attach,
    caption: init.caption ?? '',
    capturedAt: init.capturedAt ?? null,
    at: init.at ?? null,
    metaSource: init.metaSource ?? null,
    source: init.source ?? null,
    thumb: { w: init.thumb.w, h: init.thumb.h, bytes: init.thumb.bytes },
    display: { w: init.display.w, h: init.display.h, bytes: init.display.bytes },
    // A-57 Part 4: full `Provenance`, not the simpler thing it looks like. A photo the user
    // picked and attached is `{user, accepted, confirmed}` and `displayStatus` returns `'own'`.
    provenance: init.provenance ?? userProvenance(ctx.now, ctx.actorUserId ?? null),
  };
  return { ...trip, photos: [...trip.photos, photo], revision: trip.revision + 1 };
}

export type PhotoPatch = {
  caption?: string;
  at?: LatLng | null;
  capturedAt?: { date: IsoDate; time: ClockTime } | null;
  attach?: PhotoAttachRef;
  metaSource?: 'exif' | 'user' | null;
  source?: { w: number; h: number } | null;
};

/**
 * Keys a patch may never carry — `updateStop`'s `FORBIDDEN_PATCH_KEYS`, one record over, and
 * for §2.1's reason: *"every `*Patch` type is enforced at runtime by an explicit key allowlist,
 * not by TypeScript"*, because every caller that matters is `any`-shaped at its boundary.
 *
 * - `id` dangles the byte records stored under it, which is worse here than for a stop: the
 *   bytes are in another object store and nothing would ever find them again.
 * - `thumb`/`display` describe bytes that were written once at import and are never rewritten
 *   (§10.3), so a patched dimension is a lie about a file on disk.
 * - `provenance` turns a system suggestion into the user's own plan — the one convention the
 *   root `CLAUDE.md` calls absolute. Use `acceptCandidate` / `rejectCandidate`.
 */
const FORBIDDEN_PHOTO_PATCH_KEYS = ['id', 'thumb', 'display', 'provenance'] as const;

/** @throws {Error} on any forbidden key, present even with an `undefined` value. */
function assertPatchable(patch: object): void {
  for (const k of FORBIDDEN_PHOTO_PATCH_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      throw new Error(
        `updatePhoto: "${k}" may not be patched — ` +
          (k === 'provenance'
            ? 'use acceptCandidate / rejectCandidate'
            : k === 'id'
              ? 'a photo id is immutable, and its byte records are stored under it'
              : 'a derivative describes bytes that were written once at import (§10.3)'),
      );
    }
  }
}

/**
 * Patches a photo's caption, coordinate, capture time or attachment. Pure.
 *
 * @throws {Error} if no photo with that id exists, if the patch carries a forbidden key, or if
 *         it attaches to a place (A-57 Part 3) — all three programmer error, per §2.1.
 */
export function updatePhoto(trip: Trip, photoId: PhotoId, patch: PhotoPatch): Trip {
  assertPatchable(patch);
  if (patch.attach) assertBuiltAttach('updatePhoto', patch.attach);
  const i = trip.photos.findIndex((p) => p.id === photoId);
  if (i < 0) throw new Error(`updatePhoto: no such photo ${photoId}`);
  const photos = trip.photos.slice();
  photos[i] = { ...photos[i], ...patch };
  return { ...trip, photos, revision: trip.revision + 1 };
}

/**
 * Removes a photo's record. Pure. **The bytes are the caller's second step**, in that order:
 * §10.3's table puts the document write first for a delete, which is the inverse of import,
 * *"and for the same reason: the reachable-but-absent state is the safe one."*
 *
 * @throws {Error} if no photo with that id exists.
 */
export function removePhoto(trip: Trip, photoId: PhotoId): Trip {
  if (!trip.photos.some((p) => p.id === photoId)) throw new Error(`removePhoto: no such photo ${photoId}`);
  return { ...trip, photos: trip.photos.filter((p) => p.id !== photoId), revision: trip.revision + 1 };
}

/**
 * §10.3's loosening, applied by the actions that cause it — **not exported from `index.ts`**.
 *
 * *"Deleting a stop or a day removes nothing automatically. Its photos' `attach` falls back to
 * `{kind:'trip'}` rather than being deleted. A photograph is not a plan and deleting a plan may
 * not destroy a memory of it."* (§10.3's table; A-57 Part 9 residue 2.)
 *
 * Called from `removeStop` and from `ensureDays` — the only two functions in core that can make
 * a `stopId` or a `dayId` stop existing. It does **not** bump `revision`: the caller has already
 * bumped it once for its own edit, and this is the same edit, not a second one. Returns the
 * trip unchanged, by reference, when nothing dangles — so the common path allocates nothing and
 * the client's derived cache (keyed on document identity, §4.2 rule 3) is not invalidated.
 *
 * `validateTrip`'s `photo_attach_dangling` is the other half and is not made redundant by this:
 * it reports the documents that never went through either action.
 */
export function reattachDanglingPhotos(trip: Trip): Trip {
  if (trip.photos.length === 0) return trip;
  let dayIds: Set<string> | null = null;
  let stopIds: Set<string> | null = null;
  let changed = false;
  const photos = trip.photos.map((p) => {
    if (p.attach.kind === 'day') {
      if (dayIds === null) dayIds = new Set(trip.days.map((d) => d.id));
      if (dayIds.has(p.attach.dayId)) return p;
    } else if (p.attach.kind === 'stop') {
      if (stopIds === null) {
        stopIds = new Set<string>();
        for (const d of trip.days) for (const s of d.stops) stopIds.add(s.id);
        for (const s of trip.pool) stopIds.add(s.id);
      }
      if (stopIds.has(p.attach.stopId)) return p;
    } else return p;
    changed = true;
    return { ...p, attach: { kind: 'trip' as const } };
  });
  return changed ? { ...trip, photos } : trip;
}
