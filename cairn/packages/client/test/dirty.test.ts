/**
 * R4-1 — "is there an unwritten edit" is document identity, not a revision comparison
 * (ARCHITECTURE §2.2b F1/F2, §4.2 rules 4 and 6a′; ROADMAP Phase 1 F, "Seventh case").
 *
 * The sixth NO-SILENT-LOSS case assumed that if a transition flushes, the edit is safe. It
 * flushes *conditionally*, and the condition was `doc.revision !== savedRevision` — a content
 * counter being asked whether an edit would be lost. `undo()` restores a snapshot verbatim,
 * `revision` included, so a document can be undone to *N−1* and pushed forward by a
 * **different** edit back to *N*. The store then reported "nothing to write", skipped the
 * write, completed the switch, and displayed "Saved" over a document storage did not hold.
 * One click, no second tab, nothing on screen.
 *
 * Two things in here are as load-bearing as the fix:
 *
 *   - the **inconclusive-not-pass precondition**. Round 4's own 22 tests missed this bug, so
 *     the sequence asserts that it really did reproduce the undo-then-different-edit shape
 *     before it draws any conclusion. A run where the precondition does not hold FAILS; it
 *     does not quietly pass having exercised nothing.
 *   - the **oracle**. Ten of round 4's tests used `isDirty() === false` as their proof that a
 *     write had happened — the broken predicate asserting its own correctness. Everything
 *     here asserts the port's stored bytes, and the 200-step walk checks the cheap runtime
 *     predicate against the expensive exact one (§2.2b F2) at every single step.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import {
  createStore, computeDerived, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort,
  manualScheduler, immediateScheduler, core,
} from '../src/index.ts';
import type { Action, MemoryStorage, Ports, SaveOutcome, SchedulerPort, StorageVersion } from '../src/index.ts';

const TODAY = '2026-08-01';
let seq = 0;

/** Ask for the store's OWN `setTimeout` scheduler — ROADMAP F's "real timers, not the manual one". */
const REAL_TIMERS = Symbol('real timers');

function ports(storage: MemoryStorage, scheduler: SchedulerPort | typeof REAL_TIMERS = immediateScheduler()): Ports {
  const base = {
    storage,
    file: memoryFile(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(`d${++seq}-`),
  };
  return scheduler === REAL_TIMERS ? base : { ...base, scheduler };
}

const INIT = (title: string) => ({
  title, startDate: '2026-08-07', endDate: '2026-08-09',
  cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
});

/** The save indicator exactly as `apps/web/src/App.tsx` renders it. */
function saveIndicator(store: ReturnType<typeof createStore>): string {
  const { status } = store.getState().persistence;
  if (status === 'conflict') return 'Not saved — edited elsewhere';
  if (status === 'error') return 'Not saved — retry';
  if (status === 'saving') return 'Saving…';
  return store.isDirty() ? 'Unsaved changes' : 'Saved';
}

/** The banner `apps/web/src/App.tsx` renders beneath it — §4.2 rule 6b names both recoveries. */
function banner(store: ReturnType<typeof createStore>): string {
  const { status, lastError } = store.getState().persistence;
  if (status === 'conflict') return `${lastError ?? ''} Merge and save. Export this copy.`;
  if (status === 'error') return `Not saved. ${lastError ?? ''} Retry. Export this copy.`;
  return '';
}

const bytesFor = (storage: MemoryStorage, id: string) => storage.docs.get(id) ?? null;

/** A storage that refuses every compare-and-set, with no other writer existing. */
function refusingStorage(): MemoryStorage {
  const storage = memoryStorage();
  const real = storage.saveIfVersion.bind(storage);
  let armed = false;
  const port = storage as MemoryStorage & { arm(): void };
  port.arm = () => { armed = true; };
  storage.saveIfVersion = async (id, expected, doc, summary): Promise<SaveOutcome> => {
    if (armed) return { ok: false, storedVersion: (storage.versions.get(id) ?? null) as StorageVersion | null };
    return real(id, expected, doc, summary);
  };
  return port;
}

// ---------------------------------------------------------------------------
// The seventh case: the write that was never attempted.
// ---------------------------------------------------------------------------

/**
 * ROADMAP F, verbatim: "One store, autosave on. Dispatch edit A; `await flush()`; record
 * `r = state.doc.revision` and the stored bytes. `undo()`. Inside the 400 ms debounce window
 * dispatch **one** different edit B."
 *
 * Real timers and the real scheduler — a manual scheduler does not satisfy this criterion,
 * for the same reason it did not satisfy the sixth case.
 */
async function undoThenDifferentEdit(storage: MemoryStorage) {
  const store = createStore({ ports: ports(storage, REAL_TIMERS) });
  await store.createTrip(INIT('Seventh case'));
  const id = store.getState().activeTripId as string;
  const dayId = store.getState().doc?.days[0].id as string;

  // Edit A, written and settled.
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'EDIT A' } } as Action);
  await store.flush();
  const r = store.getState().doc?.revision as number;
  const storedAfterA = bytesFor(storage, id) as string;
  assert.ok(storedAfterA.includes('EDIT A'), 'precondition: edit A was never stored');

  // Ctrl-Z, then ONE different edit inside the debounce window.
  store.undo();
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'EDIT B' } } as Action);

  // THE PRECONDITION, and it fails the run rather than passing it (ROADMAP F): a run where
  // the revision did not land back on `r`, or where the document happens to equal the stored
  // bytes, has not exercised the defect at all — which is exactly how round 4's own suite
  // missed it.
  assert.equal(store.getState().doc?.revision, r,
    'INCONCLUSIVE: edit B did not land on the revision edit A used, so the R4-1 shape was never reproduced');
  assert.notEqual(core.toJSON(store.getState().doc as core.Trip), bytesFor(storage, id),
    'INCONCLUSIVE: the in-memory document already equals the stored bytes, so there is nothing to lose');

  // And the `beforeunload` gate, which R4-1 also defeated: that handler is gated on isDirty().
  assert.equal(store.isDirty(), true, 'isDirty() is false over an unwritten edit — the "Leave site?" prompt is gone');
  assert.equal(saveIndicator(store), 'Unsaved changes');

  return { store, id, dayId, r, storedAfterA };
}

