/**
 * In-memory ports for tests and for the CLI (ARCHITECTURE §4.3).
 *
 * These are what make the state machine attackable in plain Node: no browser, no device,
 * no IndexedDB. `failNextSave` and `failAll` exist so the tester can prove that a failing
 * `StoragePort.save` surfaces as `persistence.status === 'error'` and never silently drops
 * an edit.
 */
import type { IsoDate, PhotoId, TripId, TripSummaryRow } from '../deps.ts';
import type {
  ClockPort, DerivedImage, FilePort, IdPort, PhotoPort, PickedImage, SchedulerPort, StoragePort,
  StorageVersion, TripDoc,
} from './types.ts';

export type MemoryStorage = StoragePort & {
  docs: Map<string, TripDoc>;
  summaries: Map<string, TripSummaryRow>;
  /**
   * The record envelopes' write fences (§2.2a rule 4) — beside the documents, never inside
   * them. A test may read this to prove a version was minted; nothing in `packages/client`
   * outside a port implementation may.
   */
  versions: Map<string, StorageVersion>;
  /** Make exactly the next `saveIfVersion` reject. Never `refreshSummary` — §4.3 A-30. */
  failNextSave: string | null;
  /** Make exactly the next `refreshSummary` reject (§0.5's injected fault for that path). */
  failNextRefresh: string | null;
  /** Make every write reject until cleared — a broken port is broken for everything. */
  failAll: string | null;
  /** Document writes only. A test asserting "no document was written" has to be able to. */
  saveCount: number;
  /** Summary-row refreshes. Deliberately a separate counter from `saveCount` — §4.3 A-30. */
  refreshCount: number;
};

/**
 * A process-wide instance counter. Never rewinds within one Node process, and no caller can
 * reset it — which is the whole of §2.2a rule 2 for this port. §2.2b F3 permits it because it
 * is not a *cached fact about storage*: it is a fresh value drawn at construction, and the
 * thing it makes unique is "which port instance", which cannot go stale the way a remembered
 * `epoch` did (a wipe destroys the database, not this counter's monotonicity).
 */
let instanceCounter = 0;

/**
 * Impure only in that it holds state.
 *
 * `packages/client` may not touch ambient randomness (the zero-nondeterminism rule), so the
 * in-memory port stays deterministic where `apps/web` uses a CSPRNG: it mints
 * `` `${instance}.${n}` `` from a per-instance prefix and its own counter. Deterministic
 * across runs, **distinct across every port instance in a run** — so "the database was
 * recreated" (a second `memoryStorage()`) does not silently reissue the first one's tokens,
 * which is exactly what a fixed default `epoch` did (R4-2). Nothing above the port can tell
 * this construction and `apps/web`'s apart, which is §2.2a rule 3.
 *
 * `mintVersion` is the deliberate way to model a collision: a test that wants two storages to
 * agree on a token passes one in. It is the only way to get one.
 */
