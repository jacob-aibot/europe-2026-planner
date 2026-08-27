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
import { createHash } from 'node:crypto';

import {
  createTrip, detectConflicts, resolveConflict, RULES, sequentialIds, setDayMeta,
  syncResolutions, upsertBooking, LOCAL_OWNER,
} from '../src/index.ts';
import { detectUngated } from '../src/conflict/detect.ts';
import { europe2026, FIXTURE_TODAY } from './fixture.ts';
import { faultFixtures } from './faultFixtures.ts';
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
 * A-9 (4) **as amended by A-13** (ARCHITECTURE §2.7 A-13, revision 12, QA R13-2).
 *
 * A-9's literal wording asked for the re-arming case to be proven by **extending `endDate` so
 * the conflict returns**. A-13 rules that unachievable for any Phase 1 rule and rewrites the
 * assertion to name the mechanism that does run: the gate **boundary**, crossed by the clock.
 *
 * > Dismiss a feasibility finding while it is live; move the clock past `endDate` so §8.2
 * > withholds it and `syncResolutions` runs at that clock (A-9 assertion 1 — the row stays
 * > live); move the clock back inside the trip so the finding returns. It must render
 * > **dismissed**, carrying the user's own live resolution, and its `detail` must contain no
 * > *"it has come back."*
 *
 * The earlier version of this test also called `setTripMeta(t2, { endDate: '2026-09-30' })`.
 * Round 13 measured that call **inert** — byte-identical results with and without it, because
 * the clock it then reads (`2026-08-26`) is inside the *original* range — so it is deleted
 * rather than kept as decoration. The control below is what proves the assertion is not vacuous.
 */
test('A-9 (4), amended by A-13: crossing the gate boundary and BACK renders it dismissed, not "come back"', () => {
  const { trip, target } = dismissedLodging();
  // Live, then past `endDate` — `syncResolutions` runs at the post-gate clock and must not retire.
  const t2 = syncResolutions(syncResolutions(trip, '2026-08-25'), '2026-08-30');
  assert.equal(t2.resolutions[0].retiredAt, null, 'A-9 (1): the row is still live at the post-gate clock');
  assert.equal(
    detectConflicts(t2, { today: '2026-08-30' }).some((x) => x.id === target.id), false,
    'the gate really did withhold it — otherwise the crossing below is not a crossing',
  );

  // Back inside the trip: the finding returns and must carry the user's own answer.
  const again = detectConflicts(t2, { today: '2026-08-26' }).find((x) => x.id === target.id);
  assert.ok(again, 'the same conflict id must be visible again once the clock is back inside the trip');
  assert.ok(again.resolution, 'it renders DISMISSED — the user\'s answer is still live');
  assert.equal(again.resolution.state, 'dismissed');
  assert.doesNotMatch(
    String(again.detail ?? ''), /come back/,
    'it must not accuse the user of a dismissal the CLOCK undid',
  );

  // Control: the document the PRE-A-9 code produced — the row retired by the clock alone.
  const asBefore = {
    ...t2,
    resolutions: t2.resolutions.map((r) => ({ ...r, retiredAt: '2026-08-30' })),
  };
  const accused = detectConflicts(asBefore, { today: '2026-08-26' }).find((x) => x.id === target.id)!;
  assert.equal(accused.resolution, null, 'control: the dismissal no longer suppresses anything');
  assert.match(String(accused.detail ?? ''), /come back/, 'control: this is the sentence A-9 removes');
});

/**
 * A-13's tripwire — the structural reason A-9 assertion 4's literal mechanism is unachievable,
 * kept as a live guard instead of a permanently-failing probe line.
 *
 * Extending `endDate` can un-gate a finding only if some subject resolves to a date **through
 * §8.2 ruling 2's fallback** — `{kind:'trip'}`, `{kind:'place'}`, a pool stop, or an id nothing
 * matches, the subjects with no day of their own. All five feasibility rules emit a
 * `{kind:'day'}` subject naming a day the trip actually contains, and the gate suppresses only
 * when EVERY subject is past, so a real day pins every feasibility finding to a real date and
 * `trip.endDate` never enters the computation.
 *
 * This is deliberately **not** an assertion that the fallback is unused: `rule_error` notes use
 * `{kind:'trip'}` and integrity rules may. Only that no rule whose findings the gate can
 * withhold depends on it.
 */
