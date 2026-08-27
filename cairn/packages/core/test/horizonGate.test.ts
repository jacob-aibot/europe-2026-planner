/**
 * A-11 — the clock may not decide *membership* of the un-gated set (ARCHITECTURE §2.7 **A-11**,
 * revision 12, QA R13-1).
 *
 * A-9 deleted `unbooked_ticketed`'s `delta < 0` guard and kept `delta > UNBOOKED_HORIZON_DAYS`,
 * on the argument that *"as a clock advances `delta` only shrinks"*. That is true of a **monotone**
 * clock. `apps/web`'s `systemClock()` returns the device's local civil date, which steps backwards
 * when the device moves west — the second half of every itinerary this product exists to plan —
 * and when a user corrects a wrong clock. One step back across the 60-day boundary took a finding
 * out of `detectUngated`, and `syncResolutions` read *"not in the set"* as *"fixed"*.
 *
 * The invariant A-11 states, and this file is where it is measured:
 *
 * > A rule's **output set** may not depend on the clock. For one document, `detectUngated`
 * > returns the same conflict ids at every well-formed clock. A clock may change a rule's
 * > **prose** — `summary`, `detail`, and any `params` key that is not in `values` — and nothing
 * > else. Every clock-driven *suppression* lives in `detect.ts` under the `gate` conjunct, where
 * > `detectUngated` disables it.
 *
 * One degenerate case is permitted by name: a rule may decline to run **at all** when `ctx.today`
 * is absent (`unbooked_ticketed`'s `if (!ctx.today) return [];`). That costs retirement nothing,
 * because `syncResolutions` also declines without a well-formed `at`, so the two abstentions
 * coincide exactly and the clock-free set is never the set retirement reads. The sweep below is
 * therefore over well-formed clocks only.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  addStop, createTrip, detectConflicts, LOCAL_OWNER, resolveConflict, RULES, sequentialIds,
  setDayMeta, syncResolutions,
} from '../src/index.ts';
import { detectUngated } from '../src/conflict/detect.ts';
import { europe2026, FIXTURE_TODAY } from './fixture.ts';
import { faultFixtures } from './faultFixtures.ts';
import type { BuildCtx, Trip } from '../src/index.ts';

/** The six-clock sweep A-11 names: two decades apart, and both sides of the reference trip. */
const CLOCKS = ['2019-01-01', '2026-08-01', '2026-08-24', '2026-08-30', '2027-08-30', '2030-01-01'];

const ctx = (p = 'hz'): BuildCtx => ({ ids: sequentialIds(p), now: '2026-01-01', actorUserId: LOCAL_OWNER });

/**
 * QA §1.1's document: one ticketed, priced, unbooked stop on a single day, so `delta` is exactly
 * `dayNumber(dayDate) - dayNumber(today)` and the 60-day boundary is reachable by moving the
 * clock one day.
 */
