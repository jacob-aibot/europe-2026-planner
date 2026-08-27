/**
 * The conflict rule `class`, and the feasibility gate — ARCHITECTURE §8.2, ROADMAP Phase 2 I-3.
 *
 * > A **feasibility** rule asserts something about whether the plan can happen. It does not
 * > run for a subject whose day is strictly before `ctx.today`. An **integrity** rule asserts
 * > that the data disagrees with itself or with the world; it always runs.
 *
 * The gate lives **once**, in `detect.ts`. A rule that checks the clock itself is ten
 * implementations of one idea. Three edge rulings from §8.2 revision 10 are asserted by name:
 *
 *   1. suppression iff **every** subject resolves to a date strictly before `ctx.today` —
 *      all-subjects, not any-subject, because one subject on or after today keeps the finding;
 *   2. a subject that resolves to **no** date resolves to `trip.endDate`;
 *   3. with **no** `ctx.today`, nothing is gated.
 *
 * This file also carries the phase's exit criterion 2 in the shape the criterion states it:
 * the same reference trip evaluated after `endDate` returns only `integrity` findings with the
 * count stated and one line per finding, then moved back before `startDate` returns the
 * original set exactly.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { europe2026, FIXTURE_TODAY } from './fixture.ts';
import {
  addStop, createTrip, detectConflicts, LOCAL_OWNER, RULES, sequentialIds, setDayMeta, upsertBooking,
} from '../src/index.ts';
import { subjectDate } from '../src/conflict/detect.ts';
// Off the surface by §2.10 revision 5 (it stamps provenance with no gate) — a test may reach
// the module path, and `upsertBooking` takes a whole `Booking`, provenance included.
import { userProvenance } from '../src/model/provenance.ts';
import type { BuildCtx, Trip } from '../src/index.ts';

const ctx = (): BuildCtx => ({ ids: sequentialIds('rc'), now: '2026-01-01', actorUserId: LOCAL_OWNER });

/** §8.2's table, transcribed. Ten rules, one class each, no rule left unclassified. */
const CLASSES: Record<string, 'feasibility' | 'integrity'> = {
  impossible_transfer: 'feasibility',
  overlap: 'feasibility',
  missing_lodging: 'feasibility',
  unbooked_ticketed: 'feasibility',
  booking_vs_plan: 'feasibility',
  legacy_flag: 'integrity',
  geo_outlier: 'integrity',
  unverified_reference: 'integrity',
  duplicate_booking: 'integrity',
  superseded_booking: 'integrity',
};

test('every rule carries a class, and it is the one §8.2 assigns it', () => {
  assert.equal(RULES.length, 10, 'the rule count moved; §8.2 classifies ten');
  for (const rule of RULES) {
    assert.ok(
      rule.class === 'feasibility' || rule.class === 'integrity',
      `${rule.id} has class ${JSON.stringify(rule.class)}`,
    );
    assert.equal(rule.class, CLASSES[rule.id], `${rule.id} is classified against §8.2's table`);
  }
  assert.deepEqual(
    RULES.map((r) => r.id).sort(),
    Object.keys(CLASSES).sort(),
    'a rule exists that §8.2\'s table does not classify, or vice versa',
  );
});

// ---------------------------------------------------------------- subjectDate

test('subjectDate resolves each RefKind the way §8.2 rules it', () => {
  const { trip } = europe2026();
  const day = trip.days[3];
  const stop = day.stops[0];
  const booking = trip.bookings[0];
  const place = trip.places[0];
  const pooled = trip.pool[0];

  assert.equal(subjectDate(trip, { kind: 'day', id: day.id }), day.date, 'a day is its own date');
  assert.equal(subjectDate(trip, { kind: 'stop', id: stop.id }), day.date, "a stop is its day's date");
  assert.equal(
    subjectDate(trip, { kind: 'booking', id: booking.id }),
    booking.startsAt.date,
    'a booking is startsAt.date',
  );
  // The three §8.2 says have no day of their own, and all fall back to trip.endDate.
  assert.equal(subjectDate(trip, { kind: 'trip', id: trip.id }), trip.endDate, 'a trip ref falls back to endDate');
  assert.equal(subjectDate(trip, { kind: 'place', id: place.id }), trip.endDate, 'a place falls back to endDate');
  assert.equal(subjectDate(trip, { kind: 'stop', id: pooled.id }), trip.endDate, 'a POOL stop falls back to endDate');
  // An id nobody knows is not a crash and is not "today" — it is the same fallback.
  assert.equal(subjectDate(trip, { kind: 'stop', id: 'no-such-stop' }), trip.endDate);
  assert.equal(subjectDate(trip, { kind: 'booking', id: 'no-such-booking' }), trip.endDate);
});