export function memoryStorage(
  seed?: Record<string, TripDoc>,
  mintVersion?: () => StorageVersion,
): MemoryStorage {
  const docs = new Map<string, TripDoc>(Object.entries(seed ?? {}));
  const summaries = new Map<string, TripSummaryRow>();
  const versions = new Map<string, StorageVersion>();
  const instance = ++instanceCounter;
  /** Storage-wide, never per-record, and it never rewinds — not even on `delete()`. */
  let counter = 0;
  const mint: () => StorageVersion = mintVersion ?? (() => `${instance}.${++counter}`);
  // The one-time upcast of §2.2a: a seeded record predates the fence, so it is stamped
  // before any read is served rather than being served versionless.
  for (const id of docs.keys()) versions.set(id, mint());

  const port: MemoryStorage = {
    docs,
    summaries,
    versions,
    failNextSave: null,
    failNextRefresh: null,
    failAll: null,
    saveCount: 0,
    refreshCount: 0,
    async listTrips() {
      return [...summaries.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
    },
    async load(id) {
      const doc = docs.get(id);
      if (doc === undefined) return null;
      return { doc, version: versions.get(id) as StorageVersion };
    },
    /**
     * Atomic by construction: everything below runs in one synchronous block, so no other
     * task can observe or interleave between the compare, the write and the mint. There is
     * deliberately **no `await` in this method** — adding one reopens R2-1 here.
     */
    async saveIfVersion(id, expectedVersion, doc, summary) {
      port.saveCount++;
      if (port.failAll) throw new Error(port.failAll);
      if (port.failNextSave) {
        const msg = port.failNextSave;
        port.failNextSave = null;
        throw new Error(msg);
      }
      const exists = docs.has(id);
      const storedVersion = exists ? (versions.get(id) ?? null) : null;
      const matches = exists ? storedVersion !== null && storedVersion === expectedVersion : expectedVersion === null;
      if (!matches) return { ok: false, storedVersion };
      const version = mint();
      docs.set(id, doc);
      summaries.set(id, summary);
      versions.set(id, version);
      return { ok: true, version };
    },
    /**
     * §4.3 **A-30**. Atomic for the same reason `saveIfVersion` is: one synchronous block with
     * deliberately **no `await` in it**, so nothing can interleave between the compare and the
     * put. `docs` and `versions` are not touched — not read for content, not written, and
     * above all **not minted**, which is the whole point of the method.
     *
     * It bumps `refreshCount` and never `saveCount`: "the rescan did not write a document" is
     * an assertion a test has to be able to make, and it cannot if one counter serves both.
     */
    async refreshSummary(id, expectedVersion, summary) {
      port.refreshCount++;
      if (port.failAll) throw new Error(port.failAll);
      if (port.failNextRefresh) {
        const msg = port.failNextRefresh;
        port.failNextRefresh = null;
        throw new Error(msg);
      }
      // A summary row may never exist without the document it is about, so an absent record is
      // refused rather than created: this method cannot resurrect a trip a second tab destroyed.
      if (!docs.has(id)) return { ok: false, storedVersion: null };
      const storedVersion = versions.get(id) ?? null;
      if (storedVersion === null || storedVersion !== expectedVersion) {
        return { ok: false, storedVersion };
      }
      summaries.set(id, summary);
      // The version now in storage — which is the one we were handed. Nothing was minted.
      return { ok: true, version: storedVersion };
    },
    async delete(id) {
      docs.delete(id);
      summaries.delete(id);
      versions.delete(id);
    },
  };
  return port;
}

export type MemoryFile = FilePort & { exported: Array<{ name: string; text: string }>; next: { name: string; bytes: Uint8Array } | null };

/** Impure only in that it holds state. */
export function memoryFile(): MemoryFile {
  const port: MemoryFile = {
    exported: [],
    next: null,
    async exportDoc(name, bytes) {
      port.exported.push({ name, text: new TextDecoder().decode(bytes) });
    },
    async importDoc() {
      const n = port.next;
      port.next = null;
      return n;
    },
  };
  return port;
}

/**
 * §10.3's compound key `[tripId, photoId]`, flattened into one string so a `Map` can hold it.
 *
 * A `Map` compares keys by identity, so an array key would make every lookup miss. The
 * separator is `\u0000` because it cannot occur in an id minted by `IdFactory` and cannot be
 * typed into one — a `tripId` ending in the separator is the only way to forge a collision, and
 * nothing in this system mints one.
 */
export function photoByteKey(tripId: TripId, id: PhotoId): string {
  return `${tripId}\u0000${id}`;
}

/**
 * The two byte stores, as maps keyed by `photoByteKey` — with **bare-`PhotoId` lookups kept
 * working**, meaning *"in any trip"*.
 *
 * This is a property of the double and not of the port. A-62 puts tenancy in the key, so the
 * honest key here is the compound one; but almost every test that inspects these maps has one
 * trip, and `thumbs.has(id)` is what it means to say there. So `has`/`get`/`delete` accept
 * either shape: a compound key is looked up exactly, and a bare id matches any trip's record.
 * A test that is **about** tenancy (A-62 Part 7's Q4 and Q5) uses `photoByteKey` and gets the
 * exact answer; a test that is about anything else does not have to care.
 */
class PhotoByteMap extends Map<string, Uint8Array> {
  /** Every compound key whose photo half is `id`. Empty for a key that is already compound. */
  #matching(id: string): string[] {
    const suffix = `\u0000${id}`;
    const out: string[] = [];
    for (const k of super.keys()) if (k.endsWith(suffix)) out.push(k);
    return out;
  }

  override has(key: string): boolean {
    return super.has(key) || this.#matching(key).length > 0;
  }

  override get(key: string): Uint8Array | undefined {
    const exact = super.get(key);
    if (exact !== undefined) return exact;
    const [first] = this.#matching(key);
    return first === undefined ? undefined : super.get(first);
  }

  override delete(key: string): boolean {
    if (super.delete(key)) return true;
    let hit = false;
    for (const k of this.#matching(key)) hit = super.delete(k) || hit;
    return hit;
  }
}

export type MemoryPhotos = PhotoPort & {
  /**
   * Stored bytes — §10.3's two object stores, as two maps keyed by `photoByteKey(tripId, id)`.
   * A bare `PhotoId` still reads and deletes, meaning *"in any trip"* — see `PhotoByteMap`.
   */
  thumbs: PhotoByteMap;
  displays: PhotoByteMap;
  /** What the next `pickImages()` returns. `null` is a cancel; consumed on read, like `memoryFile`. */
  next: PickedImage[] | null;
  /** File TAGS whose `derive` returns `null` — A-57 Part 7's **P8** fault, injectable. */
  failDeriveFor: Set<string>;
  /** Photo ids OR file tags whose `write` rejects — **P9**. `failWriteAs` names the error. */
  failWriteFor: Set<string>;
  failWriteAs: string;
  /** Photo ids whose `remove` rejects — §10.2's reclaimable-orphan path. */
  failRemoveFor: Set<string>;
  /** How many times `derive` was actually called: a ceiling enforced after decoding is not one. */
  deriveCount: number;
  /** How many times `present` was called: §10.6 property 2 is *once per trip open, not per photo*. */
  presentCount: number;
};

/**
 * The **file tag** — how a fault is aimed at one file of five without changing `PhotoPort`.
 *
 * §10.2's `derive(bytes, type)` and `write(id, thumb, display)` are given no file name, and
 * widening the interface so a test could inject a fault would be the test dictating the
 * production contract. So the in-memory port reads the tag out of the BYTES: a fixture's bytes
 * begin with its own name in ASCII, and `failDeriveFor`/`failWriteFor` hold names. Real bytes
 * from a real picker simply have no tag, and every fault set is empty in production anyway.
 */
function fileTag(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < Math.min(bytes.length, 64); i++) {
    const c = bytes[i];
    if (c < 0x20 || c > 0x7e) break;
    s += String.fromCharCode(c);
  }
  return s;
}

