/**
 * Participants through the real store — ROADMAP Phase 2 **I-9**, ARCHITECTURE **§8.3**, §4.2 rule 1.
 *
 * Two claims, and neither of them is about a screen (I-9 ships no UI):
 *
 *  1. **Every new action maps 1:1 onto a core build function and the reducer holds no domain
 *     logic.** `store.test.ts` already asserts that for every entry in `ACTION_SPECS`; what is
 *     added here is that the three participant actions *are* entries, that each names a distinct
 *     core function, and that dispatching one changes the document by exactly what that core
 *     function does — nothing marshalled in the client decides anything.
 *  2. **Undo/redo restores participants exactly at depth 50.** This is the claim §8.3's
 *     *"embedded in the document, not a second persisted structure"* is supposed to make free,
 *     so it is worth measuring rather than assuming: history is a `Trip` snapshot, and a
 *     participant list that is part of the document rides it with no new machinery.
 *
 * Plain Node, in-memory ports, no DOM.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createStore, ACTION_SPECS, HISTORY_LIMIT,
  memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler,
  core,
} from '../src/index.ts';
import type { Ports } from '../src/ports/types.ts';

const TODAY = '2026-08-01';

function ports(storage = memoryStorage()): Ports & { storage: ReturnType<typeof memoryStorage> } {
  return {
    storage,
    file: memoryFile(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(),
    scheduler: immediateScheduler(),
  } as Ports & { storage: ReturnType<typeof memoryStorage> };
}

const TRIP_INIT = {
  title: 'Participant trip',
  startDate: '2026-08-07',
  endDate: '2026-08-10',
  cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
};

async function storeWithTrip(p = ports()) {
  const store = createStore({ ports: p });
  await store.createTrip(TRIP_INIT);
  return store;
}

test('I-9: the three participant actions each name a distinct core build function', () => {
  const names = ['addParticipant', 'updateParticipant', 'removeParticipant'] as const;
  const seen = new Set<string>();
  for (const type of names) {
    const spec = ACTION_SPECS[type];
    assert.ok(spec, `no ACTION_SPEC for ${type}`);
    assert.equal(spec.coreFn, type, 'an action was routed to a core function with another name');
    assert.equal(typeof (core as unknown as Record<string, unknown>)[spec.coreFn], 'function');
    seen.add(spec.coreFn);
  }
  assert.equal(seen.size, 3, 'two participant actions share one core build function');
});

test('I-9: dispatching addParticipant produces exactly what core.addParticipant produces', async () => {
  const store = await storeWithTrip();
  const before = store.getState().doc!;
  store.dispatch({ type: 'addParticipant', participant: { displayName: 'Zoë' } });
  const after = store.getState().doc!;
  assert.equal(after.participants.length, 1);
  assert.equal(after.participants[0].displayName, 'Zoë');
  assert.equal(after.participants[0].kind, 'contact');
  assert.equal(after.participants[0].userId, null);
  assert.equal(after.revision, before.revision + 1, 'the reducer bumped revision a second time');
});

test('I-9: updateParticipant and removeParticipant go through the same door', async () => {
  const store = await storeWithTrip();
  store.dispatch({ type: 'addParticipant', participant: { displayName: 'Zoë' } });
  const id = store.getState().doc!.participants[0].id;
  store.dispatch({ type: 'updateParticipant', participantId: id, patch: { displayName: 'Zoë M.', note: 'her mother' } });
  assert.equal(store.getState().doc!.participants[0].displayName, 'Zoë M.');
  assert.equal(store.getState().doc!.participants[0].note, 'her mother');
  store.dispatch({ type: 'removeParticipant', participantId: id });
  assert.deepEqual(store.getState().doc!.participants, []);
});

/**
 * The criterion ROADMAP I-9 names by depth. The stack is filled with edits that do **not** touch
 * `participants`, so the snapshot at the far end is one that had better still carry the list —
 * `datePrecision`'s test at I-2, one record class over, and for the same reason.
 */
test('I-9: participants carry through undo/redo at depth 50', async () => {
  const store = await storeWithTrip();
  store.dispatch({ type: 'addParticipant', participant: { displayName: 'Jacob', kind: 'self' } });
  store.dispatch({ type: 'addParticipant', participant: { displayName: 'Zoë' } });
  const expected = store.getState().doc!.participants;
  assert.equal(expected.length, 2);

  for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
    store.dispatch({ type: 'setTripMeta', patch: { title: `edit ${i}` } });
  }
  assert.equal(store.getState().history.past.length, HISTORY_LIMIT, 'history did not reach its limit');
  assert.deepEqual(store.getState().doc!.participants, expected, 'the list was lost while editing other fields');

  for (let i = 0; i < HISTORY_LIMIT; i++) store.undo();
  assert.equal(store.getState().history.past.length, 0);
  assert.deepEqual(store.getState().doc!.participants, expected, 'undo to the bottom of the stack lost participants');

  for (let i = 0; i < HISTORY_LIMIT; i++) store.redo();
  assert.deepEqual(store.getState().doc!.participants, expected, 'redo to the top of the stack lost participants');
  assert.equal(store.getState().doc!.title, `edit ${HISTORY_LIMIT + 9}`);
});

test('I-9: undo of a removeParticipant restores the row exactly', async () => {
  const store = await storeWithTrip();
  store.dispatch({ type: 'addParticipant', participant: { displayName: 'Zoë', note: 'her mother' } });
  const before = store.getState().doc!.participants;
  store.dispatch({ type: 'removeParticipant', participantId: before[0].id });
  assert.deepEqual(store.getState().doc!.participants, []);
  store.undo();
  assert.deepEqual(store.getState().doc!.participants, before);
});

test('I-9: participants survive a save and reopen through the storage port', async () => {
  const p = ports();
  const store = createStore({ ports: p });
  await store.createTrip(TRIP_INIT);
  const tripId = store.getState().doc!.id;
  store.dispatch({ type: 'addParticipant', participant: { displayName: 'Zoë', note: 'her mother' } });
  const expected = store.getState().doc!.participants;
  await store.flush();

  const reopened = createStore({ ports: p });
  await reopened.openTrip(tripId);
  assert.deepEqual(reopened.getState().doc!.participants, expected);
});
