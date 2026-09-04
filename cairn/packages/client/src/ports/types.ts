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
import type { IsoDate, PhotoId, TripSummaryRow } from '../deps.ts';

export type TripDoc = string;

/**
 * The write fence (ARCHITECTURE §2.2a). **Opaque. Compared for equality only.**
 *
 * Four rules, and they are the entire contract:
 *
 *   1. Storage issues it, on every successful write **of a document**, inside the same atomic
 *      step as the write. Nothing above the port computes, derives, increments or forges one —
 *      the client's only sources are `load()` and a successful `saveIfVersion()`.
 *
 *      *(Narrowed at revision 23 by §4.3 **A-30**, QA R26-6. What the fence means, stated once:*
 *      **equality of a `StorageVersion` asserts that the document bytes under that id have not
 *      changed since the token was issued, and asserts nothing whatever about the summary row
 *      stored beside them.** *A write that can change the document therefore MUST mint; a write
 *      that changes only the summary MUST NOT, because minting for it would assert a change the
 *      document did not make and would refuse another writer holding a token that is still
 *      true. `refreshSummary` is that second kind. A successful `refreshSummary` returns the
 *      version it was handed, so it is not a third source of a token.)*
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
 * `ok:true` carries the version now in storage; `ok:false` carries the version actually found
 * (`null` = nothing is stored under that id). For `saveIfVersion` the successful version is a
 * freshly minted one; for **`refreshSummary` it is the unchanged expectation it was handed**,
 * because that call does not move the document's fence (§4.3 A-30).
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
  /**
   * **Atomic** compare-and-set over the **summary row alone** — ARCHITECTURE §4.3 **A-30**.
   *
   * It exists because a summary refresh is not a document write, and I-6 was the first thing
   * to need that said. Bringing a stale row current used to mean
   * `saveIfVersion(id, v, toJSON(doc), summary)` — a full document rewrite, byte-identical to
   * what storage already held, purely to move the summary — which **minted**, and another
   * tab's write fence is exactly what that mints against. A background pass with no user on
   * the other side would put a live tab into `'conflict'` with a *Merge* button and nothing
   * to merge (QA R26-6).
   *
   * The contract, and every clause of it is load-bearing:
   *
   *   - The comparison, the write and the return happen in **one atomic step**, exactly as
   *     `saveIfVersion`'s do and for exactly R2-1's reason. An implementation that cannot be
   *     atomic must reject, never write optimistically.
   *   - It writes the summary row and **nothing else**: the document is not read for content,
   *     not parsed, and not written. There is no `doc` argument, so there is nothing in this
   *     signature to write a document *with* — which is also why §8.4 clause 1's *"a summary is
   *     computed only from the document it is about"* cannot be violated through here.
   *   - **It does not mint.** The record's `StorageVersion` is left exactly as it was found;
   *     on success the outcome carries that same version back.
   *   - `expectedVersion` is **not nullable** and an absent record is refused with
   *     `{ok: false, storedVersion: null}`. A summary row may never exist without the document
   *     it is about, so this can neither create a record nor resurrect a deleted one.
   */
  refreshSummary(
    id: string,
    expectedVersion: StorageVersion,
    summary: TripSummaryRow,
  ): Promise<SaveOutcome>;
  /** Removes the record. MUST NOT rewind the version counter — §2.2a rule 2. */
  delete(id: string): Promise<void>;
}

export interface FilePort {
  exportDoc(name: string, bytes: Uint8Array): Promise<void>;
  importDoc(): Promise<{ name: string; bytes: Uint8Array } | null>;
}

/** One file as the picker handed it over, before anything has decoded it. §10.2. */
export type PickedImage = { name: string; type: string; bytes: Uint8Array };

/** The two derivatives §10.4 fixes, as `derive` produces them. Never the original. */
export type DerivedImage = {
  source: { w: number; h: number };
  thumb: { bytes: Uint8Array; w: number; h: number };
  display: { bytes: Uint8Array; w: number; h: number };
};

/**
 * `PhotoPort` — ARCHITECTURE §10.2, deliberately shaped like `FilePort` rather than like
 * something new.
 *
 * **Six methods, two implementations, one interface, and that split is stated in §10.2:**
 * `pickImages` and `derive` are DOM work and live in `apps/web/src/ports/photo.ts`;
 * `read`/`write`/`remove`/`present` are storage and live beside `indexedDbStorage` in
 * `apps/web/src/ports/storage.ts` — **same database**, so a trip delete can cascade in one
 * transaction (§10.3, §6.3's *"no row and no blob without a live tenancy reference"*). *"They
 * are one interface because a caller wants one capability; they are two files because the
 * fences are different."*
 *
 * **Bytes are `Uint8Array` at this boundary and never `Blob`** (§10.3): `packages/client` may
 * not touch the DOM (`cairn-constraints` §5), `Blob` is a DOM type, and `FilePort.importDoc`
 * already speaks buffers. `apps/web` reconstructs the `Blob` at render time, where DOM
 * lifetimes belong — and that is also the one place `createObjectURL`/`revokeObjectURL` live.
 */
export interface PhotoPort {
  /**
   * Multi-select picker: `<input type=file multiple accept="image/*">`, for the reason
   * `FilePort`'s own header gives — the File System Access API is Chromium-only and Safari
   * supports only the Origin Private File System (§1.1).
   *
   * Returns raw bytes, one entry per file, in the order the picker gave them. `null` is a
   * **cancel, which is not an error**.
   */
  pickImages(): Promise<PickedImage[] | null>;
  /**
   * Decode and downscale, once, at import (§10.4). `null` when the platform cannot decode the
   * bytes at all — **which is an answer, not a throw.**
   */
  derive(bytes: Uint8Array, type: string): Promise<DerivedImage | null>;
  /** Bytes for one derivative, or `null` if the record is gone. §10.3, §10.6. */
  read(id: PhotoId, size: 'thumb' | 'display'): Promise<Uint8Array | null>;
  /** Writes both derivatives under one id, in one atomic step. §10.3. */
  write(id: PhotoId, thumb: Uint8Array, display: Uint8Array): Promise<void>;
  /** Removes both. Idempotent. */
  remove(id: PhotoId): Promise<void>;
  /**
   * Which of these ids have bytes. **One call, not N** — §10.6's availability read, which
   * happens once on trip open and is what keeps `'loading'` and `'empty'` distinguishable.
   */
  present(ids: readonly PhotoId[]): Promise<ReadonlySet<PhotoId>>;
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
  /**
   * §10.2. Optional, exactly as `file` is: a host with no photo capability is a real
   * configuration (the CLI, a test that is not about photos), and the store degrades honestly
   * rather than throwing — an import with no port creates nothing and reports nothing, and
   * availability reads as *"no bytes"*, which is true.
   */
  photo?: PhotoPort;
  clock: ClockPort;
  ids: IdPort;
  scheduler?: SchedulerPort;
};
