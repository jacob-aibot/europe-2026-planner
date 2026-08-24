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

export interface StoragePort {
  listTrips(): Promise<TripSummaryRow[]>;
  load(id: string): Promise<TripDoc | null>;
  save(id: string, doc: TripDoc, summary: TripSummaryRow): Promise<void>;
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
