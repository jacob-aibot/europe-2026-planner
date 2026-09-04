/**
 * `StoragePort` over IndexedDB.
 *
 * IndexedDB rather than localStorage for two reasons: a 176 KB trip is already past what
 * localStorage is comfortable with, and localStorage is synchronous — a save would block
 * the frame. An *installed* web app keeps its storage across the 7-day eviction rule
 * (ARCHITECTURE §1.1); a plain tab may not, which is why export exists.
 *
 * The write fence is the opaque `StorageVersion` of §2.2a, held in the record's envelope —
 * a separate `versions` object store, beside the document and never inside it.
 *
 * **It is 16 bytes of fresh CSPRNG output per mint, base64url-encoded, derived from nothing
 * else** (§2.2a rule 2, argument (b): at least 128 bits of fresh entropy per mint). Revision
 * 3 minted `` `${epoch}.${n}` `` and QA R4-2 is the bill: the `epoch` was read once at open
 * and remembered in this closure, so a tab alive across a site-data clear (or §1.1's 7-day
 * eviction) kept minting against a dead epoch and a counter genuinely reset to zero, and
 * reproduced a token it had already issued — verified in Chromium, byte for byte. The counter
 * half was always sound; the remembered half was not. §2.2b F3 now forbids it outright, and
 * there is nothing left here to remember: no `epoch`, no storage-wide counter, no `meta`
 * store. A single random token per write does both jobs the pair was doing — distinct within
 * a database, and distinct across a database's recreation — and cannot go stale.
 *
 * **`crypto.getRandomValues`, never `crypto.randomUUID`.** `randomUUID` is a secure-context-
 * only API and is `undefined` when a page is served over plain HTTP from a LAN address, which
 * is exactly how `tools/serve.mjs` would be used to open this on a phone. `getRandomValues`
 * is available in insecure contexts. There is no `Math.random()` fallback: `Math.random()` is
 * not a CSPRNG and its collision behaviour is not the one rule 2(b) is claiming, so if no
 * CSPRNG is present the port **throws** and the store shows `'error'`. A fence fails closed.
 */
import type { PhotoPort, SaveOutcome, StoragePort, StoredDoc, StorageVersion, TripDoc } from '@cairn/client';
import type { PhotoId, TripSummaryRow } from '@cairn/core';

const DB_NAME = 'cairn';
/**
 * 2 added `versions` and `meta` — the §2.2a envelope.
 * 3 drops `meta` again: R4-2 deleted the epoch and the storage-wide counter it held.
 * 4 adds `photos` and `photoThumbs` — ARCHITECTURE §10.3, Phase 2 I-13.
 *
 * **Why the same database and not a second one.** §6.3's invariant is *"no row and no blob
 * without a live tenancy reference."* Deleting a trip must remove its documents, its summary
 * row, its fence **and** its photo bytes, and **IndexedDB transactions do not span databases**.
 * One database means `delete(tripId)` stays one atomic step; two databases means an orphan
 * window on every delete, which is precisely the failure §6.3 exists to make impossible.
 */
