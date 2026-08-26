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
 * The `revision` of a serialized document, without paying for a full `fromJSON`.
 *
 * It lives here rather than in the store because the compare half of compare-and-set now
 * happens *inside* a storage implementation (see `saveIfRevision`), and two implementations
 * reading the same field two ways is how a guard drifts open. `null` means "no readable
 * revision" — a corrupt or truncated record, which never compares equal to anything.
 */
export function revisionOf(doc: TripDoc): number | null {
  try {
    const r = (JSON.parse(doc) as { revision?: unknown }).revision;
    return typeof r === 'number' && Number.isFinite(r) ? r : null;
  } catch {
    return null;
  }
}

/**
 * The result of an attempted write. A refusal is **not an error**: storage is healthy and
 * the document is intact, someone else just got there first. The store turns `ok:false`
 * into `persistence.status = 'conflict'` and a rejected promise into `'error'`.
 */
export type SaveOutcome =
  | { ok: true }
  | { ok: false; storedRevision: number | null };

export interface StoragePort {
  listTrips(): Promise<TripSummaryRow[]>;
  load(id: string): Promise<TripDoc | null>;
  /**
   * **Atomic** compare-and-set: writes `doc` only if the stored document's revision is
   * exactly `expectedRevision`, and reports a refusal rather than throwing.
   * `expectedRevision: null` means "nothing may be stored under this id yet".
   *
   * The comparison and the write MUST happen without an interleaving point between them.
   * This is the whole contract, and it is the reason this method exists at all: the store
   * used to do `load()` -> compare -> `save()`, which is two awaits with a gap in the
   * middle, so two tabs that both read revision R both passed the compare and the second
   * write destroyed the first while the losing tab displayed "Saved" (QA R2-1). A guard
   * above the port cannot fix that; only the port can.
   *
   * An implementation that cannot be atomic must reject, never write optimistically.
   */
  saveIfRevision(
    id: string,
    expectedRevision: number | null,
    doc: TripDoc,
    summary: TripSummaryRow,
  ): Promise<SaveOutcome>;
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
