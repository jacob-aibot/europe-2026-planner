/**
 * A-9 — retirement is decided against the **un-gated** set (ARCHITECTURE §2.7 A-9,
 * revision 11, QA P2-1). ROADMAP I-3a.
 *
 * *Retirement is a claim about the document. The gate is a claim about the user's attention.
 * They may not read the same set.* §8.2's feasibility gate gave a conflict a second way to
 * leave `detectConflicts`' returned set, and `syncResolutions` — written when there was only
 * one way — read *"not in the set"* as *"the user fixed it"*. So merely **opening** a trip
 * after it ended retired every dismissal of every feasibility finding on it, bumped
 * `revision`, and left the store dirty, with no user action of any kind.
 *
 * The six assertions A-9 names, in order; assertion 2 is store-level and lives in
 * `packages/client/test/retirement-clock.test.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import {
  createTrip, detectConflicts, resolveConflict, sequentialIds, setDayMeta, setTripMeta,
  syncResolutions, upsertBooking, LOCAL_OWNER,
} from '../src/index.ts';
import { detectUngated } from '../src/conflict/detect.ts';
import { europe2026, FIXTURE_TODAY } from './fixture.ts';
import type { BuildCtx } from '../src/index.ts';

const ctx = (): BuildCtx => ({ ids: sequentialIds('rl'), now: '2026-01-01', actorUserId: LOCAL_OWNER });

/** QA §1.10's exact setup: a five-day trip whose only city has no lodging booked. */
function dismissedLodging() {
  const c = ctx();
  let t = createTrip(
    {
      title: 'R',
      startDate: '2026-08-25',
      endDate: '2026-08-29',
      cities: [{ key: 'tokyo', name: 'Tokyo', order: 0, centre: { lat: 35.68, lng: 139.77 } }],
    },
    c,
  );
  for (const d of t.days) t = setDayMeta(t, d.id, { primaryCity: 'tokyo', cities: ['tokyo'] });
  const before = detectConflicts(t, { today: '2026-08-24' });
  const target = before.find((x) => x.ruleId === 'missing_lodging')!;
  assert.ok(target, 'there is a missing_lodging to dismiss');
  t = resolveConflict(t, { conflictId: target.id, state: 'dismissed', by: LOCAL_OWNER, at: '2026-08-24' });
  assert.equal(t.resolutions.length, 1);
  assert.equal(t.resolutions[0].retiredAt, null);
  return { trip: t, target, c };
}

test('A-9 (1): the clock alone does not retire a dismissal — QA p2b-gate §1.10', () => {
  const { trip } = dismissedLodging();

  // Day 1 of the trip. Only the clock moved.
  const t1 = syncResolutions(trip, '2026-08-25');
  assert.equal(t1.resolutions[0].retiredAt, null, 'on day 1 the dismissal is untouched');

  // The trip ends. Still nothing the user did.
  const t2 = syncResolutions(t1, '2026-08-30');
  assert.equal(
    t2.resolutions[0].retiredAt, null,
    'merely opening the completed trip must not RETIRE the user\'s dismissal',
  );
  assert.equal(t2, t1, 'and it returns the SAME trip reference — no write is scheduled');
  assert.equal(t2.revision, t1.revision, '...so the revision does not move with no user action');
});

test('A-9 (3): the point of §2.7 is not lost — a genuine fix on a finished trip still retires', () => {
  const { trip, target } = dismissedLodging();
  // The user books the lodging, so `missing_lodging` stops producing the finding at all.
  let t = upsertBooking(trip, {
    id: 'b-tokyo', tripId: trip.id, kind: 'lodging', operator: 'Hotel Tokyo', reference: null,
    startsAt: { date: '2026-08-25', time: null }, endsAt: { date: '2026-08-29', time: null },
    price: null, party: null, status: 'active', ticket: null,
    provenance: {
      source: 'user', state: 'accepted', confidence: 'confirmed',
      addedAt: '2026-08-24', acceptedAt: '2026-08-24', actorUserId: null,
    },
  });
  assert.equal(
    detectUngated(t, { today: '2026-08-30' }).some((x) => x.id === target.id), false,
    'the fixture must actually remove the finding, or this test asserts nothing',
  );
  t = syncResolutions(t, '2026-08-30');
  assert.equal(t.resolutions[0].retiredAt, '2026-08-30', 'a real fix retires, at any clock');
});

/**
 * A-9 (4), the re-arming case end to end.
 *
 * One departure from A-9's literal wording, and it is a property of `missing_lodging` rather
 * than of the ruling: extending `endDate` alone cannot un-gate this particular finding at a
 * post-`endDate` clock, because the rule's subjects are its **own** day ids and the gate asks
 * whether those days are past. So the trip is extended (the user corrects the range) and then
 * viewed at a clock inside it — which is exactly when the panel next shows the finding, and
 * the moment the old code's damage became visible. The control below proves the assertion is
 * not vacuous.
 */