test('R4-1 seventh case: closeTrip inside the debounce window writes edit B', async () => {
  const storage = memoryStorage();
  const { store, id } = await undoThenDifferentEdit(storage);

  await store.closeTrip();

  const stored = bytesFor(storage, id) as string;
  assert.ok(stored.includes('EDIT B'), 'the switch completed with the pre-undo document in storage');
  assert.equal(store.getState().doc, null, 'the trip did not close');
  assert.equal(store.isDirty(), false);
  assert.equal(saveIndicator(store), 'Saved');
});

test('R4-1: with no pending timer at all, identity is the only thing that can save the edit', async () => {
  // The seventh case as ROADMAP states it has a debounce timer pending, so the "no pending
  // timer" conjunct alone would rescue that particular sequence. This variant removes the
  // timer entirely (autosave off, so nothing is ever scheduled) and leaves `status === 'idle'`
  // true, which means `state.doc === state.persistence.savedDoc` is the ONLY conjunct that can
  // decide the skip. §2.2b: "The third is the real condition."
  const storage = memoryStorage();
  const store = createStore({ ports: ports(storage), autosave: false });
  await store.createTrip(INIT('No timer'));
  const id = store.getState().activeTripId as string;
  const dayId = store.getState().doc?.days[0].id as string;

  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'EDIT A' } } as Action);
  await store.flush();
  const r = store.getState().doc?.revision as number;

  store.undo();
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'EDIT B' } } as Action);
  assert.equal(store.getState().doc?.revision, r,
    'INCONCLUSIVE: edit B did not land on the revision edit A used');
  assert.notEqual(core.toJSON(store.getState().doc as core.Trip), bytesFor(storage, id),
    'INCONCLUSIVE: the document already equals the stored bytes');
  assert.equal(store.getState().persistence.status, 'idle', 'precondition: status must be idle');
  assert.equal(store.isDirty(), true);

  await store.closeTrip();
  assert.ok((bytesFor(storage, id) as string).includes('EDIT B'),
    'the skip fired on an unwritten edit with no timer to rescue it');
  assert.equal(store.isDirty(), false);
});

test('R4-1 seventh case: openTrip(other) writes TRIP A’s bytes, not trip B’s', async () => {
  const storage = memoryStorage();
  // A second trip to switch to, created first so the seventh-case store is the one under test.
  const seed = createStore({ ports: ports(storage) });
  await seed.createTrip(INIT('The other trip'));
  const otherId = seed.getState().activeTripId as string;

  const { store, id } = await undoThenDifferentEdit(storage);
  await store.refreshLibrary();
  await store.openTrip(otherId);

  const storedA = bytesFor(storage, id) as string;
  assert.ok(storedA.includes('EDIT B'), "trip A's pending edit was skipped by the switch");
  assert.equal(store.getState().activeTripId, otherId, 'the switch did not happen');
  assert.equal(store.isDirty(), false);
});