test('A-13 tripwire: no feasibility finding resolves ONLY through §8.2 ruling 2\'s endDate fallback', () => {
  const feasibility = new Set(RULES.filter((r) => r.class === 'feasibility').map((r) => r.id));
  const seen = new Set<string>();
  const offenders: string[] = [];

  for (const { name, trip } of faultFixtures()) {
    // The un-gated set, so the gate cannot hide the very findings this is measuring.
    for (const c of detectUngated(trip, { today: FIXTURE_TODAY })) {
      if (!feasibility.has(c.ruleId)) continue;
      seen.add(c.ruleId);
      const pinned = c.subjects.some((s) => {
        if (s.kind === 'day') return trip.days.some((d) => d.id === s.id);
        if (s.kind === 'stop') return trip.days.some((d) => d.stops.some((x) => x.id === s.id));
        if (s.kind === 'booking') return trip.bookings.some((b) => b.id === s.id);
        return false; // 'trip' and 'place' are ruling 2's fallback by definition
      });
      if (!pinned) offenders.push(`${name}: ${c.id} (${c.ruleId})`);
    }
  }

  assert.deepEqual(
    offenders, [],
    'A-9 assertion 4\'s LITERAL mechanism has just become achievable — a feasibility finding now ' +
      'resolves only through trip.endDate, so extending endDate can un-gate it. Write that test, ' +
      'in this commit: ARCHITECTURE §2.7 A-13.\n  ' + offenders.join('\n  '),
  );
  assert.deepEqual(
    [...feasibility].filter((id) => !seen.has(id)), [],
    'a feasibility rule produced no finding on any fixture, so this tripwire says nothing about it',
  );
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

// A-9's greppable ceiling — "`ctx.today` appears in exactly one file under conflict/rules/" —
// lived here and is **replaced**, not deleted, by A-11: the token grep was a proxy for a
// property, the property is available directly, and the grep could not see the one suppression
// it permitted (`delta > UNBOOKED_HORIZON_DAYS`, in the very file it allowed). The property is
// now swept at six clocks over the reference fixture and every injected-fault fixture in
// `packages/core/test/horizonGate.test.ts`.

test('A-9: `detectUngated` is NOT on the public surface', async () => {
  const surface = await import('../src/index.ts');
  assert.equal('detectUngated' in surface, false, 'detectUngated must not be exported from index.ts');
});

// ---------------------------------------------------------------------------
// A-12 — a crashed rule's contribution is *unknown*, not *absent*
// (ARCHITECTURE §2.7 A-12, revision 12, QA R13-3)
//
// `detect.ts`'s `catch` replaces a crashing rule's ENTIRE output with one synthetic
// `rule_error` note, so every real finding that rule would have produced is absent from the
// un-gated set — and `syncResolutions` reads absence as *"the user fixed it"*. A-9 point 1's
// `!crashed` conjunct protects the NOTE; nothing protected the rule's other findings.
//
// > `syncResolutions` retires nothing at all — same reference, `revision` unmoved — if any rule
// > threw during the detection it is deciding from.
//
// Trip-wide rather than per-rule: a stored `ConflictResolution` carries only its `conflictId`,
// and working out which rule would have owned it means parsing the id, which A-9 refused
// because §2.7 treats a conflict id as an opaque content address. Nothing is lost — retirement
// is idempotent bookkeeping with no deadline, so it runs on the next recompute after the crash
// is fixed.
// ---------------------------------------------------------------------------

/** Runs `body` with one rule stubbed to throw, and always puts the real `run` back. */
function withCrashingRule<T>(ruleId: string, body: () => T): T {
  const rule = RULES.find((r) => r.id === ruleId)!;
  assert.ok(rule, `no rule ${ruleId}`);
  const real = rule.run;
  rule.run = () => { throw new Error('transient'); };
  try {
    return body();
  } finally {
    rule.run = real;
  }
}

test('A-12 (1): a crash in the rule that OWNS the dismissal retires nothing — QA r13-gate-citykey §4', () => {
  const { trip, target } = dismissedLodging();
  const after = withCrashingRule('missing_lodging', () => syncResolutions(trip, '2026-08-24'));
  assert.equal(after.resolutions[0].retiredAt, null, 'a crashed detection is not evidence of a fix');
  assert.equal(after, trip, 'and it returns the SAME trip reference — no write is scheduled');
  assert.equal(after.revision, trip.revision, '...so the revision does not move');

  // The rule works again. The user must not be accused of a dismissal a crash undid.
  const back = detectConflicts(after, { today: '2026-08-24' }).find((x) => x.id === target.id)!;
  assert.ok(back.resolution, 'it renders DISMISSED — the user\'s answer is still live');
  assert.doesNotMatch(String(back.detail ?? ''), /come back/, 'and carries no accusation');
});

/**
 * The **trip-wide** half, and the reason A-12 is not per-rule: a stored `ConflictResolution`
 * carries only its `conflictId`, so mapping it back to the rule that owned it means parsing the
 * id — which A-9 refused, because §2.7 treats a conflict id as an opaque content address.
 *
 * The discriminating case is a *genuinely fixed* dismissal alongside an *unrelated* crash.
 * Pre-A-12 that retires (the finding really is gone); post-A-12 it waits, because the analysis
 * is incomplete. Nothing is lost — retirement is idempotent bookkeeping with no deadline, so it
 * runs on the next recompute after the crash is fixed, asserted below.
 */
test('A-12 (1b): a crash in ANOTHER rule defers even a GENUINE retirement, and it resumes after', () => {
  const { trip } = dismissedLodging();
  const fixed = upsertBooking(trip, {
    id: 'b-tokyo', tripId: trip.id, kind: 'lodging', operator: 'Hotel Tokyo', reference: null,
    startsAt: { date: '2026-08-25', time: null }, endsAt: { date: '2026-08-29', time: null },
    price: null, party: null, status: 'active', ticket: null,
    provenance: {
      source: 'user', state: 'accepted', confidence: 'confirmed',
      addedAt: '2026-08-24', acceptedAt: '2026-08-24', actorUserId: null,
    },
  });
  const deferred = withCrashingRule('geo_outlier', () => syncResolutions(fixed, '2026-08-24'));
  assert.equal(deferred, fixed, 'an incomplete analysis is not a set retirement may be computed from');
  assert.equal(deferred.resolutions[0].retiredAt, null);

  // The crash is fixed. The next recompute retires, at whatever clock that is.
  const resumed = syncResolutions(deferred, '2026-08-25');
  assert.equal(resumed.resolutions[0].retiredAt, '2026-08-25', 'retirement resumes once detection is complete');
});

test('A-12 (2): a crash in EVERY rule, one at a time, retires nothing', () => {
  const { trip } = dismissedLodging();
  for (const rule of RULES) {
    const after = withCrashingRule(rule.id, () => syncResolutions(trip, '2026-08-24'));
    assert.equal(after, trip, `a crash in ${rule.id} retired something`);
  }
});

test('A-12 (3): the point of §2.7 is NOT lost — with no crash, a genuine fix still retires', () => {
  const { trip } = dismissedLodging();
  // A-9 assertion 3's sequence, re-run unchanged: the user books the lodging.
  let t = upsertBooking(trip, {
    id: 'b-tokyo', tripId: trip.id, kind: 'lodging', operator: 'Hotel Tokyo', reference: null,
    startsAt: { date: '2026-08-25', time: null }, endsAt: { date: '2026-08-29', time: null },
    price: null, party: null, status: 'active', ticket: null,
    provenance: {
      source: 'user', state: 'accepted', confidence: 'confirmed',
      addedAt: '2026-08-24', acceptedAt: '2026-08-24', actorUserId: null,
    },
  });
  t = syncResolutions(t, '2026-08-30');
  assert.equal(t.resolutions[0].retiredAt, '2026-08-30', 'A-12 must not turn retirement off');
});

test('A-12 (4): `detectConflicts` during a crash is byte-identical to before A-12', () => {
  const { trip } = europe2026();
  // Digests taken by running `detectConflicts` on the reference fixture with each rule stubbed
  // to throw, before A-12 — so this is the ceiling A-12 claims, not a restatement of it. A-12
  // changes `syncResolutions`, and rendering is deliberately untouched: a crash still shows as
  // one ungated `rule_error` note and there is no second "retirement is paused" indicator.
  const before: Record<string, string> = {
    missing_lodging: '9c57480b13539601',
    geo_outlier: 'dee6e11fe307c181',
  };
  for (const [ruleId, want] of Object.entries(before)) {
    const got = withCrashingRule(ruleId, () =>
      createHash('sha256')
        .update(JSON.stringify(detectConflicts(trip, { today: FIXTURE_TODAY })))
        .digest('hex')
        .slice(0, 16));
    assert.equal(got, want, `detectConflicts moved while ${ruleId} was crashing`);
    const notes = withCrashingRule(ruleId, () =>
      detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'rule_error'));
    assert.equal(notes.length, 1, 'exactly one rule_error note, as before');
  }
});

test('A-12: `detectUngatedChecked` reports the crashed rule ids, in RULES order', async () => {
  const { trip } = europe2026();
  const detect = await import('../src/conflict/detect.ts');
  const clean = detect.detectUngatedChecked(trip, { today: FIXTURE_TODAY });
  assert.deepEqual(clean.crashed, [], 'nothing crashes on the reference fixture');
  assert.deepEqual(
    clean.conflicts.map((c) => c.id),
    detectUngated(trip, { today: FIXTURE_TODAY }).map((c) => c.id),
    'the array-returning wrapper and the checked pair must not disagree',
  );
  const crashed = withCrashingRule('geo_outlier', () => detect.detectUngatedChecked(trip, { today: FIXTURE_TODAY }));
  assert.deepEqual(crashed.crashed, ['geo_outlier']);
});

test('A-12: `detectUngatedChecked` is NOT on the public surface either', async () => {
  const surface = await import('../src/index.ts');
  assert.equal('detectUngatedChecked' in surface, false);
});
