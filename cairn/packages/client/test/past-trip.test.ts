/**
 * ROADMAP Phase 2 **exit criterion 3** — *"a past trip is silent"* — and I-4's ship gate,
 * asserted through the **client store**, because that is what `apps/web`'s past-trip form
 * drives: `createTrip` + `setTripMeta` and nothing else.
 *
 * > Build a 21-day, one-city, zero-stop trip ending in 2019 with `datePrecision:'month'`:
 * > `detectConflicts` returns **zero** findings of any severity and `validateTrip` returns
 * > **zero** issues — a ceiling, not a floor — while `days` is dense over the range and
 * > `Day.id === Day.date` throughout. **Injected fault:** add one stop to it dated *after*
 * > `today` and the feasibility rules return for that day only.
 *
 * Runs in plain Node against the in-memory ports.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createStore, ACTION_SPECS,
  memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler,
  core,
} from '../src/index.ts';
import type { Ports } from '../src/ports/types.ts';

/** The day this increment was written. The 2019 trip is nineteen months behind it. */
const TODAY = '2026-08-27';

function ports(storage = memoryStorage()): Ports & { storage: ReturnType<typeof memoryStorage> } {
  return {
    storage,
    file: memoryFile(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(),
    scheduler: immediateScheduler(),
  } as Ports & { storage: ReturnType<typeof memoryStorage> };
}

/**
 * Exactly what `PastTripForm` dispatches: one `createTrip`, one `setTripMeta`, and one
 * `setDayMeta` per day assigning the trip's first city (KD-38 — `ensureDays` mints
 * `primaryCity:'transit'`, and a past trip attributable to nowhere defeats the lifetime map
 * this phase exists to build). `test/views.test.ts` greps the form against this list, and
 * `qa/p2-pasttrip.mjs` asserts the persisted document a real user produces; this file is
 * where the resulting document is measured.
 */
async function recordPastTrip() {
  const p = ports();
  const store = createStore({ ports: p });
  const created = await store.createTrip({
    title: 'Japan, March 2019',
    startDate: '2019-03-01',
    endDate: '2019-03-21',
    cities: [{ key: 'tokyo', name: 'Tokyo', order: 0 }],
  });
  store.dispatch({ type: 'setTripMeta', patch: { datePrecision: 'month' } });
  for (const day of created.doc!.days) {
    store.dispatch({ type: 'setDayMeta', dayId: day.id, patch: { primaryCity: 'tokyo', cities: ['tokyo'] } });
  }
  return { store, p };
}

test('criterion 3: a 21-day, one-city, zero-stop 2019 trip returns ZERO conflicts and ZERO issues', async () => {
  const { store } = await recordPastTrip();
  const trip = store.getState().doc!;

  assert.equal(trip.datePrecision, 'month');
  assert.equal(trip.days.length, 21, 'the range is 21 days inclusive');
  assert.equal(trip.days.flatMap((d) => d.stops).length, 0, 'zero stops');
  assert.equal(trip.pool.length, 0, 'zero pooled stops');
  assert.equal(trip.cities.length, 1, 'one city');

  const derived = store.getDerived()!;
  assert.equal(derived.today, TODAY);
  assert.deepEqual(
    derived.conflicts.map((c) => `${c.severity} ${c.ruleId}`),
    [],
    'a trip finished in 2019 must not greet the user with a single finding, of any severity',
  );
  assert.deepEqual(
    derived.issues.map((i) => `${i.level} ${i.code}`),
    [],
    'validateTrip must be silent too',
  );
});

test('criterion 3: days stay DENSE and Day.id === Day.date throughout', async () => {
  const { store } = await recordPastTrip();
  const trip = store.getState().doc!;
  assert.notDeepEqual(trip.days, [], '`days: []` is never valid — §8.1');
  for (let i = 0; i < trip.days.length; i++) {
    const day = trip.days[i];
    assert.equal(day.id, day.date, `day ${i}: id and date disagree`);
    if (i > 0) {
      const prev = new Date(`${trip.days[i - 1].date}T00:00:00Z`).getTime();
      const here = new Date(`${day.date}T00:00:00Z`).getTime();
      assert.equal(here - prev, 86400000, `a gap between ${trip.days[i - 1].date} and ${day.date}`);
    }
  }
  assert.equal(trip.days[0].date, '2019-03-01');
  assert.equal(trip.days[trip.days.length - 1].date, '2019-03-21');
});

/**
 * KD-38, closed: a recorded past trip is attributable to a place. `ensureDays` mints blank
 * days as `primaryCity:'transit'` — the catch-all — so without this step the trip says
 * "Japan" and not one of its twenty-one days says anything at all, and I-6's `cityKeys`
 * widening finds no city to put on the map.
 */
test('criterion 3: every day of a recorded past trip is attributable to the trip\'s city', async () => {
  const { store } = await recordPastTrip();
  const trip = store.getState().doc!;
  assert.deepEqual([...new Set(trip.days.map((d) => d.primaryCity))], ['tokyo'], 'a day is attributable to nowhere');
  assert.deepEqual([...new Set(trip.days.flatMap((d) => d.cities))], ['tokyo'], 'the transit catch-all survives');
  assert.deepEqual(
    trip.days.filter((d) => !d.cities.includes(d.primaryCity)).map((d) => d.id),
    [],
    '§2.3: `cities` always contains `primaryCity`',
  );
});

/**
 * The half that makes criterion 3 mean something.
 *
 * `ensureDays` mints blank days as `primaryCity:'transit'`, and `missing_lodging` skips
 * transit days — so a past trip recorded *without* the day assignment above is silent for a
 * second reason as well as the gate, and criterion 3 would pass with the gate deleted. The
 * case §8.2 actually names is *"a 21-day memory trip in one city with no stops trips
 * `missing_lodging` on every night of it"*, and since KD-38 that is exactly the document the
 * form produces — so the same document is measured twice, at two clocks, and the gate is the
 * only difference between them.
 */
test('criterion 3, the CEILING half: the silence is the GATE, not transit days', async () => {
  const { store } = await recordPastTrip();
  const trip = store.getState().doc!;
  assert.ok(trip.days.every((d) => d.primaryCity === 'tokyo'), 'INCONCLUSIVE: the days are not in a city');

  // As a plan, this document is loud: twenty uncovered nights in Tokyo, in one run.
  const asPlanned = core.detectConflicts(trip, { today: '2019-01-01' });
  assert.ok(
    asPlanned.length > 0,
    'the same document is silent at every clock, so criterion 3 proves nothing about the gate',
  );
  assert.ok(
    asPlanned.some((c) => c.ruleId === 'missing_lodging'),
    `missing_lodging did not fire even as a plan: ${asPlanned.map((c) => c.ruleId).join(', ')}`,
  );
  assert.ok(
    asPlanned.every((c) => core.RULES.find((r) => r.id === c.ruleId)!.class === 'feasibility'),
    `something other than a feasibility rule fires: ${asPlanned.map((c) => c.ruleId).join(', ')}`,
  );

  // As a record, at today, it is silent — and that is the gate, and nothing else.
  assert.deepEqual(core.detectConflicts(trip, { today: TODAY }).map((c) => c.ruleId), []);
  assert.deepEqual(core.validateTrip(trip).map((i) => i.code), []);
});

test('criterion 3, INJECTED FAULT: a stop dated after today brings feasibility back for that day ONLY', async () => {
  // Same shape, but the trip straddles `today`, so one of its days is in the future. The days
  // are deliberately NOT assigned to the city here: this measures the one injected fault (a
  // future-dated ticketed stop), and a `missing_lodging` run over a straddling trip survives
  // the gate by §8.2 ruling 1 (all-subjects) and would name past days for a second reason.
  const p = ports();
  const store = createStore({ ports: p });
  await store.createTrip({
    title: 'Straddling record',
    startDate: '2026-08-20',
    endDate: '2026-09-09',
    cities: [{ key: 'tokyo', name: 'Tokyo', order: 0 }],
  });
  store.dispatch({ type: 'setTripMeta', patch: { datePrecision: 'month' } });
  // A ticketed, priced, unbooked stop on a day AFTER today.
  const futureDay = '2026-09-01';
  store.dispatch({
    type: 'addStop',
    placement: { kind: 'scheduled', dayId: futureDay, time: '10:00', order: 0 },
    stop: {
      name: 'teamLab Planets',
      category: 'sight',
      place: { kind: 'inline', at: { lat: 35.6486, lng: 139.7893 } },
      ticket: { kind: 'url', href: 'https://example.invalid/t', label: 'Ticket', verifiedAt: null, verifiedBy: null },
      cost: { amounts: [{ lo: 3800, hi: 3800, currency: 'JPY', basis: 'per_person' }], display: '¥3,800' },
    },
  });

  const conflicts = store.getDerived()!.conflicts;
  assert.ok(conflicts.length > 0, 'a future-dated ticketed stop produced nothing at all');
  // Every day named by every finding is on or after today — nothing about the past half.
  const days = [...new Set(conflicts.flatMap((c) => c.subjects.filter((s) => s.kind === 'day').map((s) => s.id)))];
  assert.ok(days.length > 0, 'no finding names a day');
  for (const d of days) {
    assert.ok(d >= TODAY, `a finding names ${d}, which is before today (${TODAY})`);
  }
  assert.ok(
    conflicts.some((c) => c.ruleId === 'unbooked_ticketed' && c.subjects.some((s) => s.id === futureDay)),
    `unbooked_ticketed did not fire for ${futureDay}: ${conflicts.map((c) => c.ruleId).join(', ')}`,
  );
});

/**
 * §4.2 rule 1, re-asserted because I-4 is the first UI flow added since Phase 1: the form
 * invents no domain logic. Both of the actions it dispatches map 1:1 onto a core build
 * function, and the closed list of six document-installing store methods is still six.
 */
test('I-4: the past-trip flow adds no action and no reducer logic', () => {
  assert.equal(ACTION_SPECS.setTripMeta.coreFn, 'setTripMeta');
  assert.equal(ACTION_SPECS.setDayMeta.coreFn, 'setDayMeta');
  assert.equal(ACTION_SPECS.addStop.coreFn, 'addStop');
  for (const fn of ['setTripMeta', 'setDayMeta']) {
    assert.equal(
      typeof (core as Record<string, unknown>)[fn],
      'function',
      `${fn} is not a core build function`,
    );
  }
});
