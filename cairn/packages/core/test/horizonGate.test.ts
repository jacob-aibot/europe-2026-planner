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
import type { BuildCtx, Conflict, Trip } from '../src/index.ts';

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

/**
 * Every document A-11's sweep covers, plus the one A-17 adds: a `duplicate_id` document, which
 * `validateTrip` calls an **error** and `fromJSON` accepts deliberately (refusing to parse
 * would make the document unopenable and hide the report — A-10's precedent), so `importDoc`
 * is a live route to one.
 */
function sweptDocuments(): Array<{ name: string; trip: Trip }> {
  return [
    { name: 'reference', trip: europe2026().trip },
    ...faultFixtures(),
    { name: 'horizon-60', trip: horizonTrip('2026-03-02') },
    { name: 'duplicate-stop-id', trip: duplicateStopIdTrip() },
  ];
}

/** One stop id on TWO days. `subjectDate` has no correct answer to *"which day is this on"*. */
function duplicateStopIdTrip(): Trip {
  const c = ctx('dup');
  let t = createTrip(
    {
      title: 'D', startDate: '2026-05-01', endDate: '2026-09-01',
      cities: [{ name: 'Vienna', order: 0, centre: { lat: 48.2, lng: 16.37 } }],
    },
    c,
  );
  const init = {
    id: 'stop-dup', name: 'Tick', category: 'sight' as const, place: { kind: 'none' as const },
    cost: { display: '€10', amounts: [{ lo: 10, hi: 10, currency: 'EUR', basis: 'per_person' as const }] },
    links: [{ label: 'T', href: 'https://e.test/t' }],
  };
  t = addStop(t, { kind: 'scheduled', dayId: '2026-05-01', time: '10:00', order: 0 }, init, c);
  return addStop(t, { kind: 'scheduled', dayId: '2026-09-01', time: '10:00', order: 0 }, init, c);
}

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

  // A-17 (revision 13, QA R14-1) — the `Rule` contract's standing obligation, asserted here
  // because this is where "who may declare a horizon" already lives:
  //
  // > A rule that declares `horizonDays` must emit, among the subjects of every conflict it
  // > produces, at least one ref whose `subjectDate` resolution does not depend on an id being
  // > unique — in practice the `{kind:'day'}` ref for the day the finding is about. A rule that
  // > cannot do so may not declare a horizon.
  //
  // That is what keeps A-17's safe direction true for the NEXT rule to declare a horizon:
  // `beyondHorizon` suppresses only when EVERY subject resolves beyond the horizon, so a ref
  // that resolves unambiguously to the day the rule reasoned about means a duplicated id can
  // only ever make the conjunction fail — over-reporting, never hiding something actionable.
  // The case it excludes is real: a finding about a POOL stop has no day of its own and falls
  // through to §8.2 ruling 2's `endDate`. Excluding it is the honest answer — a pool stop has
  // no date, so "more than 60 days out" is a claim about a date that does not exist.
  const horizoned = new Set(withHorizon.map((r) => r.id));
  let inspected = 0;
  for (const { name, trip } of sweptDocuments()) {
    for (const today of CLOCKS) {
      for (const c of detectUngated(trip, { today })) {
        if (!horizoned.has(c.ruleId)) continue;
        inspected++;
        assert.ok(
          c.subjects.some((s) => s.kind === 'day' && trip.days.some((d) => d.id === s.id)),
          `${name} @${today}: ${c.ruleId} declares a horizon but conflict ${c.id} carries no ` +
            'resolvable {kind:\'day\'} subject — its gating would depend on an id being unique',
        );
      }
    }
  }
  assert.ok(inspected > 0, 'no horizoned rule fired anywhere in the sweep, so the obligation is vacuous');
});

// ------------------------------------------------------------------ A-17

/**
 * A-17 (revision 13, QA R14-1) — *the gate never withholds a finding the deleted guard would
 * have kept.*
 *
 * A-11 assertion 5 claimed `detectConflicts` was *"provably output-neutral"*, on the argument
 * that `unbooked_ticketed`'s two subjects both resolve through `subjectDate` to the same day.
 * They do not on a document whose stop id sits on two days: `subjectDate` resolves a
 * `{kind:'stop'}` ref to the **first** day holding that id, which need not be the day the rule
 * was iterating. A-17 **narrows the claim** rather than threading a subject date through
 * `Conflict` — §0.6 (the date a stop happens on is a fact the document states, and on a
 * `duplicate_id` document there is no correct answer), blast radius (`Conflict.values` is
 * content-addressed and persisted in every `Resolution` row), and the direction being safe.
 *
 * This is the assertion that stops that being a doc edit which waves a finding through.
 * `params.daysOut` is the rule's own reckoning, computed from the day it was iterating —
 * prose, which A-11 permits a clock to influence — so it is an oracle **independent of
 * `subjectDate`**, which is exactly what makes the test worth writing.
 *
 * The one narrowing this test makes to the ruling's wording, and why it is not a weakening:
 * the sweep excludes findings whose `daysOut` is **negative**. A day in the past is withheld by
 * §8.2's feasibility gate (`suppressedAsPast`), which A-11 did not touch and A-17 does not
 * claim anything about; `daysOut >= 0` means the day the rule iterated is today or later, so
 * that subject cannot be strictly before `today` and `suppressedAsPast` — which needs EVERY
 * subject in the past — provably cannot fire. Inside that band the horizon is the only gate
 * left that could withhold the finding, which is the claim being made.
 */
test('A-17: the gate never withholds a finding inside its own horizon — by id, over every fixture', () => {
  const horizons = new Map(
    RULES.filter((r) => r.horizonDays !== undefined).map((r) => [r.id, r.horizonDays as number]),
  );
  const inHorizon = (c: Conflict): boolean => {
    const h = horizons.get(c.ruleId);
    if (h === undefined) return false;
    const daysOut = Number(c.params.daysOut);
    return Number.isFinite(daysOut) && daysOut >= 0 && daysOut <= h;
  };

  const byDoc: Record<string, number> = {};
  for (const { name, trip } of sweptDocuments()) {
    for (const today of CLOCKS) {
      const gated = new Set(detectConflicts(trip, { today }).map((c) => c.id));
      for (const c of detectUngated(trip, { today }).filter(inHorizon)) {
        byDoc[name] = (byDoc[name] ?? 0) + 1;
        assert.ok(
          gated.has(c.id),
          `${name} @${today}: ${c.ruleId} reported ${c.params.daysOut} days out — inside its own ` +
            `${horizons.get(c.ruleId)}-day horizon — and the GATE withheld it. The horizon may only ` +
            'ever over-report (A-17); withholding is the direction this ruling did not buy.',
        );
      }
    }
  }
  assert.ok((byDoc['reference'] ?? 0) > 0, 'the reference trip contributed nothing — the sweep is vacuous');
  assert.ok(
    (byDoc['duplicate-stop-id'] ?? 0) > 0,
    'the duplicate_id document contributed nothing, and it is the document A-17 exists for',
  );
});