test('R4-1 seventh case: deleteTrip(other) still flushes the active document', async () => {
  const storage = memoryStorage();
  const seed = createStore({ ports: ports(storage) });
  await seed.createTrip(INIT('Doomed'));
  const doomedId = seed.getState().activeTripId as string;

  const { store, id } = await undoThenDifferentEdit(storage);
  await store.refreshLibrary();
  await store.deleteTrip(doomedId);

  assert.equal(storage.docs.has(doomedId), false, 'the other trip was not deleted');
  const storedA = bytesFor(storage, id) as string;
  assert.ok(storedA.includes('EDIT B'), "deleting another trip skipped the active trip's pending edit");
  assert.equal(store.isDirty(), false);
});

test('R4-1 seventh case, refused: none of the three transitions happen', async () => {
  for (const which of ['closeTrip', 'openTrip', 'deleteTrip'] as const) {
    const storage = refusingStorage() as MemoryStorage & { arm(): void };
    const seed = createStore({ ports: ports(storage) });
    await seed.createTrip(INIT('The other trip'));
    const otherId = seed.getState().activeTripId as string;

    const { store, id } = await undoThenDifferentEdit(storage);
    const before = bytesFor(storage, id) as string;
    await store.refreshLibrary();
    storage.arm();

    if (which === 'closeTrip') await store.closeTrip();
    else if (which === 'openTrip') await store.openTrip(otherId);
    else await store.deleteTrip(otherId);

    assert.equal(store.getState().activeTripId, id, `${which}: the switch proceeded over an unsaved edit`);
    assert.equal(store.getState().doc?.days[0].title, 'EDIT B', `${which}: edit B left memory`);
    assert.equal(bytesFor(storage, id), before, `${which}: storage moved behind a refused flush`);
    assert.notEqual(saveIndicator(store), 'Saved', `${which}: the indicator said "Saved"`);
    assert.match(banner(store), /Merge and save\./, `${which}: the merge recovery is not named`);
    assert.match(banner(store), /Export this copy\./, `${which}: the export recovery is not named`);
    assert.equal(storage.docs.has(otherId), true, `${which}: a refused flush still let the delete through`);
  }
});

// ---------------------------------------------------------------------------
// `dirty()` is reference identity against `savedDoc`.
// ---------------------------------------------------------------------------

test('savedDoc is the document storage last agreed with us about, and dirty() is === against it', async () => {
  const storage = memoryStorage();
  const store = createStore({ ports: ports(storage), autosave: false });
  assert.equal(store.getState().persistence.savedDoc, null, 'a store with no trip has agreed about nothing');

  await store.createTrip(INIT('Identity'));
  const id = store.getState().activeTripId as string;
  const dayId = store.getState().doc?.days[0].id as string;
  assert.equal(store.getState().persistence.savedDoc, store.getState().doc, 'savedDoc is not the document written');
  assert.equal(store.isDirty(), false);
  assert.equal(core.toJSON(store.getState().doc as core.Trip), bytesFor(storage, id));

  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'TYPED' } } as Action);
  assert.notEqual(store.getState().doc, store.getState().persistence.savedDoc);
  assert.equal(store.isDirty(), true);
  assert.equal(bytesFor(storage, id)?.includes('TYPED'), false, 'the edit reached storage with autosave off');

  await store.flush();
  assert.equal(store.getState().persistence.savedDoc, store.getState().doc);
  assert.equal(store.isDirty(), false);
  assert.equal(bytesFor(storage, id)?.includes('TYPED'), true);

  // openTrip's savedDoc is load()'s result; close and delete clear it.
  const other = createStore({ ports: ports(storage) });
  await other.refreshLibrary();
  await other.openTrip(id);
  assert.equal(other.getState().persistence.savedDoc, other.getState().doc, 'openTrip did not set savedDoc');
  assert.equal(other.isDirty(), false);
  assert.equal(core.toJSON(other.getState().doc as core.Trip), bytesFor(storage, id));
  await other.closeTrip();
  assert.equal(other.getState().persistence.savedDoc, null, 'closeTrip left savedDoc pointing at a closed trip');
});

