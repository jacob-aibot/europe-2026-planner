/**
 * A-5 — the retirement ledger (ARCHITECTURE §2.7 revision 6, QA R8-1, ROADMAP C/F).
 *
 * `syncResolutions` writes `retiredAt` into the **document**, outside the reducer, because
 * §2.7 forbids bookkeeping from consuming an undo slot. But §4.2 rule 5's undo is a snapshot
 * restore over that same document and `history.past` already holds the pre-retirement `Trip`,
 * so Ctrl+Z restored `retiredAt: null` and a dismissed **blocker** rendered *"Marked dismissed
 * on <date>"* after a keystroke that acknowledged nothing.
 *
 * The ruling: *undo restores the plan; it does not restore the user's ignorance of what has
 * already been retired.* A per-trip ledger in `AppState`, outside `history` and never
 * persisted, re-asserts retirement onto every restored snapshot inside the same `set()`.
 *
 * Everything below runs in plain Node against the in-memory ports.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  createStore, core,
  memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, manualScheduler,
} from '../src/index.ts';
import type { AppState } from '../src/index.ts';
import type { Ports } from '../src/ports/types.ts';

const TODAY = '2026-08-01';

function ports(storage = memoryStorage()) {
  return {
    storage,
    file: memoryFile(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(),
    scheduler: manualScheduler(),
  } as Ports & { storage: ReturnType<typeof memoryStorage>; scheduler: ReturnType<typeof manualScheduler> };
}

const TRIP_INIT = {
  title: 'Ledger trip',
  startDate: '2026-08-07',
  endDate: '2026-08-09',
  cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
};

type Store = ReturnType<typeof createStore>;

/**
 * The exact QA R8-1 setup: a **blocker** the user dismissed, whose triggering data condition
 * is then removed so the next `getDerived()` retires the resolution.
 *
 * `legacy_flag` is the rule because it is one of the two blockers on the real trip and it is
 * driven by one boolean the user can toggle, so the conflict's presence is under the test's
 * control without any timing.
 */
async function dismissedThenRetired(p = ports()): Promise<{
  store: Store; conflictId: string; dayId: string; pastAtRetirement: number;
}> {
  const store = createStore({ ports: p });
  await store.createTrip(TRIP_INIT);
  const dayId = store.getState().doc!.days[0].id;

  store.dispatch({ type: 'setDayMeta', dayId, patch: { legacyFlag: true } });
  const conflict = store.getDerived()!.conflicts.find((c) => c.ruleId === 'legacy_flag');
  assert.ok(conflict, 'the setup must produce a legacy_flag blocker');
  assert.equal(conflict.severity, 'blocker');

  store.dispatch({
    type: 'resolveConflict',
    resolution: { conflictId: conflict.id, state: 'dismissed', by: 'local:self', at: TODAY },
  });
  store.dispatch({ type: 'setDayMeta', dayId, patch: { legacyFlag: false } });
  const pastAtRetirement = store.getState().history.past.length;

  store.getDerived(); // the render that retires — B-2's call site
  assert.equal(
    store.getState().doc!.resolutions.filter((r) => r.retiredAt !== null).length,
    1,
    'the render must retire the resolution once the conflict is gone',
  );
  assert.equal(
    store.getState().history.past.length,
    pastAtRetirement,
    'retirement is bookkeeping: §2.7 forbids it from consuming an undo slot',
  );
  return { store, conflictId: conflict.id, dayId, pastAtRetirement };
}

const rowFor = (state: AppState, conflictId: string) =>
  state.doc!.resolutions.find((r) => r.conflictId === conflictId && r.retiredAt !== null) ??
  state.doc!.resolutions.find((r) => r.conflictId === conflictId) ??
  null;

// ---------------------------------------------------------------------------
// The four-action sequence QA measured, closed.
// ---------------------------------------------------------------------------