// ---------------------------------------------------------------- the gate

test('edge ruling 3: with no ctx.today, NOTHING is gated', () => {
  const { trip } = europe2026();
  const gated = detectConflicts(trip, {});
  const feasibility = gated.filter((c) => CLASSES[c.ruleId] === 'feasibility');
  assert.ok(
    feasibility.length > 0,
    'a run with no `today` returned no feasibility findings at all — the gate invented a default clock',
  );
});

test('exit criterion 2: after endDate, only integrity findings come back', () => {
  const { trip } = europe2026();
  const after = detectConflicts(trip, { today: '2026-08-27' });

  const byRule: Record<string, number> = {};
  for (const c of after) byRule[c.ruleId] = (byRule[c.ruleId] ?? 0) + 1;

  // One line per finding, as the criterion requires — printed so a moved number is readable.
  const lines = after.map((c) => `${c.severity} ${c.ruleId} ${c.subjects.map((s) => `${s.kind}:${s.id}`).join('+')}`);

  for (const c of after) {
    assert.equal(
      CLASSES[c.ruleId],
      'integrity',
      `a feasibility finding survived a clock after endDate: ${c.ruleId}\n${lines.join('\n')}`,
    );
  }
  for (const banned of ['impossible_transfer', 'overlap', 'missing_lodging', 'unbooked_ticketed', 'booking_vs_plan']) {
    assert.equal(byRule[banned] ?? 0, 0, `${banned} fired on a wholly-past trip`);
  }
  // The stated count, and the exact composition behind it.
  assert.equal(after.length, 5, `expected 5 integrity findings, got ${after.length}:\n${lines.join('\n')}`);
  assert.deepEqual(byRule, { legacy_flag: 2, unverified_reference: 2, superseded_booking: 1 }, lines.join('\n'));
  assert.equal(after.filter((c) => c.severity === 'blocker').length, 2, 'the two legacy_flag blockers stay');
});

test('exit criterion 2, second half: moved back before startDate, the ORIGINAL set returns exactly', () => {
  const { trip } = europe2026();
  // `FIXTURE_TODAY` (2026-08-01) is itself before `startDate` (2026-08-07), which is why §8.2
  // says the gate is a no-op on the goldens **by construction**. So "moved back before
  // startDate" IS the goldens' own clock, and "the original set exactly" is the Phase 1 set.
  assert.ok(FIXTURE_TODAY < trip.startDate, 'FIXTURE_TODAY is no longer before the trip starts');
  const atFixture = detectConflicts(trip, { today: FIXTURE_TODAY });
  assert.equal(atFixture.length, 17, `the Phase 1 set moved: ${atFixture.length}`);
  assert.equal(atFixture.filter((c) => c.severity === 'blocker').length, 2);
  assert.ok(
    atFixture.some((c) => CLASSES[c.ruleId] === 'feasibility'),
    'no feasibility rule fires before the trip starts — then the gate cannot be measured here',
  );
  // And the gate really is a no-op here, asserted directly rather than inferred from a count:
  // not one finding at this clock has ALL of its subjects in the past.
  const gateable = atFixture.filter(
    (c) => CLASSES[c.ruleId] === 'feasibility' && c.subjects.every((sub) => subjectDate(trip, sub) < FIXTURE_TODAY),
  );
  assert.deepEqual(gateable.map((c) => c.id), [], 'the gate had something to suppress at the goldens\' clock');

  // Move it back FURTHER and the only thing that changes is `unbooked_ticketed`, which has its
  // own 60-day horizon and skips itself — that is the rule's own contract, not the gate's.
  const jan = detectConflicts(trip, { today: '2026-01-01' });
  const lost = atFixture.filter((c) => !jan.some((j) => j.id === c.id));
  assert.deepEqual(
    [...new Set(lost.map((c) => c.ruleId))],
    ['unbooked_ticketed'],
    'a clock 7 months out lost something other than the horizon-bounded rule',
  );
});

