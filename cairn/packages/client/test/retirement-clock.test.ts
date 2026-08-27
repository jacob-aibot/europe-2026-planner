/**
 * A-9 assertion 2 — QA `p2b-gate.mjs` §1.11, through the real store (ARCHITECTURE §2.7 A-9,
 * revision 11, QA P2-1). ROADMAP I-3a.
 *
 * The core-level assertions live in `packages/core/test/retirementGate.test.ts`. This file is
 * the one that has to run through `getDerived()`, because §1.11's measurement was taken there:
 * a second store opens the stored document a fortnight later, calls `getDerived()` **once**,
 * and the shipped code retired the user's dismissal, bumped `revision` 7 → 8 and left
 * `isDirty()` true — from looking at a trip.
 *
 * Plain Node, in-memory ports.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createStore, core,
  memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler,
} from '../src/index.ts';
import type { Ports } from '../src/ports/types.ts';

function portsAt(today: string, storage = memoryStorage()) {
  return {
    storage,
    file: memoryFile(),
    clock: fixedClockPort(today),
    ids: sequentialIdPort(),
    scheduler: immediateScheduler(),
  } as Ports;
}

/** `dirty.test.ts`'s rule: no assertion on `isDirty()` without the stored bytes beside it. */
function storedBytes(storage: ReturnType<typeof memoryStorage>, id: string): string {
  return storage.docs.get(id) ?? '';
}

/** §1.11's setup: a five-day Tokyo trip with an uncovered night, dismissed while future. */
function dismissedLodging() {
  const c: core.BuildCtx = { ids: core.sequentialIds('rs'), now: '2026-08-24', actorUserId: core.LOCAL_OWNER };
  let t = core.createTrip(
    {
      title: 'RS',
      startDate: '2026-08-25',
      endDate: '2026-08-29',
      cities: [{ key: 'tokyo', name: 'Tokyo', order: 0, centre: { lat: 35.68, lng: 139.77 } }],
    },
    c,
  );
  for (const d of t.days) t = core.setDayMeta(t, d.id, { primaryCity: 'tokyo', cities: ['tokyo'] });
  const target = core.detectConflicts(t, { today: '2026-08-24' }).find((x) => x.ruleId === 'missing_lodging')!;
  assert.ok(target, 'there is a missing_lodging to dismiss');
  t = core.resolveConflict(t, {
    conflictId: target.id, state: 'dismissed', by: core.LOCAL_OWNER, at: '2026-08-24',
  });
  return { doc: t, target };
}

test('A-9 (2) / QA §1.11: reopening a finished trip a fortnight later retires nothing', async () => {
  const { doc } = dismissedLodging();
  const storage = memoryStorage();

  const during = createStore({ ports: portsAt('2026-08-24', storage), autosave: false });
  await during.adoptTrip(doc);
  during.getDerived();
  await during.flush();
  const atRest = storedBytes(storage, doc.id);
  const midRev = JSON.parse(atRest).revision;

  // The user comes back a fortnight later. Same document, later clock, no user action.
  const later = createStore({ ports: portsAt('2026-09-10', storage), autosave: false });
  await later.openTrip(doc.id);
  const derived = later.getDerived()!;
  const row = later.getState().doc!.resolutions[0];

  assert.equal(
    derived.conflicts.some((c) => c.ruleId === 'missing_lodging'), false,
    'the gate still does its job — the finished trip does not nag',
  );
  assert.equal(row.retiredAt, null, 'reopening the finished trip leaves the dismissal live');
  assert.equal(later.getState().doc!.revision, midRev, 'the revision does not move');
  assert.equal(later.isDirty(), false, 'no write is scheduled by merely looking at it');
  assert.equal(storedBytes(storage, doc.id), atRest, '...and the stored bytes are the bytes we left');
});

test('A-9 (2): the store still retires when the DATA stops producing the conflict', async () => {
  const { doc, target } = dismissedLodging();
  const storage = memoryStorage();
  const store = createStore({ ports: portsAt('2026-09-10', storage), autosave: false });
  await store.adoptTrip(doc);
  store.getDerived();
  assert.equal(store.getState().doc!.resolutions[0].retiredAt, null);

  // Book the room. `missing_lodging` stops producing the finding at any clock.
  store.dispatch({
    type: 'upsertBooking',
    booking: {
      id: 'b-tokyo', tripId: doc.id, kind: 'lodging', operator: 'Hotel Tokyo', reference: null,
      startsAt: { date: '2026-08-25', time: null }, endsAt: { date: '2026-08-29', time: null },
      price: null, party: null, status: 'active', ticket: null,
      provenance: {
        source: 'user', state: 'accepted', confidence: 'confirmed',
        addedAt: '2026-08-24', acceptedAt: '2026-08-24', actorUserId: null,
      },
    },
  });
  store.getDerived();
  assert.equal(
    store.getState().doc!.resolutions.find((r) => r.conflictId === target.id)?.retiredAt, '2026-09-10',
    'a real fix still retires — A-9 changes WHEN retirement fires, not what it means',
  );
});