test('A-5 (R8-1): undo does not un-retire, and the blocker does not come back "dismissed"', async () => {
  const { store, conflictId, pastAtRetirement } = await dismissedThenRetired();
  assert.equal(rowFor(store.getState(), conflictId)!.retiredAt, TODAY);

  store.undo();

  const row = rowFor(store.getState(), conflictId);
  assert.ok(row, 'the resolution row vanished entirely');
  assert.equal(row.retiredAt, TODAY, 'Ctrl+Z restored `retiredAt: null` — R8-1, verbatim');
  assert.equal(
    store.getState().history.past.length,
    pastAtRetirement - 1,
    'history.past moved by more than the one real user edit the undo took back',
  );

  // The conflict is live again (the day is flagged again) — and it renders as a LIVE blocker
  // with NO resolution attached, not as a dismissed one.
  const back = store.getDerived()!.conflicts.find((c) => c.id === conflictId);
  assert.ok(back, 'the conflict must come back — the data went back to the value that causes it');
  assert.equal(back.severity, 'blocker');
  assert.equal(back.resolution, null, 'the returning BLOCKER renders "Marked dismissed" — R2-7\'s symptom');
});

test('A-5: it holds at every depth — redo, undo, redo, undo', async () => {
  const { store, conflictId } = await dismissedThenRetired();
  store.undo();
  for (let i = 0; i < 2; i++) {
    store.redo();
    assert.equal(rowFor(store.getState(), conflictId)!.retiredAt, TODAY, `retiredAt lost on redo #${i + 1}`);
    store.undo();
    assert.equal(rowFor(store.getState(), conflictId)!.retiredAt, TODAY, `retiredAt lost on undo #${i + 2}`);
    assert.equal(
      store.getDerived()!.conflicts.find((c) => c.id === conflictId)?.resolution ?? null,
      null,
      `a stale "dismissed" reattached at depth ${i + 2}`,
    );
  }
});

test('A-5: the subscriber is called ONCE for the undo, and never with the stale document', async () => {
  const { store, conflictId } = await dismissedThenRetired();
  const seen: (string | null)[] = [];
  const off = store.subscribe((s) => {
    seen.push(rowFor(s, conflictId)?.retiredAt ?? null);
  });
  store.undo();
  off();
  assert.equal(seen.length, 1, `the undo emitted ${seen.length} times; a stale frame is the defect`);
  assert.deepEqual(seen, [TODAY], 'a subscriber saw the un-retired document, if only for a frame');
});

test('A-5: undo restores the document byte-identically apart from the one carve-out', async () => {
  // ROADMAP F's carve-out, written as a ceiling: the only rows that may differ are rows the
  // ledger has a key for, the value written equals the ledger's value exactly, and `revision`
  // is bumped when that happens. Nothing else — not `state`, not `by`, not `at`, not `note`.
  const { store, conflictId } = await dismissedThenRetired();
  const snapshot = store.getState().history.past[store.getState().history.past.length - 1];
  store.undo();
  const restored = store.getState().doc!;

  const strip = (t: core.Trip) => ({
    ...t,
    revision: 0,
    resolutions: t.resolutions.map((r) => ({ ...r, retiredAt: null })),
  });
  assert.deepEqual(strip(restored), strip(snapshot), 'undo changed a field outside the carve-out');
  for (let i = 0; i < restored.resolutions.length; i++) {
    const before = snapshot.resolutions[i];
    const after = restored.resolutions[i];
    if (before.retiredAt !== after.retiredAt) {
      assert.equal(before.retiredAt, null, 'a retiredAt went from a date back to null');
      assert.equal(after.conflictId, conflictId, 'a row the ledger has no key for was stamped');
      assert.equal(after.retiredAt, TODAY);
    }
  }
});

// ---------------------------------------------------------------------------
// The ledger is not persisted, not exported, and not in `history`.
// ---------------------------------------------------------------------------

test('A-5: `retired` reaches neither the document, nor storage, nor history', async () => {
  const p = ports();
  const { store } = await dismissedThenRetired(p);
  store.undo();
  await store.flush();

  assert.ok('retired' in store.getState(), 'AppState must carry the ledger');
  assert.equal(core.toJSON(store.getState().doc!).includes('"retired"'), false, 'the ledger reached the document');
  for (const [, doc] of p.storage.docs) {
    assert.equal(String(doc).includes('"retired"'), false, 'the ledger reached the StoragePort');
  }
  for (const snap of [...store.getState().history.past, ...store.getState().history.future]) {
    assert.equal('retired' in (snap as unknown as Record<string, unknown>), false, 'the ledger reached history');
  }
});

// ---------------------------------------------------------------------------
// Per trip, and reseeded by the seven document-installing paths.
// ---------------------------------------------------------------------------