test('the reducer never moves savedDoc: undo and redo change the document, not what storage holds', async () => {
  const storage = memoryStorage();
  const store = createStore({ ports: ports(storage), autosave: false });
  await store.createTrip(INIT('Undo'));
  const id = store.getState().activeTripId as string;
  const dayId = store.getState().doc?.days[0].id as string;
  await store.flush();
  const agreed = store.getState().persistence.savedDoc;
  const agreedBytes = bytesFor(storage, id);

  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'ONE' } } as Action);
  assert.equal(store.getState().persistence.savedDoc, agreed, 'a dispatch moved savedDoc');
  store.undo();
  assert.equal(store.getState().persistence.savedDoc, agreed, 'undo moved savedDoc');
  store.redo();
  assert.equal(store.getState().persistence.savedDoc, agreed, 'redo moved savedDoc');
  assert.equal(bytesFor(storage, id), agreedBytes, 'the undo stack reached storage');

  // Undo back onto the saved document: identity says clean, and the bytes agree.
  store.undo();
  assert.equal(store.getState().doc, agreed, 'undo did not land back on the saved document');
  assert.equal(store.isDirty(), false);
  assert.equal(core.toJSON(store.getState().doc as core.Trip), bytesFor(storage, id));
});

test('flush() is unconditional: it never consults the dirty predicate', async () => {
  // §2.2b: "flush() itself remains unconditional (QA round 4 confirmed it does not consult
  // dirty(), and it must not start)." Asserted behaviourally — a clean store's flush still
  // reaches the port — and on the source, because the behavioural half would keep passing if
  // someone added the check and the store happened to be dirty in every test.
  const storage = memoryStorage();
  const store = createStore({ ports: ports(storage), autosave: false });
  await store.createTrip(INIT('Unconditional'));
  const id = store.getState().activeTripId as string;
  assert.equal(store.isDirty(), false, 'precondition: the store must be clean');

  const before = storage.saveCount;
  await store.flush();
  assert.equal(storage.saveCount, before + 1, 'flush() skipped the write on a clean store');
  assert.equal(core.toJSON(store.getState().doc as core.Trip), bytesFor(storage, id));

  const src = readFileSync(new URL('../src/store/store.ts', import.meta.url), 'utf8');
  const flushBody = src.slice(src.indexOf('async flush('), src.indexOf('isDirty()'));
  assert.equal(/dirty\(\)/.test(flushBody), false, 'flush() now consults the dirty predicate');
});

test('flushForTransition skips only on all three of idle, no timer, and doc === savedDoc', async () => {
  // §2.2b: "The third is the real condition; the first two are belt and braces and are stated
  // as such — each can only cause more writing, never less."
  const storage = memoryStorage();
  const sched = manualScheduler();
  const store = createStore({ ports: ports(storage, sched) });
  await store.createTrip(INIT('Skip'));
  const id = store.getState().activeTripId as string;
  const dayId = store.getState().doc?.days[0].id as string;
  assert.equal(store.isDirty(), false, 'precondition: nothing to save');
  assert.equal(core.toJSON(store.getState().doc as core.Trip), bytesFor(storage, id));

  const clean = storage.saveCount;
  await store.closeTrip();
  assert.equal(storage.saveCount, clean, 'a clean, idle, timer-free transition rewrote 176 KB anyway');

  // A pending timer alone forces the write, even though the document is identical: the
  // conjunct can only cause MORE writing.
  await store.refreshLibrary();
  await store.openTrip(id);
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'PENDING' } } as Action);
  assert.ok(sched.pending.length > 0, 'nothing was scheduled');
  const withTimer = storage.saveCount;
  await store.closeTrip();
  assert.ok(storage.saveCount > withTimer, 'a pending timer did not force the write');
  assert.equal(bytesFor(storage, id)?.includes('PENDING'), true);

  // Source-level: the skip reads exactly the three conjuncts and no revision.
  const src = readFileSync(new URL('../src/store/store.ts', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('async function flushForTransition'), src.indexOf('function dirty('));
  const code = fn.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.equal(/revision/.test(code), false, 'flushForTransition still reads a revision');
  assert.match(code, /status === 'idle'/);
  assert.match(code, /cancelPending/);
  assert.match(code, /dirty\(\)/);
});

// ---------------------------------------------------------------------------
// The oracle: the exact-but-expensive answer checking the cheap runtime one.
// ---------------------------------------------------------------------------

