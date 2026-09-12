/**
 * ARCHITECTURE **§11.11 A-96 Part 2** / ROADMAP **I-37 part 1** — *one definition of how long a
 * stop occupies the clock*.
 *
 * A fact the document carries in two different fields is read through one function, not at two
 * call sites. `conflict/rules/overlap.ts` had that function module-private since Phase 1;
 * `ask/freeTime.ts` implemented a second, narrower opinion of it and called 21 of 21 journey
 * stops silent. This file pins the promoted function, its one trap (an `arrival` on a NON-journey
 * stop is the leg INTO the stop — §2.5 — and is not occupancy), and the identity that makes
 * `overlap`'s golden unmovable.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { europe2026 } from './fixture.ts';
import { clockOf, intervalIntersects, occupiedInterval, stopOccupancy } from '../src/derive/occupancy.ts';
import type { Stop } from '../src/model/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '..', 'src');

/** A real stop of the reference trip, with fields overridden. Never a hand-typed `Stop`. */
function variant(base: Stop, over: Partial<Stop>): Stop {
  return { ...base, ...over };
}

test('A-96 Part 1: 21 of 21 journey stops state a run length the old reading called silent', () => {
  const { trip } = europe2026();
  const scheduled = trip.days.flatMap((d) => d.stops);
  assert.equal(scheduled.length, 112);
  const journeys = scheduled.filter((s) => s.travelRole === 'journey');
  assert.equal(journeys.length, 21, 'the fixture no longer carries the population this ruling is about');
  assert.equal(journeys.filter((s) => s.arrival !== null).length, 21);
  assert.equal(journeys.filter((s) => s.durationMins === null).length, 21);
  for (const s of journeys) {
    const occ = stopOccupancy(s);
    assert.ok(occ !== null, 'a journey stop carrying an arrival still states nothing');
    assert.equal(occ.source, 'journey_run');
    assert.equal(occ.mins, s.arrival!.mins);
  }
  // And the population that remains genuinely silent — 91 of 112, not 112.
  assert.equal(scheduled.filter((s) => stopOccupancy(s) === null).length, 91);
});

test('A-96 Part 2, the trap: an `arrival` on a NON-journey stop is the leg INTO it, never occupancy', () => {
  const { trip } = europe2026();
  const scheduled = trip.days.flatMap((d) => d.stops);
  const withArrival = scheduled.filter((s) => s.travelRole !== 'journey' && s.arrival !== null);
  assert.equal(withArrival.length, 60, '60 of 112 is the measurement that makes this trap worth naming');
  for (const s of withArrival) {
    assert.equal(stopOccupancy(s), null, `${s.travelRole} stop read its inbound leg as its own occupancy`);
  }
  // `'unknown'` is not `'journey'` and states nothing — §2.12's own degrade rule.
  const journey = scheduled.find((s) => s.travelRole === 'journey' && s.arrival)!;
  assert.equal(stopOccupancy(variant(journey, { travelRole: 'unknown' })), null);
  assert.equal(stopOccupancy(variant(journey, { travelRole: 'transfer' })), null);
});

test('`durationMins` wins over the journey run, and states its source', () => {
  const { trip } = europe2026();
  const journey = trip.days.flatMap((d) => d.stops).find((s) => s.travelRole === 'journey' && s.arrival)!;
  const stated = stopOccupancy(variant(journey, { durationMins: 45 }))!;
  assert.deepEqual(stated, { mins: 45, source: 'stated_duration' });
  const transfer = trip.days.flatMap((d) => d.stops).find((s) => s.travelRole === 'transfer')!;
  assert.deepEqual(stopOccupancy(variant(transfer, { durationMins: 20 })), { mins: 20, source: 'stated_duration' });
});

test('occupiedInterval: a stop with no stated run occupies its start instant and nothing more', () => {
  const { trip } = europe2026();
  const day = trip.days.find((d) => d.id === '2026-08-14')!;
  const plain = day.stops.find((s) => s.travelRole !== 'journey')!;
  const i = occupiedInterval(plain)!;
  assert.equal(i.source, null);
  assert.equal(i.startMin, i.endMin, 'a stop that states no run length was given one');
  assert.equal(i.crossesDay, false);
});