test('A-5: the ledger is per trip and does not cross a trip switch', async () => {
  const p = ports();
  const { store, conflictId } = await dismissedThenRetired(p);
  const firstId = store.getState().doc!.id;
  await store.flush();

  await store.createTrip({ ...TRIP_INIT, title: 'Second trip' });
  const second = store.getState();
  assert.ok(second.retired, 'the new document reseeds the ledger rather than inheriting one');
  assert.equal(second.retired.tripId, second.doc!.id);
  assert.equal(second.retired.marks.size, 0, 'a fresh trip has retired nothing');
  await store.flush();

  // Back to the first trip: the ledger is rebuilt from the stored document's own retiredAt.
  await store.openTrip(firstId);
  const reopened = store.getState();
  assert.equal(reopened.retired!.tripId, firstId);
  assert.equal(reopened.retired!.marks.get(conflictId), TODAY, 'the ledger is reconstructed on load, from the doc');
});

test('A-5: `reseed: true` — the six document-installing transitions all pass it', () => {
  // The same mechanical ceiling §4.2 rule 6a's closed list already gets. An eighth path that
  // installs a document without reseeding is a defect, and this is how it is caught.
  const src = readFileSync(new URL('../src/store/store.ts', import.meta.url), 'utf8');
  const bounds = [...src.matchAll(/^ {4}(?:async )?(\w+)\(/gm)];
  const bodies = new Map<string, string>();
  for (let i = 0; i < bounds.length; i++) {
    const start = bounds[i].index as number;
    const end = i + 1 < bounds.length ? (bounds[i + 1].index as number) : src.length;
    bodies.set(bounds[i][1], src.slice(start, end));
  }
  const switchers = [...bodies.entries()]
    .filter(([, body]) => /activeTripId:/.test(body) || /\.\.\.initialState\(\)/.test(body))
    .map(([name]) => name)
    .sort();
  assert.deepEqual(switchers, ['adoptTrip', 'closeTrip', 'createTrip', 'deleteTrip', 'importDoc', 'openTrip']);
  for (const name of switchers) {
    assert.match(bodies.get(name) as string, /reseed:\s*true/, `${name} installs a document without reseeding the ledger`);
  }
  // The seventh path is `doMerge`'s result, installed through `writeAndSettle`: a merged
  // document is one storage and this tab have just JOINTLY AGREED on, at the user's explicit
  // request, and the ledger's job is to defend against this store's own undo stack — not to
  // outvote a merge.
  const doMerge = src.slice(src.indexOf('async function doMerge'), src.indexOf('  return {\n'));
  assert.ok(doMerge.length > 100, 'the doMerge scan found nothing — did the shape change?');
  assert.match(doMerge, /reseed:\s*true/, 'doMerge\'s result must reseed');

  // Seven paths, and exactly seven. An eighth `reseed: true` is a path that opted out of the
  // ledger without saying so.
  assert.equal((src.match(/reseed:\s*true/g) ?? []).length, 7,
    '§2.7 A-5 names exactly seven reseeding paths — six transitions plus doMerge\'s result');
});

test('A-5: a document arriving from outside is the authority — reseed, do not re-assert', async () => {
  // `importDoc` installs a document whose resolution is LIVE. Even though this session's
  // ledger holds a mark for that conflict id, the arriving document wins: reseed, no
  // re-assertion. The ledger's job is to defend against this store's own undo stack.
  const p = ports();
  const { store, conflictId } = await dismissedThenRetired(p);
  await store.flush();
  assert.equal(store.getState().retired!.marks.get(conflictId), TODAY);

  const live = {
    ...store.getState().doc!,
    id: 'trip-imported',
    resolutions: store.getState().doc!.resolutions.map((r) => ({ ...r, retiredAt: null })),
  };
  await store.importDoc(core.toJSON(live));
  const state = store.getState();
  assert.equal(state.doc!.id, 'trip-imported');
  assert.equal(state.retired!.tripId, 'trip-imported');
  assert.equal(state.retired!.marks.size, 0, 'the ledger carried a mark across a document swap');
  assert.equal(state.doc!.resolutions[0].retiredAt, null, 'the arriving document was overwritten by a stale ledger');
});

// ---------------------------------------------------------------------------
// Release — a fresh answer is not stillborn.
// ---------------------------------------------------------------------------

test('A-5: unresolveConflict then resolveConflict is NOT re-stamped retired', async () => {
  const { store, conflictId } = await dismissedThenRetired();
  store.undo(); // the conflict is live again, the row is retired
  assert.equal(rowFor(store.getState(), conflictId)!.retiredAt, TODAY);

  store.dispatch({ type: 'unresolveConflict', conflictId });
  store.dispatch({
    type: 'resolveConflict',
    resolution: { conflictId, state: 'dismissed', by: 'local:self', at: '2026-08-02' },
  });

  const fresh = store.getState().doc!.resolutions.filter((r) => r.conflictId === conflictId);
  assert.equal(fresh.length, 1, 'expected exactly one row for this conflict after the re-answer');
  assert.equal(fresh[0].retiredAt, null, 'a ledger that re-stamps a fresh answer implements "never resolve again"');

  // …and it stays null across the next three `set()`s.
  store.setUi({ panel: 'conflicts' });
  store.setUi({ panel: 'timeline' });
  store.getDerived();
  const after = store.getState().doc!.resolutions.filter((r) => r.conflictId === conflictId);
  assert.equal(after.length, 1);
  assert.equal(after[0].retiredAt, null, 'the fresh answer was retired by a later set()');
  assert.equal(
    store.getDerived()!.conflicts.find((c) => c.id === conflictId)?.resolution?.state,
    'dismissed',
    'the user dismissed it again and it must render dismissed',
  );
});

test('A-5: unresolveConflict alone releases the key, so the row cannot be resurrected', async () => {
  const { store, conflictId } = await dismissedThenRetired();
  store.undo();
  store.dispatch({ type: 'unresolveConflict', conflictId });
  assert.equal(store.getState().retired!.marks.has(conflictId), false, 'unresolveConflict must release the key');
  assert.deepEqual(
    store.getState().doc!.resolutions.filter((r) => r.conflictId === conflictId),
    [],
    'unresolveConflict drops every row for the id, and nothing may put one back',
  );
});

test('A-5: an unrelated edit does not release anybody else\'s key', async () => {
  const { store, conflictId, dayId } = await dismissedThenRetired();
  store.dispatch({ type: 'setDayMeta', dayId, patch: { subtitle: 'a change that touches nothing' } });
  assert.equal(store.getState().retired!.marks.get(conflictId), TODAY, 'an ordinary edit released the ledger key');
  store.undo();
  assert.equal(rowFor(store.getState(), conflictId)!.retiredAt, TODAY);
});

// ---------------------------------------------------------------------------
// A-5a (KD-36) — the ledger veto: a conflictId may not be ACQUIRED from a document that
// still holds a live row for it, at either reseed or absorb. Three required cases.
// ---------------------------------------------------------------------------

/**
 * The exact KD-36 setup: a conflict retired once, brought back live (`undo`), then dismissed
 * again with a PLAIN `resolveConflict` — no `unresolveConflict` first. `core.resolveConflict`
 * keeps the surviving retired row and appends a fresh live one beside it, which is the
 * `[retired, live]` pair A-5 as first written could not tell from "never answered again".
 */
async function secondDismissal(p = ports()) {
  const { store, conflictId, dayId } = await dismissedThenRetired(p);
  store.undo(); // conflict live again; the old row re-asserted retired
  assert.equal(rowFor(store.getState(), conflictId)!.retiredAt, TODAY);
  store.dispatch({
    type: 'resolveConflict',
    resolution: { conflictId, state: 'dismissed', by: 'local:self', at: '2026-08-02' },
  });
  const rows = store.getState().doc!.resolutions.filter((r) => r.conflictId === conflictId);
  assert.equal(rows.length, 2, 'the retired row stays and the fresh dismissal appends beside it');
  return { store, conflictId, dayId, rows };
}

const freshRow = (state: AppState, conflictId: string) =>
  state.doc!.resolutions.find((r) => r.conflictId === conflictId && r.at === '2026-08-02')!;

test('A-5a (KD-36): a second dismissal is not stillborn, and survives a further edit', async () => {
  const { store, conflictId, dayId } = await secondDismissal();
  assert.equal(freshRow(store.getState(), conflictId).retiredAt, null, 'the fresh dismissal must not be stillborn');

  // A further, unrelated edit runs `set()` again (absorb) — the fresh answer must still hold.
  // `title`, not `subtitle` — `legacy_flag`'s conflict id is content-addressed over
  // `{date, subtitle}` (rules/legacyFlag.ts), so `subtitle` is not an unrelated field here.
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'an unrelated edit' } });
  assert.equal(
    freshRow(store.getState(), conflictId).retiredAt,
    null,
    'A-5a: absorb must not re-acquire an id that has a live row in the same document',
  );
  assert.equal(
    store.getDerived()!.conflicts.find((c) => c.id === conflictId)?.resolution?.state,
    'dismissed',
    'must render dismissed, not silently retired',
  );
});