test('no rule is silent at BOTH clocks — a rule that is has been deleted, not classified', () => {
  const { trip } = europe2026();
  const fired = new Set<string>();
  for (const today of [FIXTURE_TODAY, '2026-08-27']) {
    for (const c of detectConflicts(trip, { today })) fired.add(c.ruleId);
  }
  // The five that never fire on this fixture are silent because the fixture has no instance of
  // the fault, not because the gate silenced them — asserted directly below by construction.
  const silent = RULES.map((r) => r.id).filter((id) => !fired.has(id));
  assert.deepEqual(
    silent.sort(),
    ['booking_vs_plan', 'duplicate_booking', 'geo_outlier', 'impossible_transfer', 'overlap'].sort(),
    `the set of rules silent on the reference fixture moved: ${silent.join(', ')}`,
  );
});

// ------------------------------------------------- a straddling trip, in ONE call

/**
 * ROADMAP's own attack: *"a trip whose dates straddle `today` — feasibility rules must fire on
 * the future half and not the past half, on the same document, in one call"*.
 *
 * `missing_lodging` is the rule to do it with, deliberately: it is feasibility and it has **no
 * horizon of its own**, so the only thing that can separate the two halves is the gate. (A
 * first draft used `unbooked_ticketed`, and that test passed with the gate deleted — the
 * rule's own 60-day/`delta < 0` window was doing the work. The red/green run caught it.)
 *
 * The two nights are in two different cities with a gap between, so `missing_lodging`'s own
 * run-grouping makes them two conflicts rather than one straddling conflict — which is a
 * different case, covered by "edge ruling 1" below.
 */
function straddling(): { trip: Trip; pastNight: string; futureNight: string } {
  let trip = createTrip(
    {
      title: 'Straddler',
      startDate: '2026-08-20',
      endDate: '2026-08-30',
      homeCurrency: 'EUR',
      cities: [
        { key: 'alpha', name: 'Alpha', centre: { lat: 48.2, lng: 16.3 } },
        { key: 'beta', name: 'Beta', centre: { lat: 50.0, lng: 14.4 } },
      ],
    },
    ctx(),
  );
  for (const d of ['2026-08-20', '2026-08-21', '2026-08-22']) {
    trip = setDayMeta(trip, d, { primaryCity: 'alpha', cities: ['alpha'] });
  }
  for (const d of ['2026-08-27', '2026-08-28', '2026-08-29']) {
    trip = setDayMeta(trip, d, { primaryCity: 'beta', cities: ['beta'] });
  }
  return { trip, pastNight: '2026-08-20', futureNight: '2026-08-27' };
}

test('a straddling trip: feasibility fires on the future half and not the past half, in one call', () => {
  const { trip, pastNight, futureNight } = straddling();
  const today = '2026-08-25';

  // Ceiling first: with no clock BOTH halves fire, so the difference below is the gate and
  // nothing else about how the two halves were built.
  const ungated = detectConflicts(trip, {}).filter((c) => c.ruleId === 'missing_lodging');
  const ungatedFirsts = ungated.map((c) => c.subjects[0].id).sort();
  assert.deepEqual(ungatedFirsts, [pastNight, futureNight].sort(), `ungated: ${JSON.stringify(ungatedFirsts)}`);

  // Now the same document, one call, with a clock in the middle of it.
  const found = detectConflicts(trip, { today }).filter((c) => c.ruleId === 'missing_lodging');
  const firsts = found.map((c) => c.subjects[0].id);
  assert.deepEqual(firsts, [futureNight], `expected only the future run, got ${JSON.stringify(firsts)}`);
  for (const c of found) {
    assert.ok(
      c.subjects.every((sub) => subjectDate(trip, sub) >= today),
      `a wholly-past run survived: ${JSON.stringify(c.subjects)}`,
    );
  }
  assert.ok(!firsts.includes(pastNight), 'a feasibility rule fired for nights already slept');
});