function horizonTrip(dayDate: string): Trip {
  const c = ctx('h');
  let t = createTrip(
    {
      title: 'Horizon',
      startDate: dayDate,
      endDate: dayDate,
      cities: [{ name: 'Tokyo', order: 0, centre: { lat: 35.68, lng: 139.77 } }],
    },
    c,
  );
  const key = t.cities[0].key;
  for (const d of t.days) t = setDayMeta(t, d.id, { primaryCity: key, cities: [key] });
  t = addStop(
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
  return t;
}

// ------------------------------------------------------------------ A-11 (1)

test('A-11 (1): the un-gated set does NOT lose a finding to the 60-day horizon — QA §1.1', () => {
  const t = horizonTrip('2026-03-02');
  const at60 = '2026-01-01'; // delta = 60 — inside the horizon
  const at61 = '2025-12-31'; // delta = 61 — the device date stepped back one day

  const g60 = detectConflicts(t, { today: at60 }).filter((x) => x.ruleId === 'unbooked_ticketed');
  const g61 = detectConflicts(t, { today: at61 }).filter((x) => x.ruleId === 'unbooked_ticketed');
  assert.equal(g60.length, 1, 'the rule fires at delta = 60');
  assert.equal(g61.length, 0, 'the horizon still works in the GATED set at delta = 61');

  const u61 = detectUngated(t, { today: at61 }).filter((x) => x.ruleId === 'unbooked_ticketed');
  assert.equal(
    u61.length, 1,
    'the un-gated set withheld it too — the horizon is still a suppression detectUngated cannot disable',
  );
  assert.equal(u61[0].id, g60[0].id, 'and it is the SAME id, so the conflict id is clock-free');
});

test('A-11 (1): a clock step BACKWARDS across the horizon retires nothing — QA §1.2', () => {
  const t0 = horizonTrip('2026-03-02');
  const at60 = '2026-01-01';
  const at61 = '2025-12-31';
  const target = detectConflicts(t0, { today: at60 }).find((x) => x.ruleId === 'unbooked_ticketed')!;
  const t = resolveConflict(t0, {
    conflictId: target.id, state: 'dismissed', by: LOCAL_OWNER, at: at60,
  });
  assert.equal(t.resolutions[0].retiredAt, null, 'the dismissal is stored live');

  // The plane lands and the local civil date steps back. No edit of any kind.
  const back = syncResolutions(t, at61);
  assert.equal(back.resolutions[0].retiredAt, null, 'a backwards clock alone does not retire the dismissal');
  assert.equal(back, t, 'and it returns the SAME trip reference — no write is scheduled');
  assert.equal(back.revision, t.revision, '...so the revision does not move');

  // Retirement is monotone (A-5/A-5a/A-5b), so a wrong retirement is permanent. Correct the
  // clock and the finding must render DISMISSED, not accused.
  const restored = syncResolutions(back, at60);
  assert.equal(restored, back, 'putting the clock right is still a no-op');
  const again = detectConflicts(restored, { today: at60 }).find((x) => x.id === target.id)!;
  assert.ok(again, 'the finding is back on screen at the corrected clock');
  assert.ok(again.resolution, 'it carries the user\'s own live resolution');
  assert.doesNotMatch(
    String(again.detail ?? ''), /come back/,
    'it must not accuse the user of a dismissal the CLOCK undid',
  );
});

// ------------------------------------------------------------------ A-11 (2)

test('A-11 (2): the invariant, as a sweep — detectUngated returns the same ids at every clock', () => {
  const fixtures = faultFixtures();
  const fired = new Set<string>();

  for (const { name, trip } of fixtures) {
    let baseline: string[] | null = null;
    for (const today of CLOCKS) {
      const found = detectUngated(trip, { today });
      for (const c of found) fired.add(c.ruleId);
      const ids = found.map((c) => c.id).sort();
      if (baseline === null) baseline = ids;
      else {
        assert.deepEqual(
          ids, baseline,
          `${name}: detectUngated's id set moved between ${CLOCKS[0]} and ${today} — ` +
            'a rule is suppressing on the clock somewhere detectUngated cannot disable it',
        );
      }
    }
  }

  // §0.5's injected-fault discipline, applied to an invariant: a sweep over a document that
  // exercises five rules asserts nothing about the other five.
  const silent = RULES.map((r) => r.id).filter((id) => !fired.has(id));
  assert.deepEqual(
    silent, [],
    `these rules produced no finding at any clock on any fixture, so the sweep says nothing ` +
      `about them: ${silent.join(', ')}`,
  );
});

test('A-11 (2): a clock may still change a rule\'s PROSE — that is what it is allowed to change', () => {
  const t = horizonTrip('2026-03-02');
  const a = detectUngated(t, { today: '2026-01-01' }).find((c) => c.ruleId === 'unbooked_ticketed')!;
  const b = detectUngated(t, { today: '2025-12-31' }).find((c) => c.ruleId === 'unbooked_ticketed')!;
  assert.equal(a.id, b.id, 'same id — the content address is clock-free');
  assert.equal(a.params.daysOut, 60);
  assert.equal(b.params.daysOut, 61, 'the rule still says how far out the day is');
  assert.notEqual(a.summary, b.summary, 'and the sentence a person reads still moves with the clock');
});

// ------------------------------------------------------------------ A-11 (3)

/**
 * `detectConflicts` is provably output-neutral, asserted as bytes rather than as an argument.
 * These digests were taken by running `detectConflicts` on the reference fixture at `be1ed01` —
 * the commit **before** A-11 — so this test is the ceiling A-11 claims, not a restatement of the
 * new code.
 */
const BEFORE_A11: Record<string, string> = {
  '2019-01-01': 'dcef6bdaa5bf0ec3',
  '2026-08-01': '9de4a97000afcd39',
  '2026-08-24': '1b25d2fe2d10e575',
  '2026-08-30': '1b25d2fe2d10e575',
  '2027-08-30': '1b25d2fe2d10e575',
  '2030-01-01': '1b25d2fe2d10e575',
  '(no clock)': 'dcef6bdaa5bf0ec3',
};

test('A-11 (3): detectConflicts is byte-identical to pre-A-11, at six clocks and with none', () => {
  const { trip } = europe2026();
  const digest = (opts: { today?: string }) =>
    createHash('sha256').update(JSON.stringify(detectConflicts(trip, opts))).digest('hex').slice(0, 16);
  for (const today of CLOCKS) {
    assert.equal(digest({ today }), BEFORE_A11[today], `detectConflicts moved at today=${today}`);
  }
  assert.equal(digest({}), BEFORE_A11['(no clock)'], 'detectConflicts moved with no clock injected');
});

// ------------------------------------------------------------------ A-11 (4)

/**
 * A-11 assertion 4 says *"at a clock 200 days before the reference trip, `detectConflicts`
 * reports **no** `unbooked_ticketed` note and `detectUngated` reports **three**; at
 * `FIXTURE_TODAY` both report three."* The rule fires **ten** times on the reference trip, not
 * three: "three" is §2.7's rule table naming the three *fixture cases* (Széchenyi, Prague
 * Castle, Windsor), and `conflict.test.ts` asserts those three by name rather than by count.
 * Ten is also what the shipped ceiling has always said — 11 notes at `FIXTURE_TODAY`, ten of
 * them from this rule. BUILD-NOTES KD-48. The shape of the assertion is A-11's, with the
 * measured number and the three named cases both checked.
 */
test('A-11 (4): the horizon still works where it is supposed to', () => {
  const { trip } = europe2026();
  const far = '2026-01-19'; // 200 days before the trip starts
  const named = ['Széchenyi', 'Prague Castle', 'Windsor Castle'];
  const unbooked = (set: ReturnType<typeof detectConflicts>) => set.filter((c) => c.ruleId === 'unbooked_ticketed');

  assert.equal(
    unbooked(detectConflicts(trip, { today: far })).length, 0,
    'the gated set must still withhold a finding 200 days out — that is what a horizon is for',
  );
  const ungatedFar = unbooked(detectUngated(trip, { today: far }));
  assert.equal(ungatedFar.length, 10, 'the un-gated set must see every one — that is what A-11 changes');
  for (const want of named) {
    assert.ok(
      ungatedFar.some((c) => String(c.params.stopName).startsWith(want.slice(0, 12))),
      `${want} — one of §2.7's three named fixture cases — is missing from the un-gated set`,
    );
  }
  for (const set of [detectConflicts(trip, { today: FIXTURE_TODAY }), detectUngated(trip, { today: FIXTURE_TODAY })]) {
    assert.equal(unbooked(set).length, 10, 'both see all ten at FIXTURE_TODAY');
  }
});

// ------------------------------------------------------------------ A-11 (5)

test('A-11 (5): only a feasibility rule may declare a horizon, and exactly one does', () => {
  const withHorizon = RULES.filter((r) => r.horizonDays !== undefined);
  assert.deepEqual(
    withHorizon.map((r) => r.id), ['unbooked_ticketed'],
    'a second rule declared a horizon — that is allowed, but A-11 (2)\'s sweep must cover it',
  );
  for (const rule of withHorizon) {
    assert.equal(rule.class, 'feasibility', `${rule.id} declares a horizon but is not a feasibility rule`);
    assert.ok(
      typeof rule.horizonDays === 'number' && rule.horizonDays > 0,
      `${rule.id}'s horizonDays is not a positive number`,
    );
  }
});