/** A seeded chooser, so a failing run is replayable from the seed the failure prints. */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('200-step deterministic walk: isDirty() agrees with the stored bytes at every step', async () => {
  // ROADMAP F: "assert at EVERY step: store.isDirty() === (core.toJSON(state.doc) !== <the
  // bytes the port currently holds for that id>). Ceiling: zero disagreements across 200
  // steps, not 'agreement at the end'."
  const seed = Number(process.env.CAIRN_WALK_SEED ?? 20260826);
  const rand = seededRandom(seed);
  const storage = memoryStorage();
  const sched = manualScheduler();
  const store = createStore({ ports: ports(storage, sched) });
  await store.createTrip(INIT('The walk'));
  const id = store.getState().activeTripId as string;
  const dayIds = (store.getState().doc as core.Trip).days.map((d) => d.id);

  const log: string[] = [];
  const check = (step: number, what: string) => {
    log.push(`${step}: ${what}`);
    const doc = store.getState().doc;
    const oracle = doc === null ? false : core.toJSON(doc) !== (storage.docs.get(id) ?? null);
    assert.equal(
      store.isDirty(),
      oracle,
      `seed ${seed}, step ${step} (${what}): the dirty predicate and the bytes disagree (bytes say ${oracle})\n` +
        log.slice(-8).join('\n'),
    );
    // ROADMAP F's ceiling for the derived cache, on the same walk: "assert getDerived()
    // deep-equals computeDerived(state.doc, today) at EVERY step: zero divergences, not
    // 'converges by the end'."
    if (doc === null) assert.equal(store.getDerived(), null, `seed ${seed}, step ${step}: derived outlived the document`);
    else assert.deepEqual(store.getDerived(), computeDerived(doc, TODAY),
      `seed ${seed}, step ${step} (${what}): the derived cache is stale\n${log.slice(-8).join('\n')}`);
  };
  check(0, 'start');

  let n = 0;
  for (let step = 1; step <= 200; step++) {
    const roll = rand();
    if (store.getState().doc === null) {
      await store.openTrip(id);
      check(step, 'openTrip (reopen)');
      continue;
    }
    if (roll < 0.42) {
      const dayId = dayIds[Math.floor(rand() * dayIds.length)];
      store.dispatch({ type: 'setDayMeta', dayId, patch: { title: `T${++n}` } } as Action);
      check(step, 'dispatch');
    } else if (roll < 0.6) {
      store.undo();
      check(step, 'undo');
    } else if (roll < 0.72) {
      store.redo();
      check(step, 'redo');
    } else if (roll < 0.84) {
      await store.flush();
      check(step, 'flush');
    } else if (roll < 0.92) {
      sched.runAll();
      await store.flush();
      check(step, 'debounce fired');
    } else {
      await store.closeTrip();
      check(step, 'closeTrip');
      await store.openTrip(id);
      check(step, 'openTrip');
    }
  }

  // The walk must actually have been dirty somewhere, or it proved nothing.
  assert.ok(n > 20, `seed ${seed}: the walk dispatched only ${n} edits`);
});

// ---------------------------------------------------------------------------
// Mechanical checks (ROADMAP F, "How a criterion is written" rule 1).
// ---------------------------------------------------------------------------

const CLIENT_SRC = new URL('../src/', import.meta.url);
const WEB_SRC = new URL('../../../apps/web/src/', import.meta.url);