const DB_VERSION = 4;
const DOCS = 'docs';
const SUMMARIES = 'summaries';
const VERSIONS = 'versions';
/**
 * §10.3's two byte stores, keyed by `PhotoId`, each holding a bare **`ArrayBuffer`**.
 *
 * **Why separate stores and not a field on the `docs` record.** The `docs` record is rewritten by
 * every `saveIfVersion`; a 3 MB derivative sitting in it would be re-serialised and re-written on
 * every debounced edit of the trip's title. Photo bytes are written **once**, at import, and
 * never updated — so they belong in a store whose access pattern matches.
 *
 * **Why `ArrayBuffer` and not `Blob`.** (a) Consistency with what already exists:
 * `FilePort.importDoc` already produces `new Uint8Array(await file.arrayBuffer())` and
 * `PhotoPort` speaks `Uint8Array`, so the port boundary already speaks buffers — and
 * `packages/client` may not touch the DOM (`cairn-constraints` §5), which `Blob` is. (b) A
 * documented history of WebKit-specific `Blob`-in-IndexedDB defects (WebKit #198278), recorded by
 * §10.3 as a **marked risk rather than a claim** because the tracker was unreachable when it was
 * written. (a) is sufficient on its own. The `Blob` is reconstructed in the view layer, where DOM
 * types belong.
 *
 * **No `StorageVersion` on a photo byte record, and that is not an oversight.** §2.2a's fence
 * exists because two tabs can edit the same MUTABLE document concurrently. A photo byte record is
 * written once under a freshly minted id and is never updated — there is no second writer to lose
 * to. Its *reference* lives in the trip document and **is** fenced, by the existing mechanism,
 * unchanged.
 */
const PHOTOS = 'photos';
const PHOTO_THUMBS = 'photoThumbs';
/** The store revision 2 kept the epoch and counter in. Deleted on upgrade, never recreated. */
const DEAD_META = 'meta';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DOCS)) db.createObjectStore(DOCS);
      if (!db.objectStoreNames.contains(SUMMARIES)) db.createObjectStore(SUMMARIES);
      if (!db.objectStoreNames.contains(VERSIONS)) db.createObjectStore(VERSIONS);
      // §10.3, DB_VERSION 4. Created empty; every existing database gains them on next open,
      // and a build that predates them simply never opens version 4.
      if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS);
      if (!db.objectStoreNames.contains(PHOTO_THUMBS)) db.createObjectStore(PHOTO_THUMBS);
      // Nothing reads it and nothing may start: a value a token was derived from is exactly
      // what §2.2b F3 forbids remembering, so it does not get to sit there looking useful.
      if (db.objectStoreNames.contains(DEAD_META)) db.deleteObjectStore(DEAD_META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexedDB.open failed'));
  });
}

/**
 * Every `PhotoId` a stored trip document references — read from the DOCUMENT, inside the caller's
 * transaction, so the cascade needs no second index to go stale.
 *
 * **Total, and it never throws**, for the same reason §2.2a stopped parsing the document to run
 * the write fence: *"a guard that depends on parsing user-controlled bytes is a guard whose
 * refusal behaviour is decided by an attacker's JSON."* Here the consequence of a failed parse is
 * strictly bounded — some byte records are not swept, which is §10.2's **reclaimable orphan**
 * state, reported by `orphanPhotoBytes` and deleted only by an explicit user action. A corrupt
 * document may not make a trip undeletable.
 *
 * It reads `id` and nothing else: no caption, no coordinate, no date. §10.5's cross-cutting rule
 * is easiest to break exactly here, so this function never touches a field that could break it.
 */
function photoIdsOf(doc: unknown): string[] {
  try {
    if (typeof doc !== 'string') return [];
    const parsed: unknown = JSON.parse(doc);
    const photos = (parsed as { photos?: unknown } | null)?.photos;
    if (!Array.isArray(photos)) return [];
    return photos
      .map((p) => (p as { id?: unknown } | null)?.id)
      .filter((id): id is string => typeof id === 'string' && id !== '');
  } catch {
    return [];
  }
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        // Quota errors surface on the transaction, not always on the request.
        req.onerror = () => reject(req.error ?? new Error(`${store}: request failed`));
        tx.onabort = () => reject(tx.error ?? new Error(`${store}: transaction aborted`));
        tx.oncomplete = () => db.close();
      }),
  );
}

/**
 * Mints one `StorageVersion`: 16 bytes of fresh CSPRNG output, base64url-encoded.
 *
 * Derived from nothing — no argument, no closure variable, no field of anything. That is
 * §2.2b F3's check passing by construction rather than by inspection.
 *
 * @throws {Error} if no CSPRNG is available. A fence fails closed; it does not degrade to
 *         `Math.random()`, which is not a CSPRNG and whose collision behaviour is not the one
 *         §2.2a rule 2(b) is claiming. (`browserIds()` has a non-CSPRNG fallback for *ids*;
 *         ids are content, not fences, so that is not a defect there and not reusable here.)
 */
