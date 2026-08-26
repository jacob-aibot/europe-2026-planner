/**
 * The derived cache has R4-1's defect, one level away from `dirty()`
 * (ARCHITECTURE §2.2b "F2 applied: the derived cache has the identical defect"; §4.2 rule 3;
 * ROADMAP Phase 1 F, "`derived` is never read stale").
 *
 * `derivedFor` keyed on `cache.revision === trip.revision && cache.tripId === trip.id`. That
 * is `===` on a content counter suppressing work, and undo makes the counter non-injective
 * over content, so undo-then-a-*different*-edit served the pre-undo document's legs, costs,
 * clusters and conflicts.
 *
 * The architect scoped this one honestly: through `apps/web` the store's subscriber fires
 * synchronously on `undo()`, so React usually re-reads the cache in the gap and the defect is
 * narrow *there*. It is not narrow through `packages/client` used headlessly — the CLI, any
 * test, any future non-React consumer, and `syncResolutions`, which does not render at all
 * and **writes the document** from the derived conflict set. A display bug and a document
 * mutation, from one `===`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createStore, computeDerived, derivedFor, memoryStorage, memoryFile, fixedClockPort,
  sequentialIdPort, immediateScheduler, core,
} from '../src/index.ts';
import type { Action, MemoryStorage, Ports } from '../src/index.ts';

const TODAY = '2026-08-01';
let seq = 0;

function ports(storage: MemoryStorage = memoryStorage(), today = TODAY): Ports {
  return {
    storage,
    file: memoryFile(),
    clock: fixedClockPort(today),
    ids: sequentialIdPort(`x${++seq}-`),
    scheduler: immediateScheduler(),
  };
}

const INIT = {
  title: 'Derived', startDate: '2026-08-07', endDate: '2026-08-10',
  cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
};

const addStop = (dayId: string, name: string, at: { lat: number; lng: number }, order = 0): Action =>
  ({
    type: 'addStop',
    placement: { kind: 'scheduled', dayId, time: '09:00', order },
    stop: { name, category: 'sight', place: { kind: 'inline', at } },
  }) as Action;

/**
 * ROADMAP F's injected fault, verbatim: "call `getDerived()`, `undo()`, then dispatch a
 * *different* edit that lands on the same `revision`, with **no** `getDerived()` call in
 * between."
 */
async function undoThenDifferentEdit() {
  const store = createStore({ ports: ports(), autosave: false });
  await store.createTrip(INIT);
  const doc0 = store.getState().doc as core.Trip;
  const dayA = doc0.days[0].id;
  const dayB = doc0.days[1].id;
  // A seed stop so both candidate edits produce a leg, not just a lone pin.
  store.dispatch(addStop(dayA, 'Seed', { lat: 48.2082, lng: 16.3738 }, 0));

  // Edit A, and the cache is read here — this is the read that poisons it.
  store.dispatch(addStop(dayA, 'ALPHA', { lat: 48.21, lng: 16.38 }, 1));
  const cachedAfterA = store.getDerived();
  assert.ok(cachedAfterA);
  const revisionAfterA = (store.getState().doc as core.Trip).revision;

  // Ctrl-Z, then a DIFFERENT edit, with NO getDerived() call in between.
  store.undo();
  store.dispatch(addStop(dayB, 'BETA', { lat: 43.5081, lng: 16.4402 }, 0));

  const doc = store.getState().doc as core.Trip;
  assert.equal(doc.revision, revisionAfterA,
    'INCONCLUSIVE: edit B did not land on the revision edit A used, so the cache defect was never reachable');
  assert.notEqual(core.toJSON(doc), core.toJSON(cachedAfterA.doc),
    'INCONCLUSIVE: the two edits produced the same document');
  return { store, doc, dayA, dayB, cachedAfterA };
}

test('R4-1 at the cache: getDerived() after undo-then-a-different-edit reflects the new edit', async () => {
  const { store, doc, dayA, dayB, cachedAfterA } = await undoThenDifferentEdit();

  const derived = store.getDerived();
  assert.ok(derived);
  assert.notEqual(derived, cachedAfterA, 'the pre-undo cache was served');
  assert.equal(derived.doc, doc, 'the cache does not name the document it was computed from');

  // On values the new edit changes and the undone one did not: edit A put a second stop on
  // day A (a leg); edit B put a lone stop on day B (no leg on A, one pin on B).
  assert.equal(cachedAfterA.days[dayA].legs.length, 2, 'precondition: edit A produced two legs on day A');
  assert.equal(derived.days[dayA].legs.length, 1, "day A still shows the undone edit's leg");
  assert.equal(derived.days[dayB].legs.length, 1, "day B does not show the new edit's stop");

  // And the whole cache equals the exact answer, which is the oracle §2.2b F2 names.
  assert.deepEqual(derived, computeDerived(doc, TODAY));
});