function sourcesUnder(dir: URL, prefix = ''): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) out.push(...sourcesUnder(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`));
    else if (/\.tsx?$/.test(entry.name)) out.push([prefix + entry.name, readFileSync(new URL(entry.name, dir), 'utf8')]);
  }
  return out;
}

test('savedRevision does not exist anywhere in packages/client/src or apps/web/src', () => {
  // ROADMAP F, a ceiling: "revision 3 left the field in place with one consumer, and that
  // consumer was R4-1; a field that exists is a field the next person compares."
  for (const [where, files] of [['packages/client/src', sourcesUnder(CLIENT_SRC)], ['apps/web/src', sourcesUnder(WEB_SRC)]] as const) {
    for (const [name, src] of files) {
      assert.equal(/savedRevision/.test(src), false, `${where}/${name} still names savedRevision`);
    }
  }
});

test('every remaining `revision` comparison outside packages/core is listed and justified', () => {
  // §2.2b F2's check: "grep packages/client and apps/web for `revision` in a === or !==, and
  // for `revision` in a React dependency array or any other memoisation key. Every hit is a
  // defect unless the comparison can only ever cause MORE work to happen."
  //
  // The expected list is empty. An unjustified occurrence fails the run.
  const justified = new Map<string, string>();

  const hits: string[] = [];
  for (const [where, files] of [['packages/client/src', sourcesUnder(CLIENT_SRC)], ['apps/web/src', sourcesUnder(WEB_SRC)]] as const) {
    for (const [name, src] of files) {
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const line of code.split('\n')) {
        if (!/revision/.test(line)) continue;
        if (!/revision\s*!?===?|===?\s*[\w.]*revision/.test(line)) continue;
        hits.push(`${where}/${name}: ${line.trim()}`);
      }
    }
  }
  const unjustified = hits.filter((h) => !justified.has(h));
  assert.deepEqual(unjustified, [], `unjustified revision comparisons:\n${unjustified.join('\n')}`);
});

test('no React dependency array or memo key in apps/web/src contains a revision', () => {
  // ROADMAP F: "DayMap's effect was one, and a dependency array is === suppressing work,
  // which is exactly what §2.2a rule 1 forbids."
  for (const [name, src] of sourcesUnder(WEB_SRC)) {
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of code.matchAll(/\}\s*,\s*\[([^\]]*)\]\s*\)/g)) {
      assert.equal(/revision/.test(m[1]), false, `${name} memoises on a revision: [${m[1].trim()}]`);
    }
  }
});

test('savedDoc and savedVersion are only ever assigned from a StoragePort result', () => {
  // ROADMAP F: "for savedDoc, to the exact document that write carried"; and "the reducer
  // contains no reference to either", so no undo, redo or set() can make the store believe an
  // unwritten document was written.
  const src = readFileSync(new URL('store/store.ts', CLIENT_SRC), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const savedDoc = [...code.matchAll(/savedDoc:\s*([^,\n}]+)/g)].map((m) => m[1].trim());
  assert.ok(savedDoc.length > 0, 'the store never assigns savedDoc — did it move?');
  // `toWrite` is the document `saveIfVersion` carried; `doc` in `openTrip` is `load()`'s
  // result; `null` is "we have agreed about nothing".
  for (const rhs of savedDoc) {
    assert.ok(['toWrite', 'doc', 'null'].includes(rhs), `savedDoc is assigned from "${rhs}", which is not a port result`);
  }

  const reducer = readFileSync(new URL('store/reducer.ts', CLIENT_SRC), 'utf8');
  const bodies = reducer.slice(reducer.indexOf('export function applyAction'));
  assert.equal(/savedDoc/.test(bodies), false, 'a reducer function moves savedDoc');
  assert.equal(/savedVersion/.test(bodies), false, 'a reducer function moves the write fence');
});

test('no test proves a write with isDirty() alone', () => {
  // ROADMAP F: "in packages/client/test, every assertion on isDirty() sits in a test that also
  // asserts on the port's stored bytes for the id in question. This one is a heuristic and is
  // stated as one — it is greppable per test block and it is what would have made round 4's
  // suite catch its own blind spot."
  const dir = new URL('./', import.meta.url);
  // Built from parts so this block does not match its own scan.
  const assertsDirty = new RegExp(`assert[^\\n]*is${'Dirty'}\\(\\)`);
  const readsStoredBytes = /\.docs\.get\(|storedTitle\(|bytesFor\(|storedBytes\(/;
  let blocksChecked = 0;
  for (const name of readdirSync(dir)) {
    if (!/\.test\.ts$/.test(name)) continue;
    const src = readFileSync(new URL(name, dir), 'utf8');
    const blocks = src.split(/\ntest\(/);
    for (const [i, block] of blocks.entries()) {
      const label = i === 0 ? `${name} (module preamble)` : `${name} :: ${block.slice(0, block.indexOf('\n')).slice(0, 90)}`;
      // Comments are not assertions; a docstring quoting the criterion is not a violation of it.
      const code = block.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      if (!assertsDirty.test(code)) continue;
      blocksChecked++;
      assert.ok(readsStoredBytes.test(code), `${label} asserts on the dirty predicate without asserting the stored bytes`);
    }
  }
  assert.ok(blocksChecked > 8, `only ${blocksChecked} blocks assert on the dirty predicate — did the scan break?`);
});