/**
 * The in-memory `PhotoPort` — **without which the whole subsystem is untestable in plain Node**
 * (A-57 Part 6, `cairn-constraints` §5).
 *
 * `derive` does **not** decode anything: there is no canvas in Node and there is deliberately no
 * dependency that would provide one (A-58 Part 5). What it models is §10.4's *contract* — two
 * derivatives, long edges 320 and 1600, the thumb strictly smaller than the display, both
 * produced from the input and neither of them the original. The real downscale lives in
 * `apps/web/src/ports/photo.ts` and is measured against a real browser in `qa/`, not here.
 *
 * `failDeriveFor` / `failWriteFor` / `failRemoveFor` exist for the same reason
 * `memoryStorage.failNextSave` does: a failure path nobody can inject is a failure path nobody
 * has tested (§0.5).
 *
 * Impure only in that it holds state. No clock, no randomness: every output is a pure function
 * of the input, so an import is reproducible.
 */
export function memoryPhotos(): MemoryPhotos {
  const port: MemoryPhotos = {
    thumbs: new PhotoByteMap(),
    displays: new PhotoByteMap(),
    next: null,
    failDeriveFor: new Set<string>(),
    failWriteFor: new Set<string>(),
    failWriteAs: 'QuotaExceededError',
    failRemoveFor: new Set<string>(),
    deriveCount: 0,
    presentCount: 0,

    async pickImages(): Promise<PickedImage[] | null> {
      const n = port.next;
      port.next = null;
      return n;
    },

    async derive(bytes: Uint8Array, type: string): Promise<DerivedImage | null> {
      port.deriveCount++;
      // §10.2: the one thing `derive` may not do is throw for bytes it cannot read. `null` is
      // the answer, and the caller turns it into a named, reported failure.
      //
      // An EMPTY type is treated as JPEG, exactly as `apps/web/src/ports/photo.ts` does
      // (`new Blob([bytes], { type: type || 'image/jpeg' })`) — QA R45-12. A double that refuses
      // an input the production port accepts is a double that hides the production behaviour.
      if (!(type || 'image/jpeg').startsWith('image/')) return null;
      if (bytes.length === 0) return null;
      if (port.failDeriveFor.has(fileTag(bytes))) return null;
      return {
        source: { w: 4032, h: 3024 },
        thumb: { bytes: bytes.slice(0, Math.max(1, Math.min(bytes.length, 16))), w: 320, h: 240 },
        display: { bytes: bytes.slice(0, Math.max(2, Math.min(bytes.length, 64))), w: 1600, h: 1200 },
      };
    },

    async read(tripId: TripId, id: PhotoId, size: 'thumb' | 'display'): Promise<Uint8Array | null> {
      return (size === 'thumb' ? port.thumbs : port.displays).get(photoByteKey(tripId, id)) ?? null;
    },

    /**
     * Both derivatives under one key, in one step — atomic by construction, because everything
     * below runs in one synchronous block. `memoryStorage.saveIfVersion`'s rule applies here for
     * the same reason: **no `await` in this method**, or a half-written pair becomes reachable.
     */
    async write(tripId: TripId, id: PhotoId, thumb: Uint8Array, display: Uint8Array): Promise<void> {
      if (port.failWriteFor.has(id) || port.failWriteFor.has(fileTag(thumb))) {
        const err = new Error(`${port.failWriteAs}: the write did not fit`);
        err.name = port.failWriteAs;
        throw err;
      }
      port.thumbs.set(photoByteKey(tripId, id), thumb);
      port.displays.set(photoByteKey(tripId, id), display);
    },

    async remove(tripId: TripId, id: PhotoId): Promise<void> {
      if (port.failRemoveFor.has(id)) throw new Error(`remove(${id}) failed`);
      // `Map.delete` on the EXACT compound key: `PhotoByteMap`'s bare-id fallback is for a test
      // reading the double, and using it here would let one trip's remove take another's bytes,
      // which is the whole defect A-62 closes.
      Map.prototype.delete.call(port.thumbs, photoByteKey(tripId, id));
      Map.prototype.delete.call(port.displays, photoByteKey(tripId, id));
    },

    async present(tripId: TripId, ids: readonly PhotoId[]): Promise<ReadonlySet<PhotoId>> {
      port.presentCount++;
      return new Set(ids.filter((id) => {
        const key = photoByteKey(tripId, id);
        return Map.prototype.has.call(port.thumbs, key) || Map.prototype.has.call(port.displays, key);
      }));
    },

    /**
     * §10.3's third cascade row — every `[tripId, …]` record, in one step, with no id list.
     *
     * The real port does this with `IDBKeyRange.bound([tripId], [tripId, []])`; here it is the
     * same range expressed over the flattened key. Idempotent: a trip with no records is a
     * no-op and not an error (**Q3**), and a `tripId` that is a string prefix of another
     * (`'t'` vs `'t2'`) takes only its own, because the separator terminates the trip half
     * (**Q5**).
     */
    async removeTrip(tripId: TripId): Promise<void> {
      const prefix = `${tripId}\u0000`;
      for (const map of [port.thumbs, port.displays]) {
        for (const k of [...map.keys()]) {
          if (String(k).startsWith(prefix)) Map.prototype.delete.call(map, k);
        }
      }
    },
  };
  return port;
}

