/**
 * Ports (ARCHITECTURE §4.3) — the honesty-to-native mechanism.
 *
 * `apps/web` implements these with IndexedDB, a download + `<input type=file>` and Leaflet.
 * `apps/mobile` will implement the same interfaces with `expo-sqlite`, `expo-file-system`
 * and MapLibre. The store, the selectors and every rule above them are shared, so Phase 4
 * does not rewrite state management.
 *
 * `packages/client` may not import the DOM, React or the network. Everything platform-shaped
 * goes through this file.
 */
import type { IsoDate, TripSummaryRow } from '../deps.ts';

export type TripDoc = string;

/**
 * The write fence (ARCHITECTURE §2.2a). **Opaque. Compared for equality only.**
 *
 * Four rules, and they are the entire contract:
 *
 *   1. Storage issues it, on every successful write, inside the same atomic step as the
 *      write. Nothing above the port computes, derives, increments or forges one — the
 *      client's only sources are `load()` and a successful `saveIfVersion()`.
 *   2. It never repeats within one storage, ever: not after a `delete()`, not after the
 *      record is recreated under the same id, not after the whole database is recreated.
 *      That is what closes R3-4's ABA.
 *   3. No ordering, no arithmetic, no parsing, no inference of recency. This discipline is
 *      what lets an HTTP `ETag`, a Postgres `xmin` and a SQLite counter all be dropped in
 *      without touching a line above the port.
 *   4. It is **not part of `Trip`**. It lives in the storage record's envelope beside the
 *      serialized document, never inside it — so `toJSON`/`fromJSON` are untouched, an
 *      export carries no storage state, and no in-memory document operation (undo included)
 *      can rewind it. R3-1 is structurally unreachable rather than fixed.
 *
 * `Trip.revision` is a CONTENT counter and MUST NOT be used as a compare-and-set token, an
 * ETag, a sync cursor, or evidence that one document is newer than another.
 */
export type StorageVersion = string;

/** What `load()` returns: the document beside the envelope version that fences it. */
export type StoredDoc = { doc: TripDoc; version: StorageVersion };

/**
 * The result of an attempted write. A refusal is **not an error**: storage is healthy and
 * the document is intact, someone else just got there first. The store turns `ok:false`
 * into `persistence.status = 'conflict'` and a rejected promise into `'error'`.
 *
 * `ok:true` carries the freshly minted version now in storage; `ok:false` carries the
 * version actually found (`null` = nothing is stored under that id).
 */
export type SaveOutcome =
  | { ok: true; version: StorageVersion }
  | { ok: false; storedVersion: StorageVersion | null };

export interface StoragePort {
  listTrips(): Promise<TripSummaryRow[]>;
  /**
   * Reads a record and the version fencing it. MUST NOT write — with one exception, the
   * one-time upcast of §2.2a: an implementation stamps every pre-existing versionless
   * record at open, once, before serving any read, so no caller ever sees one.
   */
  load(id: string): Promise<StoredDoc | null>;
  /**
   * **Atomic** compare-and-set: writes `doc` only if the version in the record's envelope
   * is exactly `expectedVersion`, and reports a refusal rather than throwing.
   * `expectedVersion: null` means "nothing may be stored under this id yet".
   *
   * The comparison, the write and the minting of the new version MUST happen without an
   * interleaving point between them. This is the whole contract, and it is the reason this
   * method exists at all: the store used to do `load()` -> compare -> `save()`, which is two
   * awaits with a gap in the middle, so two tabs that both read revision R both passed the
   * compare and the second write destroyed the first while the losing tab displayed "Saved"
   * (QA R2-1). A guard above the port cannot fix that; only the port can.
   *
   * The port no longer parses the document to run the guard, either: a truncated or corrupt
   * record does not get to decide its own refusal behaviour (§2.2a, "a guard that depends on
   * parsing user-controlled bytes is a guard whose refusal behaviour is decided by an
   * attacker's JSON").
   *
   * An implementation that cannot be atomic must reject, never write optimistically.
   */
  saveIfVersion(
    id: string,
    expectedVersion: StorageVersion | null,
    doc: TripDoc,
    summary: TripSummaryRow,
  ): Promise<SaveOutcome>;
  /** Removes the record. MUST NOT rewind the version counter — §2.2a rule 2. */
  delete(id: string): Promise<void>;
}

export interface FilePort {
  exportDoc(name: string, bytes: Uint8Array): Promise<void>;
  importDoc(): Promise<{ name: string; bytes: Uint8Array } | null>;
}

export type MapPoint = { id: string; lat: number; lng: number; label: string; category: string };

export type MapBoundsLike = {
  centre: { lat: number; lng: number };
  north: number;
  south: number;
  east: number;
  west: number;
  spanKm: number;
  clamped: boolean;
  empty: boolean;
};

export type MapHandle = { id: string };

export interface MapPort {
  mount(el: unknown, points: MapPoint[], bounds: MapBoundsLike): MapHandle;
  update(handle: MapHandle, points: MapPoint[], bounds: MapBoundsLike): void;
  refit(handle: MapHandle, bounds: MapBoundsLike): void;
  /**
   * MUST no-op while the container has zero size and MUST re-fit when it gains one.
   * Leaflet cannot compute a zoom against a `display:none` container — §4.4.
   */
  setVisible(handle: MapHandle, visible: boolean): void;
  destroy(handle: MapHandle): void;
}

export interface ClockPort {
  today(): IsoDate;
}

export interface IdPort {
  newId(kind: string): string;
}

/** Injected so autosave debouncing is testable without real time passing. */
export interface SchedulerPort {
  schedule(fn: () => void, ms: number): () => void;
}

export type Ports = {
  storage: StoragePort;
  file?: FilePort;
  clock: ClockPort;
  ids: IdPort;
  scheduler?: SchedulerPort;
};