test('occupiedInterval: the flagship — 17:15 + 80 runs to 18:35, inside the evening window', () => {
  const { trip } = europe2026();
  const bus = trip.days.find((d) => d.id === '2026-08-14')!.stops
    .find((s) => s.placement.kind === 'scheduled' && s.placement.time === '17:15')!;
  assert.equal(bus.travelRole, 'journey');
  assert.equal(bus.arrival!.mins, 80);
  const i = occupiedInterval(bus)!;
  assert.deepEqual(i, { startMin: 17 * 60 + 15, endMin: 18 * 60 + 35, source: 'journey_run', crossesDay: false });
});

/**
 * **§11.12 A-97 Part 3 (QA R71-1).** `endMin` used to be clamped to 1439, and `free_time` printed
 * that clamp as a landing time: *"on 2026-08-07 you are on a flight from 16:45 until 23:59"* about
 * a stop the document gives `arrival: {flight, 660}`. **A value computed to DECIDE a question may
 * never be STATED as a fact unless it is true outside the decision that produced it.** So `endMin`
 * is the document's own arithmetic, uncapped, and there is exactly **one** end-of-run instant in
 * this package: `overlap` renders `start + mins` and this renders `endMin`, and they are the same
 * number spelled by the same `clockOf`.
 */
test('A-97 Part 3: `endMin` is the document\'s own arithmetic, uncapped — one end-of-run instant', () => {
  const { trip } = europe2026();
  const scheduled = trip.days.flatMap((d) => d.stops);
  const crossing = scheduled
    .map((s) => ({ s, i: occupiedInterval(s) }))
    .filter((x) => x.i !== null && x.i.crossesDay);
  assert.equal(crossing.length, 2, 'A-96 Part 3 measured 2 of the 21 journey intervals running past 23:59');
  for (const { s, i } of crossing) {
    const occ = stopOccupancy(s)!;
    assert.equal(i!.endMin, i!.startMin + occ.mins, 'a run past midnight was clamped instead of stated');
    assert.ok(i!.endMin > 1439, 'crossesDay is true of an interval that does not cross the day');
  }
  const transatlantic = scheduled.find((s) => s.arrival?.mins === 660 && s.travelRole === 'journey')!;
  const i = occupiedInterval(transatlantic)!;
  assert.equal(i.startMin, 16 * 60 + 45);
  assert.equal(i.endMin, 16 * 60 + 45 + 660, '16:45 + 660 is 1665 — 03:45 the next day, which is what the document says');
  assert.equal(i.endMin, 1665);
  assert.equal(i.crossesDay, true);
  // The identity R71-1 measured as broken: `overlap` renders this same run as 16:45–27:45 from
  // the same `stopOccupancy`, and `clockOf` is not clamped to 24 hours.
  assert.equal(clockOf(i.endMin), '27:45');
  assert.equal(clockOf(i.startMin + transatlantic.arrival!.mins), '27:45');
});

/**
 * **A-97 Part 3 decision 2.** The clamp is not deleted — it moves into the one consumer that
 * needs a day-closed reading. It is **behaviourally inert at every window this vocabulary can
 * name** (`DAYPART_WINDOWS`' three `from` values are 300, 720 and 1080, all below 1439, and the
 * predicate only compares `end > fromMin`), which is R71-1's whole point: the clamp never had a
 * consumer that needed it and its only reader was prose, where it was false. It is kept because
 * *"no claim about the next day"* is a real contract (A-96 Part 3) and a **fourth daypart** is
 * cheaper to add against an explicit line — so this test names that fourth daypart.
 */
test('A-97 Part 3: the clamp lives in `intervalIntersects`, and a window at the day boundary sees it', () => {
  const { trip } = europe2026();
  const transatlantic = trip.days.flatMap((d) => d.stops)
    .find((s) => s.arrival?.mins === 660 && s.travelRole === 'journey')!;
  const i = occupiedInterval(transatlantic)!;
  // Inert at the three windows the vocabulary can name — all three `from` values are < 1439.
  for (const fromMin of [5 * 60, 12 * 60, 18 * 60]) {
    assert.equal(intervalIntersects(i, fromMin, 23 * 60 + 59), true);
  }
  // A hypothetical fourth daypart that opens at 23:59 is the case the clamp exists for: the run
  // reaches 27:45 in the document, and the model still makes NO claim about the next day.
  assert.equal(intervalIntersects(i, 1439, 1439), false, 'the day-closed reading was lost when the clamp moved');
});