/** A clock that does not tick. Pure construction. */
export function fixedClockPort(today: IsoDate): ClockPort {
  return { today: () => today };
}

/** Deterministic ids, `kind-N`. */
export function sequentialIdPort(prefix = ''): IdPort {
  const counters = new Map<string, number>();
  return {
    newId(kind) {
      const n = (counters.get(kind) ?? 0) + 1;
      counters.set(kind, n);
      return `${prefix}${kind}-${n}`;
    },
  };
}

export type ManualScheduler = SchedulerPort & { pending: Array<() => void>; runAll(): void };

/** Runs nothing until `runAll()`, so autosave debouncing is testable without real time. */
export function manualScheduler(): ManualScheduler {
  const port: ManualScheduler = {
    pending: [],
    schedule(fn) {
      port.pending.push(fn);
      let cancelled = false;
      const wrapped = () => {
        if (!cancelled) fn();
      };
      port.pending[port.pending.length - 1] = wrapped;
      return () => {
        cancelled = true;
      };
    },
    runAll() {
      const jobs = port.pending;
      port.pending = [];
      for (const j of jobs) j();
    },
  };
  return port;
}

/** Runs the callback synchronously — useful when a test wants no debounce at all. */
export function immediateScheduler(): SchedulerPort {
  return {
    schedule(fn) {
      fn();
      return () => {};
    },
  };
}
