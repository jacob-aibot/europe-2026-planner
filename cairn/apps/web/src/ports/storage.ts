/**
 * `StoragePort` over IndexedDB.
 *
 * IndexedDB rather than localStorage for two reasons: a 176 KB trip is already past what
 * localStorage is comfortable with, and localStorage is synchronous — a save would block
 * the frame. An *installed* web app keeps its storage across the 7-day eviction rule
 * (ARCHITECTURE §1.1); a plain tab may not, which is why export exists.
 *
 * The write fence is the opaque `StorageVersion` of §2.2a, held in the record's envelope —
 * a separate `versions` object store, beside the document and never inside it. It is
 * `"${epoch}.${n}"`: `epoch` is minted once with `crypto.randomUUID()` when this database is
 * first created and persisted with it; `n` is a **storage-wide** counter bumped inside the
 * same `readwrite` transaction as every successful write. Storage-wide rather than
 * per-record so a deleted-and-recreated id cannot re-enter a number it has already used
 * (R3-4's ABA); the epoch because clearing site data resets the counter while a tab holding
 * an old token survives, which is the same ABA one level up.
 */
import type { SaveOutcome, StoragePort, StoredDoc, StorageVersion, TripDoc } from '@cairn/client';
import type { TripSummaryRow } from '@cairn/core';

const DB_NAME = 'cairn';
/** 2 adds `versions` and `meta` — the §2.2a envelope. */
const DB_VERSION = 2;
const DOCS = 'docs';
const SUMMARIES = 'summaries';
const VERSIONS = 'versions';
const META = 'meta';
const EPOCH_KEY = 'epoch';
const COUNTER_KEY = 'versionCounter';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DOCS)) db.createObjectStore(DOCS);
      if (!db.objectStoreNames.contains(SUMMARIES)) db.createObjectStore(SUMMARIES);
      if (!db.objectStoreNames.contains(VERSIONS)) db.createObjectStore(VERSIONS);
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexedDB.open failed'));
  });
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

function newEpoch(): string {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined;
  // Port code, not core and not the reducer, so the determinism constraint is not engaged.
  if (c?.randomUUID) return c.randomUUID();
  return `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Impure: talks to IndexedDB. Every method rejects rather than swallowing — the store turns
 * a rejection into `persistence.status = 'error'`, which is the visible failure the roadmap
 * requires.
 */
export function indexedDbStorage(): StoragePort {
  let epoch = '';
  let ready: Promise<void> | null = null;

  /**
   * The one-time upcast of §2.2a, plus the epoch.
   *
   * Jacob's existing IndexedDB has records that predate the fence and carry no envelope
   * version. Every one is stamped with a fresh version in **one `readwrite` transaction at
   * open, once, before any read is served** — so `load()` stays `readonly` and no code path
   * above the port ever sees a versionless record. Two tabs may both run this; IndexedDB
   * serializes the transactions and the second finds nothing left to stamp.
   */
  function ensureReady(): Promise<void> {
    if (ready) return ready;
    ready = open().then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const tx = db.transaction([DOCS, VERSIONS, META], 'readwrite');
          const meta = tx.objectStore(META);
          const versions = tx.objectStore(VERSIONS);
          let counter = 0;
          const readEpoch = meta.get(EPOCH_KEY) as IDBRequest<unknown>;
          readEpoch.onsuccess = () => {
            epoch = typeof readEpoch.result === 'string' && readEpoch.result ? readEpoch.result : newEpoch();
            if (readEpoch.result !== epoch) meta.put(epoch, EPOCH_KEY);
            const readCounter = meta.get(COUNTER_KEY) as IDBRequest<unknown>;
            readCounter.onsuccess = () => {
              counter = typeof readCounter.result === 'number' && Number.isFinite(readCounter.result)
                ? readCounter.result
                : 0;
              const docKeys = tx.objectStore(DOCS).getAllKeys();
              docKeys.onsuccess = () => {
                const versionKeys = versions.getAllKeys();
                versionKeys.onsuccess = () => {
                  const have = new Set(versionKeys.result.map((k) => String(k)));
                  let stamped = false;
                  for (const key of docKeys.result) {
                    if (have.has(String(key))) continue;
                    counter += 1;
                    versions.put(`${epoch}.${counter}`, key);
                    stamped = true;
                  }
                  if (stamped) meta.put(counter, COUNTER_KEY);
                };
              };
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
        const tx = db.transaction([DOCS, SUMMARIES, VERSIONS, META], 'readwrite');
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
            const meta = tx.objectStore(META);
            const readCounter = meta.get(COUNTER_KEY) as IDBRequest<unknown>;
            readCounter.onsuccess = () => {
              const n = (typeof readCounter.result === 'number' && Number.isFinite(readCounter.result)
                ? readCounter.result
                : 0) + 1;
              const version = `${epoch}.${n}`;
              meta.put(n, COUNTER_KEY);
              tx.objectStore(DOCS).put(doc, id);
              tx.objectStore(SUMMARIES).put(summary, id);
              tx.objectStore(VERSIONS).put(version, id);
              outcome = { ok: true, version };
            };
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
     * Removes the record. It does **not** touch the counter — that is the whole of the ABA
     * fix (§2.2a rule 2, R3-4): a recreated id gets a strictly fresh version, so a writer
     * holding the dead record's token matches nothing.
     */
    async delete(id: string): Promise<void> {
      await ensureReady();
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([DOCS, SUMMARIES, VERSIONS], 'readwrite');
        tx.objectStore(DOCS).delete(id);
        tx.objectStore(SUMMARIES).delete(id);
        tx.objectStore(VERSIONS).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('delete failed'));
      }).finally(() => db.close());
    },
  };
}