function mintVersion(): StorageVersion {
  const c = globalThis.crypto as { getRandomValues?: <T extends ArrayBufferView>(a: T) => T } | undefined;
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error(
      'This browser exposes no cryptographic random source, so Cairn cannot mint a save ' +
        'fence and refuses to write rather than risk overwriting another tab.',
    );
  }
  const bytes = c.getRandomValues(new Uint8Array(16));
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Impure: talks to IndexedDB. Every method rejects rather than swallowing — the store turns
 * a rejection into `persistence.status = 'error'`, which is the visible failure the roadmap
 * requires.
 */
export function indexedDbStorage(): StoragePort {
  let ready: Promise<void> | null = null;

  /**
   * The one-time upcast of §2.2a.
   *
   * Jacob's existing IndexedDB has records that predate the fence and carry no envelope
   * version. Every one is stamped with a fresh version in **one `readwrite` transaction at
   * open, once, before any read is served** — so `load()` stays `readonly` and no code path
   * above the port ever sees a versionless record. Two tabs may both run this; IndexedDB
   * serializes the transactions and the second finds nothing left to stamp.
   *
   * Memoising this promise is legal under §2.2b F3 and is named as the distinction the check
   * exists to draw: a `Promise<void>` carries no value and cannot be wrong about one, and the
   * only records that need stamping predate the fence and cannot appear after it. What was
   * illegal was memoising the `epoch` a later token was *derived from*.
   */
  function ensureReady(): Promise<void> {
    if (ready) return ready;
    ready = open().then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const tx = db.transaction([DOCS, VERSIONS], 'readwrite');
          const versions = tx.objectStore(VERSIONS);
          const docKeys = tx.objectStore(DOCS).getAllKeys();
          docKeys.onsuccess = () => {
            const versionKeys = versions.getAllKeys();
            versionKeys.onsuccess = () => {
              const have = new Set(versionKeys.result.map((k) => String(k)));
              for (const key of docKeys.result) {
                if (have.has(String(key))) continue;
                // Same mint as every other write. There is no longer anything else to stamp with.
                versions.put(mintVersion(), key);
              }
            };
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error ?? new Error('storage upcast failed'));
          tx.onabort = () => reject(tx.error ?? new Error('storage upcast aborted'));
        }),
    );
    // A failed upcast must be retryable rather than poisoning the port forever.
    ready = ready.catch((e: unknown) => {
      ready = null;
      throw e;
    });
    return ready;
  }

  return {
    async listTrips(): Promise<TripSummaryRow[]> {
      await ensureReady();
      const rows = await run<TripSummaryRow[]>(SUMMARIES, 'readonly', (s) => s.getAll() as IDBRequest<TripSummaryRow[]>);
      // TripSummaryRow carries no timestamp (§2.10), so order by when the trip runs.
      return rows.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));
    },
    /** `readonly`, always: the upcast above has already run. */
    async load(id: string): Promise<StoredDoc | null> {
      await ensureReady();
      const db = await open();
      return new Promise<StoredDoc | null>((resolve, reject) => {
        const tx = db.transaction([DOCS, VERSIONS], 'readonly');
        const readDoc = tx.objectStore(DOCS).get(id) as IDBRequest<TripDoc | undefined>;
        const readVersion = tx.objectStore(VERSIONS).get(id) as IDBRequest<unknown>;
        tx.oncomplete = () => {
          const doc = readDoc.result;
          if (doc === undefined) return resolve(null);
          const version = readVersion.result;
          // Cannot happen after the upcast; if it somehow does, refuse to invent a token.
          if (typeof version !== 'string' || version === '') {
            return reject(new Error(`storage: record ${id} has no envelope version`));
          }
          resolve({ doc, version });
        };
        tx.onerror = () => reject(tx.error ?? new Error('load failed'));
        tx.onabort = () => reject(tx.error ?? new Error('load aborted'));
      }).finally(() => db.close());
    },
    /**
     * The compare, the write and the mint share **one `readwrite` transaction**, which is
     * what makes this atomic: IndexedDB serializes overlapping `readwrite` transactions on
     * the same object stores, so a second tab's transaction cannot start until this one
     * commits or aborts. Every request is issued from the previous one's `onsuccess`, which
     * keeps the transaction alive across them — returning to the event loop in between would
     * end it, which would put the interleaving gap right back where R2-1 found it.
     *
     * Every identifier on the path from entering this method to producing `version` is a
     * parameter, a local, or a value read inside this transaction — §2.2b F3.
     */
    async saveIfVersion(
      id: string,
      expectedVersion: StorageVersion | null,
      doc: TripDoc,
      summary: TripSummaryRow,
    ): Promise<SaveOutcome> {
      await ensureReady();
      const db = await open();
      return new Promise<SaveOutcome>((resolve, reject) => {
        const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');
        let outcome: SaveOutcome | null = null;
        const readKey = tx.objectStore(DOCS).getKey(id) as IDBRequest<IDBValidKey | undefined>;
        readKey.onsuccess = () => {
          const exists = readKey.result !== undefined;
          const readVersion = tx.objectStore(VERSIONS).get(id) as IDBRequest<unknown>;
          readVersion.onsuccess = () => {
            const found = typeof readVersion.result === 'string' && readVersion.result !== ''
              ? readVersion.result
              : null;
            const storedVersion = exists ? found : null;
            const matches = exists ? storedVersion !== null && storedVersion === expectedVersion : expectedVersion === null;
            if (!matches) {
              outcome = { ok: false, storedVersion };
              return; // no put — the transaction commits having changed nothing
            }
            const version = mintVersion();
            tx.objectStore(DOCS).put(doc, id);
            tx.objectStore(SUMMARIES).put(summary, id);
            tx.objectStore(VERSIONS).put(version, id);
            outcome = { ok: true, version };
          };
        };
        tx.oncomplete = () => {
          if (outcome === null) return reject(new Error('save committed without an outcome'));
          resolve(outcome);
        };
        tx.onerror = () => reject(tx.error ?? new Error('save failed'));
        tx.onabort = () => reject(tx.error ?? new Error('save aborted — storage quota?'));
      }).finally(() => db.close());
    },
    /**
     * The summary-only write of §4.3 **A-30**, and the two things it must not do are the two
     * things this transaction structurally cannot: **no put on `DOCS` and no put on
     * `VERSIONS`.** `mintVersion()` is not called from here at all, so the record's fence is
     * left exactly as it was found and another tab holding it is not refused.
     *
     * One `readwrite` transaction over all three stores, with every request issued from the
     * previous one's `onsuccess` — the same shape as `saveIfVersion` and for the same reason:
     * returning to the event loop between the compare and the put would end the transaction
     * and put R2-1's interleaving gap right back. `VERSIONS` is in the scope because it is
     * *read* for the compare; it is never written.
     *
     * An absent record is refused, so this can neither create a summary row for a document
     * that does not exist nor resurrect one a second tab deleted.
     */
    async refreshSummary(
      id: string,
      expectedVersion: StorageVersion,
      summary: TripSummaryRow,
    ): Promise<SaveOutcome> {
      await ensureReady();
      const db = await open();
      return new Promise<SaveOutcome>((resolve, reject) => {
        const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');
        let outcome: SaveOutcome | null = null;
        const readKey = tx.objectStore(DOCS).getKey(id) as IDBRequest<IDBValidKey | undefined>;
        readKey.onsuccess = () => {
          if (readKey.result === undefined) {
            outcome = { ok: false, storedVersion: null };
            return; // no put — the transaction commits having changed nothing
          }
          const readVersion = tx.objectStore(VERSIONS).get(id) as IDBRequest<unknown>;
          readVersion.onsuccess = () => {
            const storedVersion = typeof readVersion.result === 'string' && readVersion.result !== ''
              ? readVersion.result
              : null;
            if (storedVersion === null || storedVersion !== expectedVersion) {
              outcome = { ok: false, storedVersion };
              return;
            }
            tx.objectStore(SUMMARIES).put(summary, id);
            // The version now in storage — the one we were handed. Nothing is minted.
            outcome = { ok: true, version: storedVersion };
          };
        };
        tx.oncomplete = () => {
          if (outcome === null) return reject(new Error('refreshSummary committed without an outcome'));
          resolve(outcome);
        };
        tx.onerror = () => reject(tx.error ?? new Error('summary refresh failed'));
        tx.onabort = () => reject(tx.error ?? new Error('summary refresh aborted — storage quota?'));
      }).finally(() => db.close());
    },
    /**
     * Removes the record. A recreated id gets a strictly fresh token like everything else —
     * 128 fresh bits collide with the dead record's token only by accident that does not
     * happen — so a writer holding it matches nothing (§2.2a rule 2, R3-4's ABA).
     */
    async delete(id: string): Promise<void> {
      await ensureReady();
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        // §10.3's third table row, and §6.3's invariant: *"no row and no blob without a live
        // tenancy reference."* All five stores in **one** `readwrite` transaction — which is the
        // whole reason §10.3 put the byte stores in this database rather than in a second one,
        // because IndexedDB transactions do not span databases and two databases would mean an
        // orphan window on every delete.
        //
        // The document is READ first, in the same transaction, to learn which `PhotoId`s to
        // sweep; every request is issued from the previous one's `onsuccess`, which keeps the
        // transaction alive across them exactly as `saveIfVersion` does. Returning to the event
        // loop in between would end it and put the orphan window back.
        const tx = db.transaction([DOCS, SUMMARIES, VERSIONS, PHOTOS, PHOTO_THUMBS], 'readwrite');
        const readDoc = tx.objectStore(DOCS).get(id) as IDBRequest<TripDoc | undefined>;
        readDoc.onsuccess = () => {
          for (const photoId of photoIdsOf(readDoc.result)) {
            tx.objectStore(PHOTOS).delete(photoId);
            tx.objectStore(PHOTO_THUMBS).delete(photoId);
          }
          tx.objectStore(DOCS).delete(id);
          tx.objectStore(SUMMARIES).delete(id);
          tx.objectStore(VERSIONS).delete(id);
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('delete failed'));
        tx.onabort = () => reject(tx.error ?? new Error('delete aborted'));
      }).finally(() => db.close());
    },
  };
}

