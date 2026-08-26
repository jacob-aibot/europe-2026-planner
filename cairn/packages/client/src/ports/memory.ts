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
  /** Make exactly the next save reject. */
  failNextSave: string | null;
  /** Make every save reject until cleared. */
  failAll: string | null;
  saveCount: number;
};

/**
 * Impure only in that it holds state.
 *
 * `epoch` is the in-memory equivalent of the persisted epoch `apps/web` mints with
 * `crypto.randomUUID()`: it defaults to a fixed string so tests stay deterministic, and a
 * test models "two different databases" by passing two epochs. Together with the
 * storage-wide counter it makes a version unique across every storage that ever existed —
 * §2.2a rule 2, which is what closes R3-4.
 */
export function memoryStorage(seed?: Record<string, TripDoc>, epoch = 'mem'): MemoryStorage {
  const docs = new Map<string, TripDoc>(Object.entries(seed ?? {}));
  const summaries = new Map<string, TripSummaryRow>();
  const versions = new Map<string, StorageVersion>();
  /** Storage-wide, never per-record, and it never rewinds — not even on `delete()`. */
  let counter = 0;
  const mint = (): StorageVersion => `${epoch}.${++counter}`;
  // The one-time upcast of §2.2a: a seeded record predates the fence, so it is stamped
  // before any read is served rather than being served versionless.
  for (const id of docs.keys()) versions.set(id, mint());

  const port: MemoryStorage = {
    docs,
    summaries,
    versions,
    failNextSave: null,
    failAll: null,
    saveCount: 0,
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
