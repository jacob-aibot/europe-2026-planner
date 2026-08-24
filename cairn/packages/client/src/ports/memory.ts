/**
 * In-memory ports for tests and for the CLI (ARCHITECTURE §4.3).
 *
 * These are what make the state machine attackable in plain Node: no browser, no device,
 * no IndexedDB. `failNextSave` and `failAll` exist so the tester can prove that a failing
 * `StoragePort.save` surfaces as `persistence.status === 'error'` and never silently drops
 * an edit.
 */
import type { IsoDate, TripSummaryRow } from '../deps.ts';
import type { ClockPort, FilePort, IdPort, SchedulerPort, StoragePort, TripDoc } from './types.ts';

export type MemoryStorage = StoragePort & {
  docs: Map<string, TripDoc>;
  summaries: Map<string, TripSummaryRow>;
  /** Make exactly the next save reject. */
  failNextSave: string | null;
  /** Make every save reject until cleared. */
  failAll: string | null;
  saveCount: number;
};

/** Impure only in that it holds state. */
export function memoryStorage(seed?: Record<string, TripDoc>): MemoryStorage {
  const docs = new Map<string, TripDoc>(Object.entries(seed ?? {}));
  const summaries = new Map<string, TripSummaryRow>();
  const port: MemoryStorage = {
    docs,
    summaries,
    failNextSave: null,
    failAll: null,
    saveCount: 0,
    async listTrips() {
      return [...summaries.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
    },
    async load(id) {
      return docs.get(id) ?? null;
    },
    async save(id, doc, summary) {
      port.saveCount++;
      if (port.failAll) throw new Error(port.failAll);
      if (port.failNextSave) {
        const msg = port.failNextSave;
        port.failNextSave = null;
        throw new Error(msg);
      }
      docs.set(id, doc);
      summaries.set(id, summary);
    },
    async delete(id) {
      docs.delete(id);
      summaries.delete(id);
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