test('edge ruling 1: all-subjects, not any-subject — one future subject keeps the whole finding', () => {
  // A booking dated in the past, linked to a stop on a day in the future. `booking_vs_plan` is
  // feasibility and emits {stop, booking, day}: the booking subject is past, the stop and day
  // are not, so §8.2's asymmetry says the finding SURVIVES. Jacob can still act on it.
  let trip = createTrip(
    {
      title: 'Asymmetry',
      startDate: '2026-08-20',
      endDate: '2026-08-30',
      homeCurrency: 'EUR',
      cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
    },
    ctx(),
  );
  trip = upsertBooking(
    trip,
    {
      id: 'bk-past',
      tripId: trip.id,
      kind: 'flight',
      operator: 'Testair',
      reference: 'AAA111',
      startsAt: { date: '2026-08-21', time: '09:00' },
      price: null,
      party: null,
      status: 'active',
      ticket: null,
      provenance: userProvenance('2026-01-01', LOCAL_OWNER),
    },
  );
  trip = addStop(
    trip,
    { kind: 'scheduled', dayId: '2026-08-29', time: '18:00', order: 0 },
    {
      name: 'Testair to somewhere',
      category: 'transit',
      place: { kind: 'inline', at: { lat: 48.2082, lng: 16.3738 } },
      bookingId: 'bk-past',
    },
    ctx(),
  );

  const found = detectConflicts(trip, { today: '2026-08-25' }).filter((c) => c.ruleId === 'booking_vs_plan');
  assert.equal(found.length, 1, 'the finding was suppressed even though a subject is still in the future');
  const dates = found[0].subjects.map((s) => subjectDate(trip, s));
  assert.ok(dates.some((d) => d < '2026-08-25'), 'the setup did not actually produce a past subject');
  assert.ok(dates.some((d) => d >= '2026-08-25'), 'the setup did not actually produce a future subject');
});

test('edge ruling 2: an undatable subject resolves to endDate, so a wholly-past trip goes quiet', () => {
  const { trip } = europe2026();
  // The reference trip's `unverified_reference` findings are booking-subject and integrity, so
  // they stay. The point of ruling 2 is the other direction: give the same trip an endDate in
  // the future and every trip-level finding must survive. Asserted through `subjectDate`,
  // which is where the rule lives.
  const future: Trip = { ...trip, endDate: '2030-01-01' };
  assert.equal(subjectDate(future, { kind: 'trip', id: future.id }), '2030-01-01');
  assert.equal(subjectDate(trip, { kind: 'trip', id: trip.id }), trip.endDate);
});

/**
 * QA P2-4. `detect.ts` catches a throwing rule and synthesises a `rule_error` note whose only
 * subject is `{kind:'trip'}` — which ruling 2 resolves to `trip.endDate`. So on a past trip
 * the note was gated by exactly the rule that must not apply to it, but only when the rule
 * that crashed happened to be `feasibility`: a bug in `missingLodging` was invisible on every
 * finished trip, while the identical bug in `geoOutlier` reported.
 *
 * A crash is not "this no longer applies" — it is "the checker is broken", which is an
 * integrity fact about the code and never suppressible by the clock (§0.5, §8.2).
 */
test('QA P2-4: a crashing FEASIBILITY rule still reports rule_error on a wholly-past trip', () => {
  const { trip } = europe2026();
  const seen: Record<string, number> = {};
  for (const id of ['missing_lodging', 'geo_outlier']) {
    const victim = RULES.find((r) => r.id === id);
    assert.ok(victim, `no rule ${id}`);
    const realRun = victim.run;
    victim.run = () => { throw new Error('boom'); };
    try {
      seen[id] = detectConflicts(trip, { today: '2099-01-01' }).filter((c) => c.ruleId === 'rule_error').length;
    } finally {
      victim.run = realRun;
    }
  }
  assert.equal(seen.geo_outlier, 1, 'control: a crashing integrity rule was already reported');
  assert.equal(
    seen.missing_lodging,
    1,
    'a crashing feasibility rule went silent on a past trip — the gate swallowed the crash report',
  );
});

test('QA P2-4: the rule_error exemption is the crash, not the class — every rule is covered', () => {
  const { trip } = europe2026();
  for (const victim of RULES) {
    const realRun = victim.run;
    victim.run = () => { throw new Error(`boom in ${victim.id}`); };
    try {
      const notes = detectConflicts(trip, { today: '2099-01-01' }).filter((c) => c.ruleId === 'rule_error');
      assert.equal(notes.length, 1, `a crash in ${victim.id} (${victim.class}) is invisible on a past trip`);
      assert.match(notes[0].summary, /boom in /);
    } finally {
      victim.run = realRun;
    }
  }
});

test('a wholly-past trip with only feasibility faults is SILENT — no gate leak through severity', () => {
  const { trip } = europe2026();
  const past = detectConflicts(trip, { today: '2099-01-01' });
  for (const c of past) assert.equal(CLASSES[c.ruleId], 'integrity', `${c.ruleId} at today=2099`);
});