test('occupiedInterval is null for a stop that is not on a day clock at all', () => {
  const { trip } = europe2026();
  assert.ok(trip.pool.length > 0);
  for (const s of trip.pool) assert.equal(occupiedInterval(s), null, 'a pooled stop was placed on a clock');
  const scheduled = trip.days.flatMap((d) => d.stops)[0];
  assert.equal(scheduled.placement.kind, 'scheduled');
  if (scheduled.placement.kind !== 'scheduled') return;
  const untimed: Stop = { ...scheduled, placement: { ...scheduled.placement, time: null } };
  assert.equal(occupiedInterval(untimed), null, 'a scheduled stop with no time was placed on a clock');
});

test('one definition: `stopOccupancy` is the only reader of `arrival.mins` AS the stop\'s own run', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const full = resolve(dir, n);
      return statSync(full).isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : [];
    });
  const readers = walk(SRC).filter((f) => {
    const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    return /travelRole\s*===\s*'journey'[\s\S]{0,80}arrival/.test(code);
  });
  assert.deepEqual(
    readers.map((f) => f.slice(SRC.length + 1)),
    ['derive/occupancy.ts'],
    'a second definition of "how long a journey stop runs" exists — A-96 Part 2 moved it to one place',
  );
  // And `overlap` reaches it by import rather than by re-implementing it.
  const overlap = readFileSync(resolve(SRC, 'conflict', 'rules', 'overlap.ts'), 'utf8');
  assert.match(overlap, /import \{[^}]*\bstopOccupancy\b[^}]*\} from '\.\.\/\.\.\/derive\/occupancy\.ts'/);
});

/**
 * **QA R71-4.** When a run length is stated the predicate tested **only** `endMin > fromMin` and
 * never whether the stop *starts* inside the window. For `mins > 0` the two are equivalent; for
 * `mins === 0` at the window's first minute, and for any `mins < 0`, a stop that starts inside the
 * window was reported as not occupying it — `classifyDay` returned `open` and the answer was a
 * confident **"Yes."** at `coverage: 'complete'`. `fromJSON`'s `numOf` accepts both values (finite
 * is its only test) and neither `validateTrip` nor `createStop` refuses a negative duration.
 *
 * The predicate now tests **both ends** of a stated run. It is written against the **clamped**
 * end, because the day-closed reading is this predicate's own business (A-97 Part 3).
 */
test('R71-4: a stated run is tested at BOTH ends — a stop that starts inside the window occupies it', () => {
  const { trip } = europe2026();
  const day = trip.days.find((d) => d.id === '2026-08-14')!;
  const base = day.stops.find((s) => s.placement.kind === 'scheduled' && s.placement.time === '17:15')!;
  const EVENING: [number, number] = [18 * 60, 23 * 60 + 59];
  const at = (time: string, over: Partial<Stop>): boolean => {
    const s = variant(base, { ...over, placement: { kind: 'scheduled', dayId: day.id, time, order: 0 } as Stop['placement'] });
    const i = occupiedInterval(s)!;
    return intervalIntersects(i, EVENING[0], EVENING[1]);
  };
  // A zero-length stated run at the window's very first minute. It starts inside the window.
  assert.equal(at('18:00', { durationMins: 0 }), true, 'a stop starting at 18:00 does not occupy the evening');
  // A negative stated run — a shape `numOf` accepts and no build door refuses.
  assert.equal(at('20:00', { durationMins: -30 }), true, 'a stop starting at 20:00 does not occupy the evening');
  // The half-open end is untouched: a run that LANDS at 18:00 does not occupy 18:00 (A-96).
  assert.equal(at('17:00', { durationMins: 60 }), false, 'a run landing at 18:00 was read as occupying it');
  // And the ordinary cases still read the same way.
  assert.equal(at('17:15', { durationMins: null, arrival: null }), false, 'a stop that states nothing was given a run');
  assert.equal(at('17:15', {}), true, 'the 17:15 bus runs to 18:35, inside the evening');
  assert.equal(at('20:00', { durationMins: null, arrival: null }), true, 'a stop with no stated run occupies its start instant');
});