/**
 * The **storage half** of `PhotoPort` — ARCHITECTURE §10.2, §10.3.
 *
 * It lives here rather than in `ports/photo.ts` because it is storage and belongs beside
 * `indexedDbStorage`, in the same database, for §10.3's cascade reason. `pickImages` and `derive`
 * are DOM work and live in `ports/photo.ts`; §10.2 says the split in as many words: *"they are one
 * interface because a caller wants one capability; they are two files because the fences are
 * different."*
 *
 * Bytes cross this boundary as `Uint8Array` and are stored as `ArrayBuffer` — a structured-clone
 * primitive. The `Uint8Array` is copied into a standalone buffer on the way in rather than having
 * its `.buffer` handed over: a `Uint8Array` may be a **view onto a larger buffer** (every
 * `bytes.slice()` in a decoder is one), and storing `.buffer` would silently persist the whole
 * backing allocation — potentially the entire source image, which §10.4 says is never stored.
 *
 * Impure: talks to IndexedDB. Every method rejects rather than swallowing, so a
 * `QuotaExceededError` reaches the import saga and becomes `'quota_exceeded'` by name (§10.6)
 * rather than a silent half-import.
 */
export function indexedDbPhotoBytes(): Pick<PhotoPort, 'read' | 'write' | 'remove' | 'present'> {
  /** A standalone `ArrayBuffer` holding exactly these bytes and no more. */
  const detach = (bytes: Uint8Array): ArrayBuffer => {
    const out = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(out).set(bytes);
    return out;
  };

  return {
    async read(id: PhotoId, size: 'thumb' | 'display'): Promise<Uint8Array | null> {
      const store = size === 'thumb' ? PHOTO_THUMBS : PHOTOS;
      const db = await open();
      return new Promise<Uint8Array | null>((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(id) as IDBRequest<ArrayBuffer | undefined>;
        tx.oncomplete = () => resolve(req.result === undefined ? null : new Uint8Array(req.result));
        tx.onerror = () => reject(tx.error ?? new Error('photo read failed'));
        tx.onabort = () => reject(tx.error ?? new Error('photo read aborted'));
      }).finally(() => db.close());
    },

    /**
     * Both derivatives under one id, in **one** `readwrite` transaction over both stores — so a
     * quota failure on the second put aborts the first as well and no half-written pair is ever
     * reachable. That is what §10.2's *"in one atomic step"* buys: an asset is created only after
     * this resolves, so a refused write leaves nothing behind at all (**P9**).
     */
    async write(id: PhotoId, thumb: Uint8Array, display: Uint8Array): Promise<void> {
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([PHOTOS, PHOTO_THUMBS], 'readwrite');
        tx.objectStore(PHOTO_THUMBS).put(detach(thumb), id);
        tx.objectStore(PHOTOS).put(detach(display), id);
        tx.oncomplete = () => resolve();
        // The name is preserved: `QuotaExceededError` is what the import saga turns into
        // `'quota_exceeded'`, and a wrapped `new Error(...)` would lose exactly that.
        tx.onerror = () => reject(tx.error ?? new Error('photo write failed'));
        tx.onabort = () => reject(tx.error ?? new Error('photo write aborted — storage quota?'));
      }).finally(() => db.close());
    },

    /** Removes both. Idempotent: IndexedDB's `delete` succeeds for a key that is not there. */
    async remove(id: PhotoId): Promise<void> {
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([PHOTOS, PHOTO_THUMBS], 'readwrite');
        tx.objectStore(PHOTOS).delete(id);
        tx.objectStore(PHOTO_THUMBS).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('photo remove failed'));
        tx.onabort = () => reject(tx.error ?? new Error('photo remove aborted'));
      }).finally(() => db.close());
    },

    /**
     * §10.6 property 2 — **one call, not N.** `getAllKeys()` over the thumb store once, then a
     * set intersection: forty photos are one request, not forty transactions.
     *
     * It asks the THUMB store, deliberately: `write` puts both in one transaction, so a thumb key
     * implies a display key, and a surface that can render a grid can render a viewer.
     */
    async present(ids: readonly PhotoId[]): Promise<ReadonlySet<PhotoId>> {
      if (ids.length === 0) return new Set<PhotoId>();
      const db = await open();
      return new Promise<ReadonlySet<PhotoId>>((resolve, reject) => {
        const tx = db.transaction(PHOTO_THUMBS, 'readonly');
        const req = tx.objectStore(PHOTO_THUMBS).getAllKeys();
        tx.oncomplete = () => {
          const have = new Set(req.result.map((k) => String(k)));
          resolve(new Set(ids.filter((id) => have.has(id))));
        };
        tx.onerror = () => reject(tx.error ?? new Error('photo availability read failed'));
        tx.onabort = () => reject(tx.error ?? new Error('photo availability read aborted'));
      }).finally(() => db.close());
    },
  };
}
