/**
 * In-memory ports for tests and for the CLI (ARCHITECTURE §4.3).
 *
 * These are what make the state machine attackable in plain Node: no browser, no device,
 * no IndexedDB. `failNextSave` and `failAll` exist so the tester can prove that a failing
 * `StoragePort.save` surfaces as `persistence.status === 'error'` and never silently drops
 * an edit.
 */
import type { IsoDate, TripSummaryRow } from '../deps.ts';
import type {
  ClockPort, FilePort, IdPort, SchedulerPort, StoragePort, StorageVersion, TripDoc,
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