test('R4-1 at the cache: syncResolutions does not retire a resolution whose conflict is live', async () => {
  // ROADMAP F: "the stale cache there does not merely render, it writes." `syncResolutions`
  // reads the derived conflict set and writes the DOCUMENT from it, so a stale cache retires
  // resolutions against conflicts the current document does not have — and, in this shape,
  // against one it *does*.
  const store = createStore({ ports: ports(), autosave: false });
  await store.createTrip(INIT);
  const dayA = (store.getState().doc as core.Trip).days[0].id;
  const dayB = (store.getState().doc as core.Trip).days[1].id;

  // A flagged day is a `legacy_flag` blocker. Acknowledge it: that is a LIVE resolution.
  store.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { legacyFlag: true, subtitle: 'WHY IT IS FLAGGED' } } as Action);
  const flagged = store.getDerived()?.conflicts.filter((c) => c.ruleId === 'legacy_flag') ?? [];
  assert.equal(flagged.length, 1, 'precondition: the flagged day did not produce a blocker');
  const conflictId = flagged[0].id;
  store.dispatch({
    type: 'resolveConflict',
    resolution: { conflictId, state: 'acknowledged', at: TODAY, by: core.LOCAL_OWNER, note: '' },
  } as Action);
  assert.equal(store.getState().doc?.resolutions.filter((r) => !r.retiredAt).length, 1);

  // Edit A rewrites the subtitle, so the conflict is content-addressed to a NEW id and the
  // acknowledged one is absent from the set. Read the cache here.
  store.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { subtitle: 'REWORDED' } } as Action);
  const staleCache = store.getDerived();
  assert.ok(staleCache);
  assert.equal(staleCache.conflicts.some((c) => c.id === conflictId), false,
    'precondition: edit A must make the acknowledged conflict disappear');
  const revisionAfterA = (store.getState().doc as core.Trip).revision;

  // Ctrl-Z puts the original subtitle — and therefore the acknowledged conflict — back. Then
  // a DIFFERENT edit, on another day, landing on the same revision. No getDerived() between.
  store.undo();
  store.dispatch(addStop(dayB, 'UNRELATED', { lat: 48.2082, lng: 16.3738 }, 0));
  const doc = store.getState().doc as core.Trip;
  assert.equal(doc.revision, revisionAfterA, 'INCONCLUSIVE: the two edits did not land on one revision');
  assert.equal(
    computeDerived(doc, TODAY).conflicts.some((c) => c.id === conflictId),
    true,
    'INCONCLUSIVE: the acknowledged conflict is not in the current document, so nothing could be wrongly retired',
  );

  store.syncResolutions();

  const after = store.getState().doc as core.Trip;
  const row = after.resolutions.find((r) => r.conflictId === conflictId);
  assert.ok(row, 'the resolution row vanished entirely');
  assert.equal(row.retiredAt, null,
    'a stale derived cache retired a resolution whose conflict is present in the current document');
});

test('the cache invalidates when the clock rolls over, not only when the document changes', () => {
  // §2.2b: adding `today` closes a smaller pre-existing hole — the date-sensitive conflict
  // rules went stale across midnight because nothing invalidated on the clock.
  const ctx = { ids: sequentialIdPort(), now: TODAY, actorUserId: core.LOCAL_OWNER };
  const trip = core.createTrip(INIT, ctx);
  const cache = computeDerived(trip, '2026-08-01');
  assert.equal(cache.today, '2026-08-01');
  assert.equal(derivedFor(cache, trip, '2026-08-01'), cache, 'same document, same day: no recompute');

  const next = derivedFor(cache, trip, '2026-08-02');
  assert.notEqual(next, cache, 'the cache survived midnight');
  assert.equal(next?.today, '2026-08-02');
});

test('the cache is reused by identity, so it is not recomputed on every read', async () => {
  const store = createStore({ ports: ports(), autosave: false });
  await store.createTrip(INIT);
  const first = store.getDerived();
  assert.ok(first);
  assert.equal(store.getDerived(), first);
  assert.equal(store.getDerived(), first);
});