test('A-5a (KD-36): the same case survives a storage round-trip — the case bare option 1 misses', async () => {
  const p = ports();
  const { store, conflictId, dayId } = await secondDismissal(p);
  const tripId = store.getState().doc!.id;

  await store.flush();
  await store.closeTrip();
  await store.openTrip(tripId); // step 2/3 — reseed, not absorb

  assert.equal(
    freshRow(store.getState(), conflictId).retiredAt,
    null,
    'reseed must not acquire the id from the still-present retired row — this is what a veto placed only in absorb would miss',
  );

  // ...and it holds across the next ordinary edit too (absorb, on top of the reseeded ledger).
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'after reopen' } });
  assert.equal(freshRow(store.getState(), conflictId).retiredAt, null);
});

test('A-5a: R8-1 remains fixed with the veto in place', async () => {
  const { store, conflictId } = await dismissedThenRetired();
  store.undo();
  assert.equal(
    rowFor(store.getState(), conflictId)!.retiredAt,
    TODAY,
    'undo must still not un-retire, with the A-5a veto added',
  );
  assert.equal(
    store.getDerived()!.conflicts.find((c) => c.id === conflictId)?.resolution,
    null,
    'the returning blocker must still not render "Marked dismissed"',
  );
});

// ---------------------------------------------------------------------------
// A-5b (revision 7 addendum, QA R9-1) — `redo` releases the ledger too. `undo` does not, and
// must not: releasing on undo would delete A-5's whole purpose.
// ---------------------------------------------------------------------------