/**
 * A-11 assertion 1, store level — QA `r13-gate-citykey.mjs` §1.3 (ARCHITECTURE §2.7 **A-11**,
 * revision 12, QA R13-1).
 *
 * `apps/web`'s `systemClock()` returns the device's **local civil date**, and both phone
 * platforms move the device's time zone by themselves while the user travels. Flying west —
 * Budapest UTC+2 → London UTC+1 → LA UTC−7, this app's own reference itinerary — steps that date
 * **back** by one for any local moment before 09:00. A user correcting a wrong clock does the
 * same with no travel at all.
 *
 * `unbooked_ticketed`'s 60-day horizon used to be applied inside `rule.run`, where
 * `detectUngated` could not disable it, so one step back across the boundary took the finding
 * out of the set retirement reads and `syncResolutions` retired the dismissal — a write to
 * storage after one `getDerived()` with no keystroke.
 */
function movableClockPort(start: string) {
  let d = start;
  return { port: { today: () => d } as Ports['clock'], set: (x: string) => { d = x; } };
}

/** QA §1.1's document, built through the client's own re-export of core. */
function dismissedTicket() {
  const c: core.BuildCtx = { ids: core.sequentialIds('hz'), now: '2026-01-01', actorUserId: core.LOCAL_OWNER };
  const dayDate = '2026-03-02';
  let t = core.createTrip(
    {
      title: 'Horizon',
      startDate: dayDate,
      endDate: dayDate,
      cities: [{ name: 'Tokyo', order: 0, centre: { lat: 35.68, lng: 139.77 } }],
    },
    c,
  );
  const key = t.cities[0].key;
  for (const d of t.days) t = core.setDayMeta(t, d.id, { primaryCity: key, cities: [key] });
  t = core.addStop(
    t,
    { kind: 'scheduled', dayId: dayDate, time: '10:00', order: 0 },
    {
      name: 'Ghibli Museum',
      category: 'sight',
      place: { kind: 'inline', at: { lat: 35.696, lng: 139.57 } },
      cost: { display: '€10', amounts: [{ lo: 10, hi: 10, currency: 'EUR', basis: 'per_person' }] },
      links: [{ label: 'Tickets', href: 'https://example.test/t' }],
    },
    c,
  );
  // `delta = 60` exactly: the boundary is one step of a device clock away.
  const target = core.detectConflicts(t, { today: '2026-01-01' }).find((x) => x.ruleId === 'unbooked_ticketed')!;
  assert.ok(target, 'the document must produce an unbooked_ticketed to dismiss');
  return {
    doc: core.resolveConflict(t, {
      conflictId: target.id, state: 'dismissed', by: core.LOCAL_OWNER, at: '2026-01-01',
    }),
    target,
  };
}

test('A-11 (1, store) / QA §1.3: a westward clock step does not dirty storage', async () => {
  const { doc, target } = dismissedTicket();
  const storage = memoryStorage();
  const clock = movableClockPort('2026-01-01');

  const store = createStore({
    ports: { ...portsAt('2026-01-01', storage), clock: clock.port },
    autosave: false,
  });
  await store.adoptTrip(doc);
  store.getDerived();
  await store.flush();
  const atRest = storedBytes(storage, doc.id);
  const midRev = JSON.parse(atRest).revision;
  assert.equal(JSON.parse(atRest).resolutions[0].retiredAt, null, 'stored with the dismissal live');

  // The plane lands. The device date steps back one day, `delta` becomes 61, and the panel
  // re-renders. That is the whole user action.
  clock.set('2025-12-31');
  store.getDerived();
  await store.flush();

  assert.equal(
    store.getState().doc!.resolutions.find((r) => r.conflictId === target.id)!.retiredAt, null,
    'the stepped-back clock left the dismissal live',
  );
  assert.equal(store.getState().doc!.revision, midRev, 'the revision does not move');
  assert.equal(store.isDirty(), false, 'no write is scheduled by a clock the user did not set');
  assert.equal(storedBytes(storage, doc.id), atRest, '...and the stored bytes are the bytes we left');

  // The clock is corrected. The finding must render DISMISSED, not accused.
  clock.set('2026-01-01');
  const derived = store.getDerived()!;
  const again = derived.conflicts.find((c) => c.id === target.id)!;
  assert.ok(again, 'the finding is on screen again at the corrected clock');
  assert.ok(again.resolution, 'it carries the user\'s own live resolution');
  assert.doesNotMatch(String(again.detail ?? ''), /come back/, 'and does not accuse the user');
});

test('A-9 (3, store): the explicit syncResolutions() method still runs on a cache hit', async () => {
  const { doc, target } = dismissedLodging();
  const storage = memoryStorage();
  const store = createStore({ ports: portsAt('2026-09-10', storage), autosave: false });
  await store.adoptTrip(doc);
  store.getDerived();
  await store.flush();
  const atRest = storedBytes(storage, doc.id);
  // Warm cache, nothing changed: the render path skips retirement, the explicit call does not.
  assert.equal(store.syncResolutions(), store.getState());
  assert.equal(store.getState().doc!.resolutions.find((r) => r.conflictId === target.id)?.retiredAt, null);
  assert.equal(store.isDirty(), false);
  assert.equal(storedBytes(storage, doc.id), atRest, 'and the stored bytes did not move either');
});