test('A-9 (4): the extended trip renders the finding DISMISSED, not "it has come back"', () => {
  const { trip, target, c } = dismissedLodging();
  const t2 = syncResolutions(syncResolutions(trip, '2026-08-25'), '2026-08-30');
  const t3 = setTripMeta(t2, { endDate: '2026-09-30' }, c);
  const again = detectConflicts(t3, { today: '2026-08-26' }).find((x) => x.id === target.id);
  assert.ok(again, 'the same conflict id must be visible again once the trip is live');
  assert.ok(again.resolution, 'it renders DISMISSED — the user\'s answer is still live');
  assert.equal(again.resolution.state, 'dismissed');
  assert.doesNotMatch(
    String(again.detail ?? ''), /come back/,
    'it must not accuse the user of a dismissal the CLOCK undid',
  );

  // Control: the document the PRE-A-9 code produced — the row retired by the clock alone.
  const asBefore = {
    ...t3,
    resolutions: t3.resolutions.map((r) => ({ ...r, retiredAt: '2026-08-30' })),
  };
  const accused = detectConflicts(asBefore, { today: '2026-08-26' }).find((x) => x.id === target.id)!;
  assert.equal(accused.resolution, null, 'control: the dismissal no longer suppresses anything');
  assert.match(String(accused.detail ?? ''), /come back/, 'control: this is the sentence A-9 removes');
});

test('A-9 (5): `unbooked_ticketed` is gated by §8.2, not by a guard of its own', () => {
  const { trip } = europe2026();
  // The rule's two subjects are the stop and its own day, both resolving to that day's date,
  // so `delta < 0` and §8.2's "every subject is strictly before today" are one predicate.
  // Stated form of the byte-identity claim: at any clock, no `unbooked_ticketed` finding
  // survives for a day strictly in the past.
  for (const today of [FIXTURE_TODAY, '2026-08-14', '2026-08-30']) {
    const found = detectConflicts(trip, { today }).filter((c) => c.ruleId === 'unbooked_ticketed');
    for (const c of found) {
      const date = c.params.date as string;
      assert.ok(date >= today, `${c.id}: a past day survived the gate at ${today}`);
    }
  }
  // ...and the un-gated set is where the past ones went — it is what retirement reads.
  const ungated = detectUngated(trip, { today: '2026-08-30' }).filter((c) => c.ruleId === 'unbooked_ticketed');
  assert.ok(ungated.length > 0, 'the whole trip is past at this clock; un-gated must still see the rule fire');
  assert.equal(
    detectConflicts(trip, { today: '2026-08-30' }).some((c) => c.ruleId === 'unbooked_ticketed'), false,
    'and the gated set must not — that is the difference A-9 turns on',
  );
});

test('A-9 (5b): a dismissed `unbooked_ticketed` is not retired by the day merely passing', () => {
  const { trip } = europe2026();
  const target = detectConflicts(trip, { today: FIXTURE_TODAY }).find((c) => c.ruleId === 'unbooked_ticketed')!;
  assert.ok(target, 'the reference trip has an unbooked_ticketed to dismiss');
  const t = resolveConflict(trip, {
    conflictId: target.id, state: 'dismissed', by: LOCAL_OWNER, at: FIXTURE_TODAY,
  });
  const after = syncResolutions(t, '2027-01-01');
  assert.equal(after, t, 'a clock a year past the trip retires nothing');
  assert.equal(after.resolutions.find((r) => r.conflictId === target.id)?.retiredAt, null);
});

test('A-9 (6): no usable clock, nothing happens', () => {
  const { trip } = dismissedLodging();
  for (const at of ['', 'yesterday', '2026-13-45', '26-08-30', undefined as unknown as string, null as unknown as string]) {
    assert.equal(
      syncResolutions(trip, at), trip,
      `syncResolutions(trip, ${JSON.stringify(at)}) must be a no-op with live rows present`,
    );
  }
});

test('A-9: `syncResolutions` early-returns when there is no live resolution row', () => {
  const { trip } = europe2026();
  assert.equal(trip.resolutions.length, 0);
  assert.equal(syncResolutions(trip, FIXTURE_TODAY), trip);
  // ...and a document whose only rows are already retired is the same case.
  const retiredOnly = {
    ...trip,
    resolutions: [{ conflictId: 'gone', state: 'dismissed' as const, by: LOCAL_OWNER, at: '2026-08-01', retiredAt: '2026-08-02' }],
  };
  assert.equal(syncResolutions(retiredOnly, FIXTURE_TODAY), retiredOnly);
});

test('A-9: the greppable ceiling — `ctx.today` appears in exactly one file under conflict/rules/', () => {
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'conflict', 'rules');
  const hits = readdirSync(dir).filter((f) => readFileSync(join(dir, f), 'utf8').includes('ctx.today'));
  assert.deepEqual(hits, ['unbookedTicketed.ts'], `expected one file, got: ${hits.join(', ')}`);
});

test('A-9: `detectUngated` is NOT on the public surface', async () => {
  const surface = await import('../src/index.ts');
  assert.equal('detectUngated' in surface, false, 'detectUngated must not be exported from index.ts');
});