test('A-5b (R9-1): QA\'s six actions — dismiss, retire, undo, dismiss again, undo, redo — is not stillborn', async () => {
  // secondDismissal() performs exactly: dismiss -> retire -> undo -> dismiss again.
  const { store, conflictId } = await secondDismissal();
  assert.equal(freshRow(store.getState(), conflictId).retiredAt, null);

  store.undo(); // undoes the second dismissal
  store.redo(); // QA's step 6 — redo it. Without A-5b this stamps the redone row retired.

  assert.equal(
    freshRow(store.getState(), conflictId).retiredAt,
    null,
    'A-5b: a redone dismissal must not be stillborn — R9-1',
  );
  assert.equal(
    store.getDerived()!.conflicts.find((c) => c.id === conflictId)?.resolution?.state,
    'dismissed',
    'must render dismissed after redo',
  );

  // ...and it holds across three further set()s, exactly as a first dismissal must (existing
  // A-5 coverage above) — the redo path owes the same guarantee.
  store.setUi({ panel: 'conflicts' });
  store.setUi({ panel: 'timeline' });
  store.getDerived();
  assert.equal(
    freshRow(store.getState(), conflictId).retiredAt,
    null,
    'the redone dismissal was retired by a later set()',
  );
});

test('A-5b: the invariant holds at every step of the six-action sequence', async () => {
  // "For every id in `state.retired.marks`, `state.doc` holds no row for that id with
  // `retiredAt === null`." — checkable after every store operation; violated by both R9-1
  // (before this fix) and, before A-5a, by KD-36.
  const invariantHolds = (s: ReturnType<Store['getState']>) => {
    const marks = s.retired?.marks;
    if (!marks || !s.doc) return true;
    for (const id of marks.keys()) {
      if (s.doc.resolutions.some((r) => r.conflictId === id && r.retiredAt === null)) return false;
    }
    return true;
  };
  const { store } = await secondDismissal();
  assert.ok(invariantHolds(store.getState()), 'after dismiss -> retire -> undo -> dismiss again');
  store.undo();
  assert.ok(invariantHolds(store.getState()), 'after the second undo');
  store.redo();
  assert.ok(invariantHolds(store.getState()), 'after redo — this is the one R9-1 broke');
});

test('A-5b: `undo` still releases nothing — redoing an UNRELATED action does not disturb a held mark', async () => {
  const { store, conflictId } = await dismissedThenRetired();
  store.undo();
  store.redo();
  store.undo();
  assert.equal(
    rowFor(store.getState(), conflictId)!.retiredAt,
    TODAY,
    'redo/undo at this depth must still stamp — this is the ceiling A-5b names: a redo step ' +
      'that does not raise the row count releases nothing',
  );
});
