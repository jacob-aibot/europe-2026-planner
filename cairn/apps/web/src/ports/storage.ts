/**
 * `StoragePort` over IndexedDB.
 *
 * IndexedDB rather than localStorage for two reasons: a 176 KB trip is already past what
 * localStorage is comfortable with, and localStorage is synchronous — a save would block
 * the frame. An *installed* web app keeps its storage across the 7-day eviction rule
 * (ARCHITECTURE §1.1); a plain tab may not, which is why export exists.
 */
import type { SaveOutcome, StoragePort, TripDoc } from '@cairn/client';
import { revisionOf } from '@cairn/client';
import type { TripSummaryRow } from '@cairn/core';

const DB_NAME = 'cairn';
const DB_VERSION = 1;
const DOCS = 'docs';
const SUMMARIES = 'summaries';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DOCS)) db.createObjectStore(DOCS);
      if (!db.objectStoreNames.contains(SUMMARIES)) db.createObjectStore(SUMMARIES);
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

/**
 * Impure: talks to IndexedDB. Every method rejects rather than swallowing — the store turns
 * a rejection into `persistence.status = 'error'`, which is the visible failure the roadmap
 * requires.
 */
export function indexedDbStorage(): StoragePort {
  return {
    async listTrips(): Promise<TripSummaryRow[]> {
      const rows = await run<TripSummaryRow[]>(SUMMARIES, 'readonly', (s) => s.getAll() as IDBRequest<TripSummaryRow[]>);
      // TripSummaryRow carries no timestamp (§2.10), so order by when the trip runs.
      return rows.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));
    },
    async load(id: string): Promise<TripDoc | null> {
      const doc = await run<TripDoc | undefined>(DOCS, 'readonly', (s) => s.get(id) as IDBRequest<TripDoc | undefined>);
      return doc ?? null;
    },
    /**
     * The compare and the write share **one `readwrite` transaction**, which is what makes
     * this atomic: IndexedDB serializes overlapping `readwrite` transactions on the same
     * object stores, so a second tab's transaction cannot start until this one commits or
     * aborts. Issuing the `put` from the `get`'s own `onsuccess` keeps the transaction
     * alive across the two requests — returning to the event loop in between would end it,
     * which would put the interleaving gap right back where R2-1 found it.
     */
    async saveIfRevision(
      id: string,
      expectedRevision: number | null,
      doc: TripDoc,
      summary: TripSummaryRow,
    ): Promise<SaveOutcome> {
      const db = await open();
      return new Promise<SaveOutcome>((resolve, reject) => {
        const tx = db.transaction([DOCS, SUMMARIES], 'readwrite');
        let outcome: SaveOutcome = { ok: true };
        const read = tx.objectStore(DOCS).get(id) as IDBRequest<TripDoc | undefined>;
        read.onsuccess = () => {
          const existing = read.result;
          const storedRevision = existing === undefined ? null : revisionOf(existing);
          const matches = existing === undefined ? expectedRevision === null : storedRevision === expectedRevision;
          if (!matches) {
            outcome = { ok: false, storedRevision };
            return; // no put — the transaction commits having changed nothing
          }
          tx.objectStore(DOCS).put(doc, id);
          tx.objectStore(SUMMARIES).put(summary, id);
        };
        tx.oncomplete = () => resolve(outcome);
        tx.onerror = () => reject(tx.error ?? new Error('save failed'));
        tx.onabort = () => reject(tx.error ?? new Error('save aborted — storage quota?'));
      }).finally(() => db.close());
    },
    async delete(id: string): Promise<void> {
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([DOCS, SUMMARIES], 'readwrite');
        tx.objectStore(DOCS).delete(id);
        tx.objectStore(SUMMARIES).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('delete failed'));
      }).finally(() => db.close());
    },
  };
}
