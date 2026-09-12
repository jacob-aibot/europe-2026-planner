/**
 * ARCHITECTURE **§11** / ROADMAP **I-35** — a question about your own trip, answered from the
 * document and nothing else.
 *
 * Every number below is measured over the reference trip (`fixtures/loadEurope2026.mjs`, which
 * reads the live planner READ-ONLY) and each criterion names its selector. The nine injected
 * faults `I-35` names are implemented here under the names `N1`…`N9`, and **each one is either
 * SHOWN TO FIRE or DECLARED UNFIREABLE AT ITS SITE** — §0 position 5 (b) / *How a criterion is
 * written* rule 9. "Shown to fire" here means the criterion is factored into a local `check`
 * function, `check(real)` passes, and `assert.throws(() => check(faulty))` runs the *same*
 * assertion against the output the fault would produce. A criterion that cannot be made to fail
 * is not a criterion.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { europe2026 } from './fixture.ts';
import * as core from '../src/index.ts';
import { resolveCite } from '../src/ask/resolveCite.ts';
import { classifyDay, DAYPART_WINDOWS } from '../src/ask/freeTime.ts';
import { clockOf, occupiedInterval } from '../src/derive/occupancy.ts';
import { restate } from '../src/ask/match.ts';
import type { Answer, AnswerCite, Question } from '../src/ask/types.ts';
import type { Trip } from '../src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASK_DIR = resolve(HERE, '..', 'src', 'ask');

const PLANNED = '2026-08-01';
const OVER = '2026-09-11';

function ctxAt(trip: Trip, today: string) {
  return { trip, today, index: core.COUNTRY_INDEX };
}

// ---------------------------------------------------------------------------------------------
// 1. The grounding law (§11.6) — every answer names the records it read, and every name resolves.
// ---------------------------------------------------------------------------------------------

/**
 * §11.6 clause 2, and the one invariant a breaker should attack first. It runs over **every**
 * member of `askableQuestions(referenceTrip)` at **both** clocks, because a cite that resolves
 * on a planned trip and dangles on a completed one is exactly the shape a single-clock sweep
 * misses.
 */
function everyCiteResolves(trip: Trip, today: string, question: Question, answer: Answer): void {
  const conflicts = core.detectConflicts(trip, { today });
  for (const cite of answer.cites) {
    const hit = resolveCite(trip, cite, conflicts);
    const name = cite.kind === 'city' ? cite.key : cite.id;
    assert.ok(
      hit !== null,
      `${question.kind}: the cite ${cite.kind}:${name} does not resolve in the document the ` +
        'answer claims to be about',
    );
  }
  // A fact's cites are a subset of the answer's — §11.5.
  const all = new Set(answer.cites.map((c) => JSON.stringify(c)));
  for (const f of answer.facts) {
    for (const c of f.cites) {
      assert.ok(all.has(JSON.stringify(c)), `${question.kind}: fact "${f.label}" cites ${JSON.stringify(c)}, which is not in the answer's own cites`);
    }
  }
}

test('§11.6: every cite of every askable question resolves, at both clocks', () => {
  const { trip } = europe2026();
  const menu = core.askableQuestions(trip);
  assert.ok(menu.length > 0, 'the menu is empty, so this sweep asserts nothing');
  let cited = 0;
  for (const today of [PLANNED, OVER]) {
    for (const q of menu) {
      const a = core.ask(q, ctxAt(trip, today));
      assert.equal(a.question.kind, q.kind, 'ask answered a different question from the one it was asked');
      everyCiteResolves(trip, today, q, a);
      cited += a.cites.length;
    }
  }
  assert.ok(cited > 0, 'no answer cited anything');
  // Fireability of the sweep itself: EVERY kind emits at least one cite on this trip.
  for (const kind of ['trip_overview', 'city_edge', 'unbooked', 'country_count', 'free_time']) {
    const q = menu.find((m) => m.kind === kind)!;
    assert.ok(q, `the menu has no ${kind}`);
    for (const today of [PLANNED, OVER]) {
      assert.ok(core.ask(q, ctxAt(trip, today)).cites.length > 0, `${kind} cited nothing at ${today}`);
    }
  }
});

test('N1 (injected, SHOWN TO FIRE): a minted cite for a stop that does not exist reddens, naming the kind and the cite', () => {
  const { trip } = europe2026();
  const q = core.askableQuestions(trip).find((m) => m.kind === 'city_edge')!;
  const real = core.ask(q, ctxAt(trip, PLANNED));
  everyCiteResolves(trip, PLANNED, q, real);   // the real answer passes

  const bogus: AnswerCite = { kind: 'stop', id: 'no-such-stop' };
  const faulty: Answer = { ...real, cites: [...real.cites, bogus] };
  let message = '';
  assert.throws(
    () => {
      try { everyCiteResolves(trip, PLANNED, q, faulty); } catch (e) { message = (e as Error).message; throw e; }
    },
    /does not resolve/,
  );
  assert.match(message, /city_edge/, 'the failure does not name the question kind');
  assert.match(message, /stop:no-such-stop/, 'the failure does not name the cite');
});

test('§11.6 clause 3: a re-published conflict is cited by id and its subjects are never copied', () => {
  const { trip } = europe2026();
  const a = core.ask({ kind: 'unbooked' }, ctxAt(trip, PLANNED));
  const ids = new Set(core.detectConflicts(trip, { today: PLANNED }).map((c) => c.id));
  const conflictCites = a.cites.filter((c) => c.kind === 'conflict');
  assert.ok(conflictCites.length >= 12, `only ${conflictCites.length} conflict cites`);
  for (const c of conflictCites) assert.ok(ids.has(c.id as string), `${c.id} is not a conflict this call computed`);
  // `subjects` is a rule's internal bookkeeping; `ask` is not a second reader of it. The
  // unbooked answer's own cites are conflicts and the trip, and nothing else.
  const kinds = new Set(a.cites.map((c) => c.kind));
  assert.deepEqual([...kinds].sort(), ['conflict', 'trip'], 'unbooked cites something other than the conflicts it republished');
});

// ---------------------------------------------------------------------------------------------
// 2. `city_edge` and the two-city day (§11.7 rule 4)
// ---------------------------------------------------------------------------------------------

test('"when do I leave Vienna" is right about a two-city day', () => {
  const { trip } = europe2026();
  const a = core.ask({ kind: 'city_edge', cityKey: 'vienna', edge: 'leave' }, ctxAt(trip, PLANNED));
  const day = a.facts.find((f) => f.label === 'departure_day')!;
  assert.equal(day.value, '2026-08-10', 'the answer is not the LAST day Vienna occupies');
  assert.deepEqual(
    trip.days.find((d) => d.id === '2026-08-10')!.cities,
    ['vienna', 'dubrovnik'],
    'the fixture no longer has the two-city day this criterion is about',
  );
  const stop = a.facts.find((f) => f.label === 'departure_stop')!;
  assert.equal(stop.value, '05:00', 'the cited evidence is not the day\'s first travelRole:journey stop');
  assert.equal(a.coverage, 'complete');
  assert.ok(a.cites.some((c) => c.kind === 'city' && c.key === 'vienna'));
  assert.ok(a.cites.some((c) => c.kind === 'day' && c.id === '2026-08-10'));
  assert.ok(a.text.includes('2026-08-10'), 'the date is not in the sentence');
});

test('N2 (injected, SHOWN TO FIRE): taking the FIRST day of the city range reddens with 2026-08-08', () => {
  const { trip } = europe2026();
  const days = trip.days.filter((d) => d.cities.includes('vienna'));
  const check = (date: string) => assert.equal(date, '2026-08-10', 'leave is the LAST day the city occupies');
  check(days[days.length - 1].date);                                // what ask does
  assert.throws(() => check(days[0].date), /2026-08-08/);           // what the fault does
});

test('§11.7 rule 4: an edge day with no journey stop answers the date alone, partial, with a caveat', () => {
  const { trip } = europe2026();
  // Declared unfireable on the reference trip's own cities and then MADE fireable by a fixture:
  // every one of the six cities' edge days carries a journey stop, so this arm needs a document.
  const stripped: Trip = {
    ...trip,
    days: trip.days.map((d) =>
      d.id === '2026-08-10'
        ? { ...d, stops: d.stops.map((s) => ({ ...s, travelRole: 'transfer' as const })) }
        : d,
    ),
  };
  const a = core.ask({ kind: 'city_edge', cityKey: 'vienna', edge: 'leave' }, ctxAt(stripped, PLANNED));
  assert.equal(a.coverage, 'partial');
  assert.deepEqual(a.caveats.map((c) => c.code), ['no_departure_stop']);
  assert.equal(a.facts.find((f) => f.label === 'departure_stop'), undefined);
  const complete = core.ask({ kind: 'city_edge', cityKey: 'vienna', edge: 'leave' }, ctxAt(trip, PLANNED));
  assert.notEqual(a.text, complete.text, 'a partial city_edge reads exactly like a complete one');
});

test('city_edge over a city the trip has no days for is `none`, not a guess', () => {
  const { trip } = europe2026();
  const a = core.ask({ kind: 'city_edge', cityKey: 'atlantis', edge: 'arrive' }, ctxAt(trip, PLANNED));
  assert.equal(a.coverage, 'none');
  assert.deepEqual(a.caveats.map((c) => c.code), ['no_records']);
  assert.equal(a.facts.every((f) => f.value === null || typeof f.value === 'string'), true);
});

// ---------------------------------------------------------------------------------------------
// 3. `unbooked` — one definition, and it states its horizon (§11.4)
// ---------------------------------------------------------------------------------------------

test('"what\'s still unbooked" republishes the existing definition: 12 at 2026-08-01, 0 at 2026-09-11', () => {
  const { trip } = europe2026();
  const sel = (today: string) =>
    core.detectConflicts(trip, { today }).filter((c) => c.kind === 'coverage' && !c.resolution);
  assert.equal(sel(PLANNED).length, 12, 'the fixture no longer measures 12 — re-derive the criterion');
  assert.equal(sel(OVER).length, 0);

  const planned = core.ask({ kind: 'unbooked' }, ctxAt(trip, PLANNED));
  assert.equal(planned.facts.find((f) => f.label === 'unbooked_count')!.value, 12);
  assert.equal(planned.facts.find((f) => f.label === 'unbooked_ticketed_count')!.value, 10);
  assert.equal(planned.facts.find((f) => f.label === 'missing_lodging_count')!.value, 2);
  assert.equal(planned.facts.filter((f) => f.label === 'unbooked_item').length, 12);
  assert.ok(planned.text.includes('60'), 'the horizon is not stated');
  assert.ok(planned.caveats.some((c) => c.code === 'feasibility_horizon'));

  const over = core.ask({ kind: 'unbooked' }, ctxAt(trip, OVER));
  assert.equal(over.facts.find((f) => f.label === 'unbooked_count')!.value, 0);
  assert.equal(core.lifecycle(trip, OVER), 'completed');
});

test('N3 (injected, SHOWN TO FIRE): rendering the empty case as "nothing is unbooked" reddens the completed arm', () => {
  const { trip } = europe2026();
  const over = core.ask({ kind: 'unbooked' }, ctxAt(trip, OVER));
  const check = (text: string) => {
    assert.doesNotMatch(
      text,
      /nothing is unbooked/i,
      'a completed trip reporting "nothing is unbooked" states a clean bill of health the ' +
        'feasibility gate cannot support (§11.4)',
    );
    assert.match(text, /over|already taken/i, 'the sentence does not say WHY the list is empty');
  };
  check(over.text);
  assert.throws(() => check('Nothing is unbooked.'), /nothing is unbooked/i);
});

// ---------------------------------------------------------------------------------------------
// 4. `free_time` — three-valued, and `unknown` is the honest answer on this trip (§11.7 rule 3)
// ---------------------------------------------------------------------------------------------

test('the measurement this design rests on: 0 of 143 stops state a durationMins, and 91 of 112 state no run length at all', () => {
  const { trip } = europe2026();
  const all = [...trip.days.flatMap((d) => d.stops), ...trip.pool];
  assert.equal(all.length, 143);
  assert.equal(all.filter((s) => s.durationMins === null).length, 143);
  // A-96 Part 1: the other 21 DO state one, in `arrival.mins`, and reading it is not a default.
  const scheduled = trip.days.flatMap((d) => d.stops);
  assert.equal(scheduled.filter((s) => s.travelRole === 'journey' && s.arrival).length, 21);
  assert.equal(
    scheduled.filter((s) => s.placement.kind === 'scheduled' && s.placement.time === null).length,
    0,
    '0 of 112 scheduled stops carry a null time',
  );
});

/**
 * **The flagship answer, and the `[stated]` oracle for `I-37`** (§11.7 rule 3, A-96 Parts 3–4).
 * Revision 77 answered *"I can't tell … 28 stops … say nothing about how long they take"* over
 * evidence the document carries: 8 of those 28 are journeys that state their run, and the 14th's
 * 17:15 bus runs 80 minutes into the evening window. **N1, injected, SHOWN TO FIRE**: delete that
 * stop's `arrival` and the 14th falls back to `unknown`, `coverage` drops and the sentence
 * changes to the *"I can't tell"* arm.
 */
test('"do I have a free evening in Split" is a confident No, and it names the bus — N1 (injected, SHOWN TO FIRE)', () => {
  const { trip } = europe2026();
  const q: Question = { kind: 'free_time', part: 'evening', cityKey: 'split' };
  const a = core.ask(q, ctxAt(trip, PLANNED));
  const state = (x: Answer, date: string) => x.facts.find((f) => f.label === 'day_state' && f.params.date === date)!.value;
  for (const d of ['2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15']) assert.equal(state(a, d), 'busy');
  assert.equal(a.coverage, 'complete');
  assert.deepEqual(a.caveats, [], 'a complete answer carries a caveat — §11.5 defines one as why an answer is NOT complete');
  assert.match(a.text, /^No\./, 'the flagship answer is not the confident No the document supports');
  assert.ok(a.text.includes('18:35'), 'the sentence does not say how far the journey runs into the evening');
  assert.ok(a.text.includes('bus'), 'the sentence does not say what the occupying journey is');
  // The census moves with the verdicts: 20 of 28, not 28 (A-96 Part 4).
  const census = a.facts.find((f) => f.label === 'stops_without_occupancy')!;
  assert.deepEqual(census.params, { stops: 20, of: 28, days: 4 });
  assert.ok(a.text.includes('20 of the 28'), 'the sentence still reports the old, wrong census');
  // The occupying stop is cited — the 14th's 17:15 journey with `arrival.mins` 80.
  const bus = trip.days.find((d) => d.id === '2026-08-14')!.stops
    .find((s) => s.placement.kind === 'scheduled' && s.placement.time === '17:15')!;
  assert.equal(bus.arrival!.mins, 80);
  assert.ok(a.cites.some((c) => c.kind === 'stop' && c.id === bus.id), 'the answer does not cite the stop that decided it');

  // N1: the same document with that one `arrival` removed.
  const blinded: Trip = {
    ...trip,
    days: trip.days.map((d) =>
      d.id === '2026-08-14' ? { ...d, stops: d.stops.map((s) => (s.id === bus.id ? { ...s, arrival: null } : s)) } : d,
    ),
  };
  const fell = core.ask(q, ctxAt(blinded, PLANNED));
  assert.equal(state(fell, '2026-08-14'), 'unknown', 'the fault did not produce the state it is supposed to produce');
  assert.equal(fell.coverage, 'partial');
  assert.match(fell.text, /can'?t tell|cannot tell/i);
  assert.ok(fell.caveats.some((c) => c.code === 'duration_unknown'));
  assert.notEqual(fell.text, a.text, 'a partial answer reads exactly like the complete one');
});

/**
 * **QA R70-2.** `free_time` rendered the confident **"Yes."** arm at `coverage: 'complete'` while
 * separately carrying a `time_unknown` caveat whose own message said the untimed stops *"could
 * not be placed in or out of the window"* — confident and honest disagreeing inside one `Answer`,
 * with `coverage` wrong in the only direction that matters. A stop that cannot be placed on the
 * clock is now a hole in the **verdict**, which is the field a surface branches on.
 */
test('R70-2: a `time_unknown` caveat never sits beside a complete Yes or No', () => {
  const { trip } = europe2026();
  // R70-2's own document: every stop states a duration, and one scheduled stop on the 14th
  // states no time. Revision 77 answered "Yes." about a day carrying a stop it cannot place.
  const seeded: Trip = {
    ...trip,
    days: trip.days.map((d) =>
      d.id === '2026-08-14'
        ? {
            ...d,
            stops: d.stops.map((s, i) => {
              const stated = { ...s, durationMins: 30, arrival: null, travelRole: 'transfer' as const };
              return i === 0 && stated.placement.kind === 'scheduled'
                ? { ...stated, placement: { ...stated.placement, time: null } }
                : stated;
            }),
          }
        : d,
    ),
  };
  const a = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctxAt(seeded, PLANNED));
  const fourteenth = a.facts.find((f) => f.label === 'day_state' && f.params.date === '2026-08-14')!;
  assert.equal(fourteenth.value, 'unknown', 'a day carrying a stop that cannot be placed was judged anyway');
  assert.equal(a.coverage, 'partial');
  assert.ok(a.caveats.some((c) => c.code === 'time_unknown'));
  assert.doesNotMatch(a.text, /^Yes\.|^No\./, 'a confident verdict was rendered over an unresolvable hole');

  // The invariant, over the whole menu of both documents and both clocks.
  for (const doc of [trip, seeded]) {
    for (const today of [PLANNED, OVER]) {
      for (const q of core.askableQuestions(doc)) {
        const ans = core.ask(q, ctxAt(doc, today));
        if (ans.caveats.some((c) => c.code === 'time_unknown')) {
          assert.notEqual(ans.coverage, 'complete', `${q.kind}: time_unknown on a complete answer`);
          assert.doesNotMatch(ans.text, /^Yes\.|^No\./, `${q.kind}: time_unknown beside a confident verdict`);
        }
      }
    }
  }
});

/**
 * **QA R70-8** — the `unknown` arm offered the day's **day-wide** latest start as the reason it
 * could not judge the asked window, so it named a time *after* that window: *"On 2026-08-07,
 * nothing starts after 16:45"* about the 05:00–11:59 morning.
 */
test('R70-8: the unknown arm never quotes a time that falls after the window it is explaining', () => {
  const { trip } = europe2026();
  for (const part of ['morning', 'afternoon', 'evening'] as const) {
    const a = core.ask({ kind: 'free_time', part, cityKey: null }, ctxAt(trip, PLANNED));
    const to = DAYPART_WINDOWS[part].to;
    for (const f of a.facts.filter((x) => x.label === 'day_state' && x.value === 'unknown')) {
      const quoted = String(f.params.lastStartBeforeWindow);
      if (quoted === '') continue;
      assert.ok(quoted < DAYPART_WINDOWS[part].from, `${f.params.date}: ${quoted} is not before the ${part} window`);
    }
    // and nothing after the window's end reaches the sentence.
    for (const m of a.text.matchAll(/\b([0-2]\d:[0-5]\d)\b/g)) {
      assert.ok(m[1] <= to, `the ${part} answer quotes ${m[1]}, which is after its own window`);
    }
  }
  const morning = core.ask({ kind: 'free_time', part: 'morning', cityKey: null }, ctxAt(trip, PLANNED));
  assert.ok(!morning.text.includes('16:45'), 'R70-8 has not moved: a 16:45 start is still evidence about the morning');
});

/**
 * **QA R70-9** — the no-days arm hard-coded *"not a free evening"* for all three dayparts.
 * **QA R70-10** — a day with zero stops is `open`, and the justification clause claimed *"every
 * stop on that day states how long it takes"*: a positive statement about stops that do not exist.
 */
test('R70-9 / R70-10: the sentence names the daypart asked for, and never describes stops that do not exist', () => {
  const { trip } = europe2026();
  const withCity: Trip = { ...trip, cities: [...trip.cities, { key: 'lisbon', name: 'Lisbon', order: 99 } as never] };
  for (const part of ['morning', 'afternoon', 'evening'] as const) {
    const a = core.ask({ kind: 'free_time', part, cityKey: 'lisbon' }, ctxAt(withCity, PLANNED));
    assert.equal(a.coverage, 'none');
    const others = (['morning', 'afternoon', 'evening'] as const).filter((p) => p !== part);
    for (const other of others) assert.ok(!a.text.includes(other), `the ${part} answer talks about the ${other}`);
  }
  // R70-10: an unplanned day. `open` is the honest verdict; the reason is that nothing is
  // recorded, not that every stop states its length.
  const unplanned: Trip = {
    ...trip,
    days: trip.days.map((d) => (d.id === '2026-08-14' ? { ...d, stops: [] } : d)),
  };
  const a = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctxAt(unplanned, PLANNED));
  const day = a.facts.find((f) => f.label === 'day_state' && f.params.date === '2026-08-14')!;
  assert.equal(day.value, 'open');
  assert.equal(day.params.stopsOnDay, 0);
  assert.match(a.text, /no stops at all/, 'the empty day is not described as empty');
  assert.ok(
    !/2026-08-14[^.]*states how long/.test(a.text),
    'the sentence makes a positive claim about stops that do not exist (R70-10)',
  );
});

/**
 * **The 48-verdict sweep — `I-37`'s headline criterion and A-96 Part 4's table**, measured over
 * the whole population rather than the flagship day (§0 position 12 (b)). Revision 77 returned
 * **44 busy / 0 open / 4 unknown**; exactly two verdicts move, both `unknown` → `busy`, both
 * because a journey's stated run reaches into the window. **A ceiling, not a floor**: this names
 * every cell that is not `busy`, so a third mover reddens it.
 */
test('A-96 Part 4: all 16 days × 3 dayparts classify 46 busy / 0 open / 2 unknown', () => {
  const { trip } = europe2026();
  const parts = ['morning', 'afternoon', 'evening'] as const;
  const rows = trip.days.flatMap((d) => parts.map((p) => ({ date: d.date, part: p, state: classifyDay(d, p).state })));
  assert.equal(rows.length, 48);
  const count = (s: string) => rows.filter((r) => r.state === s).length;
  assert.equal(count('busy'), 46);
  assert.equal(count('open'), 0);
  assert.equal(count('unknown'), 2);
  assert.deepEqual(
    rows.filter((r) => r.state !== 'busy').map((r) => `${r.date} ${r.part}`),
    ['2026-08-07 morning', '2026-08-08 morning'],
    'a cell moved that A-96 Part 4 did not measure moving — stop and report (I-37 stop-and-report (a))',
  );
});

test('NOT ONE day of this trip returns `open`, at any daypart — N5 (injected, SHOWN TO FIRE)', () => {
  const { trip } = europe2026();
  const parts = ['morning', 'afternoon', 'evening'] as const;
  const sweep = (classify: (day: typeof trip.days[number], part: typeof parts[number]) => string) =>
    trip.days.flatMap((d) => parts.map((p) => ({ date: d.date, part: p, state: classify(d, p) })));
  const check = (rows: Array<{ date: string; part: string; state: string }>) => {
    const open = rows.filter((r) => r.state === 'open');
    assert.deepEqual(
      open,
      [],
      'a day returned `open` on a trip where 91 of 112 scheduled stops state no run length — a ' +
        'default duration has been invented somewhere (§11.7 rule 3)',
    );
  };
  check(sweep((d, p) => classifyDay(d, p).state));

  // N5's fault, implemented: default a null duration to any constant. 60 here; any number does.
  const faulty = (day: typeof trip.days[number], part: typeof parts[number]) => {
    const w = DAYPART_WINDOWS[part];
    const starts = day.stops.filter(
      (s) => s.placement.kind === 'scheduled' && s.placement.time !== null && s.placement.time >= w.from && s.placement.time <= w.to,
    );
    if (starts.length > 0) return 'busy';
    return day.stops.every((s) => (s.durationMins ?? 60) !== null) ? 'open' : 'unknown';
  };
  const faultyRows = sweep(faulty);
  assert.ok(
    faultyRows.some((r) => r.date === '2026-08-14' && r.part === 'evening' && r.state === 'open'),
    'the fault did not even produce the state it is supposed to produce',
  );
  assert.throws(() => check(faultyRows), /`open`/);
});

/**
 * The `open` arm is **unfireable against the reference trip — 0 of 48 before this ruling and 0 of
 * 48 after** (A-96 Part 5, criterion rule 9): the legacy planner recorded no durations, so every
 * day carries at least one stop that states none. It is held instead by a document that does
 * state them — a real `Trip` driven through the real `ask`, not an assertion about an assertion.
 */
test('N4 (injected, SHOWN TO FIRE): give the 14th\'s stops a durationMins and the day flips `busy` → `open`', () => {
  const { trip } = europe2026();
  const fixed: Trip = {
    ...trip,
    days: trip.days.map((d) =>
      d.id === '2026-08-14' ? { ...d, stops: d.stops.map((s) => ({ ...s, durationMins: 45 })) } : d,
    ),
  };
  const q: Question = { kind: 'free_time', part: 'evening', cityKey: 'split' };
  const before = core.ask(q, ctxAt(trip, PLANNED));
  const after = core.ask(q, ctxAt(fixed, PLANNED));
  const state = (a: Answer, date: string) => a.facts.find((f) => f.label === 'day_state' && f.params.date === date)!.value;
  // 17:15 + 80 reaches 18:35 and the evening is busy; 17:15 + a stated 45 ends AT 18:00, which
  // the window does not contain — a stated run is half-open at its end, exactly as `overlap`
  // compares two runs.
  assert.equal(state(before, '2026-08-14'), 'busy');
  assert.equal(state(after, '2026-08-14'), 'open', 'the fault did not flip the day');
  assert.equal(after.coverage, 'complete');
  assert.match(after.text, /^Yes\./);
  assert.notEqual(before.text, after.text, 'the sentence did not change when the answer did');
});

test('N6 (injected, SHOWN TO FIRE): a partial answer does not read like a complete one', () => {
  const { trip } = europe2026();
  // The partial case: the 14th's 17:15 journey stops stating its run, so the day cannot be judged.
  const blinded: Trip = {
    ...trip,
    days: trip.days.map((d) =>
      d.id === '2026-08-14'
        ? { ...d, stops: d.stops.map((s) => (s.placement.kind === 'scheduled' && s.placement.time === '17:15' ? { ...s, arrival: null } : s)) }
        : d,
    ),
  };
  const q: Question = { kind: 'free_time', part: 'evening', cityKey: 'split' };
  const partial = core.ask(q, ctxAt(blinded, PLANNED));
  const complete = core.ask(q, ctxAt(trip, PLANNED));
  assert.equal(partial.coverage, 'partial');
  assert.equal(complete.coverage, 'complete');
  const check = (a: Answer, b: Answer) =>
    assert.notEqual(a.text, b.text, 'a `coverage` field nothing renders is a field that lies by omission');
  check(partial, complete);
  // The fault: render `text` without consulting `coverage` — the same sentence for both.
  assert.throws(() => check(partial, { ...complete, text: partial.text }), /lies by omission/);
});

test('§11.7 rule 5: `StopFlag \'free\'` means free of CHARGE and nothing in free_time reads it', () => {
  const { trip } = europe2026();
  const flagged = [...trip.days.flatMap((d) => d.stops), ...trip.pool].filter((s) => s.flags.includes('free'));
  assert.equal(flagged.length, 21, 'the fixture no longer carries the trap this criterion is about');
  const src = readdirSync(ASK_DIR).map((f) => readFileSync(resolve(ASK_DIR, f), 'utf8')).join('\n');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\.flags/, '`ask/` reads Stop.flags — the legacy badge:"free" is not free TIME');
});

test('free_time over a city with no days is `none`, and a null time is a caveat rather than a guess', () => {
  const { trip } = europe2026();
  const none = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'atlantis' }, ctxAt(trip, PLANNED));
  assert.equal(none.coverage, 'none');
  assert.deepEqual(none.caveats.map((c) => c.code), ['no_records']);

  // `time_unknown` is UNFIREABLE on the reference trip — 0 of 112 scheduled stops carry a null
  // time — so it is fired here against a document that does.
  const blind: Trip = {
    ...trip,
    days: trip.days.map((d) =>
      d.id === '2026-08-14'
        ? {
            ...d,
            stops: d.stops.map((s) =>
              s.placement.kind === 'scheduled' ? { ...s, placement: { ...s.placement, time: null } } : s,
            ),
          }
        : d,
    ),
  };
  const a = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctxAt(blind, PLANNED));
  assert.ok(a.caveats.some((c) => c.code === 'time_unknown'), 'a scheduled stop with no time is silently ignored');
});

// ---------------------------------------------------------------------------------------------
// 5. `country_count` — the count, its denominator, and evidence pinned to it (§11.6 clause 4)
// ---------------------------------------------------------------------------------------------

test('country_count reports 7 with its census, and the evidence walk agrees with tripSummary', () => {
  const { trip } = europe2026();
  const row = core.tripSummary(trip, core.COUNTRY_INDEX);
  assert.deepEqual(row.countryCodes, ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU', 'US']);
  const a = core.ask({ kind: 'country_count' }, ctxAt(trip, PLANNED));
  assert.equal(a.facts.find((f) => f.label === 'country_count')!.value, 7);
  const codes = a.facts.filter((f) => f.label === 'country_code').map((f) => f.value);
  assert.deepEqual(codes, [...row.countryCodes], 'the evidence walk\'s code set is not the row\'s');
  const census = a.facts.find((f) => f.label === 'place_census')!;
  assert.deepEqual(census.params, { seen: 95, located: 94, attributed: 91 });
  const stops = a.facts.find((f) => f.label === 'stop_census')!;
  assert.deepEqual(stops.params, { seen: 143, located: 132, attributed: 128 });
  assert.equal(a.coverage, 'partial', '3 places and 4 stops could not be placed; that is a hole and it is reported');
  assert.ok(a.caveats.some((c) => c.code === 'unattributed_records'));
  // DE (a Frankfurt layover) and US (departure) are each explained by a cited record.
  for (const code of ['DE', 'US']) {
    const f = a.facts.find((x) => x.label === 'country_code' && x.value === code)!;
    assert.ok(f.cites.length > 0, `${code} is on the list with no receipt`);
  }
});

/**
 * **N7 as ROADMAP `I-35` states it is UNFIREABLE on this trip, and this is the declaration §0
 * position 5 (b) requires.** Measured here: the 31 pooled stops resolve to `{AT, CZ, GB, HR, HU}`,
 * every one of which the scheduled stops and places already carry, so *dropping the pool from the
 * evidence walk does not change the code set* and a set-equality assertion cannot see it.
 *
 * The criterion is therefore strengthened to the thing the pool DOES move — the **record count
 * behind each code** — and the fault is shown to fire against that.
 */
test('N7 (injected, SHOWN TO FIRE against the strengthened form; the stated form is declared unfireable)', () => {
  const { trip } = europe2026();
  const codeOf = (s: { at: core.LatLng | null }) => (s.at ? core.countryOf(s.at, core.COUNTRY_INDEX) : null);
  const poolCodes = new Set(
    trip.pool.map((s) => core.stopLatLng(s, trip)).filter((p) => p !== null).map((p) => core.countryOf(p!, core.COUNTRY_INDEX)).filter((c) => c !== null),
  );
  const restCodes = new Set<string>();
  for (const p of trip.places) { const c = codeOf(p); if (c) restCodes.add(c); }
  for (const s of trip.days.flatMap((d) => d.stops)) {
    const at = core.stopLatLng(s, trip);
    const c = at ? core.countryOf(at, core.COUNTRY_INDEX) : null;
    if (c) restCodes.add(c);
  }
  for (const c of poolCodes) {
    assert.ok(restCodes.has(c as string), `the pool contributes ${c} uniquely — the stated N7 is fireable after all, re-derive this`);
  }

  // The strengthened criterion: per-code record counts, which the pool does move.
  const a = core.ask({ kind: 'country_count' }, ctxAt(trip, PLANNED));
  const counts = Object.fromEntries(
    a.facts.filter((f) => f.label === 'country_code').map((f) => [f.value, f.params.recordCount]),
  );
  const check = (c: Record<string, unknown>) =>
    assert.deepEqual(c, { AT: 35, HR: 59, CZ: 60, HU: 45, GB: 16, US: 2, DE: 2 }, 'the evidence walk no longer covers every record class');
  check(counts);
  assert.throws(() => check({ AT: 29, HR: 55, CZ: 52, HU: 44, GB: 15, US: 2, DE: 2 }), /evidence walk/);
});

// ---------------------------------------------------------------------------------------------
// 6. The recogniser — four refusals and one match (§11.3)
// ---------------------------------------------------------------------------------------------

test('matchQuestion matches "when do I leave vienna", and reports what it did not read', () => {
  const { trip } = europe2026();
  const m = core.matchQuestion('when do I leave Vienna', trip);
  assert.equal(m.kind, 'matched');
  if (m.kind !== 'matched') return;
  assert.deepEqual(m.question, { kind: 'city_edge', cityKey: 'vienna', edge: 'leave' });
  assert.match(m.restatement, /leave Vienna/i);
  const long = core.matchQuestion('when do I leave Vienna for good', trip);
  assert.equal(long.kind, 'matched');
  if (long.kind !== 'matched') return;
  assert.deepEqual(long.unread, ['when', 'do', 'i', 'for', 'good'], '§11.3 rule 2: unread is reported, not discarded');
});

test('N8 (injected, SHOWN TO FIRE): the lifetime scope is refused by name, never answered with 7', () => {
  const { trip } = europe2026();
  const check = (m: core.MatchOutcome) => {
    assert.equal(m.kind, 'out_of_scope', 'a lifetime-scoped question was not refused');
    if (m.kind !== 'out_of_scope') return;
    assert.equal(m.reason, 'lifetime');
    assert.match(m.pointer, /stats/, 'the refusal does not point at travelStats');
  };
  for (const text of [
    'how many countries have I been to',
    'how many countries have I visited in total',
    'how many countries ever',
    'how many countries across all my trips',
  ]) check(core.matchQuestion(text, trip));
  // Trip scope still answers — the two differ by one word and by an entire data set.
  const trip_scoped = core.matchQuestion('how many countries am I visiting', trip);
  assert.equal(trip_scoped.kind, 'matched');
  // The fault: let the lifetime pattern fall through to `country_count`.
  assert.throws(() => check({ kind: 'matched', question: { kind: 'country_count' }, restatement: 'x', params: {}, unread: [] }), /not refused/);
});

/**
 * **QA R70-5.** The lifetime refusal was a six-phrase literal list, so *"how many countries have
 * I visited"* — one verb away from the phrase that IS on the list — was answered **"This trip
 * accounts for 7 countries"**. §11.3 rule 3 names the *class*, a past-tense first-person frame,
 * and that is what the recogniser now asks for.
 */
test('R70-5: the lifetime scope is a CLASS, not six phrases — five more phrasings refuse', () => {
  const { trip } = europe2026();
  const refused = (text: string) => {
    const m = core.matchQuestion(text, trip);
    assert.equal(m.kind, 'out_of_scope', `answered against THIS trip instead of refusing: "${text}"`);
    if (m.kind !== 'out_of_scope') return;
    assert.equal(m.reason, 'lifetime');
    assert.match(m.pointer, /stats/);
  };
  for (const text of [
    'how many countries have I visited',
    'how many countries have I seen',
    'how many countries have I stayed in',
    'which countries have I visited',
    'how many countries did I visit',
    'how many countries total',
    // the original six still refuse — the class contains them
    'how many countries have I been to',
    'how many countries ever',
    'how many countries across all my trips',
  ]) refused(text);

  // The trip-scoped neighbours are NOT swallowed: they differ by one word and by an entire data
  // set, and the refusal is asked first, so a false positive here would cost a real answer.
  for (const text of [
    'how many countries am I visiting',
    'which countries am I visiting',
    'what countries does this trip cover',
    'how many countries on this trip',
  ]) {
    assert.equal(core.matchQuestion(text, trip).kind, 'matched', `the lifetime class swallowed a trip-scoped question: "${text}"`);
  }
  // And it does not reach past `country_count` into the other intents.
  assert.equal(core.matchQuestion('have I booked everything', trip).kind, 'matched');
});

/**
 * **QA R70-6.** *"when do I leave FOR Vienna"* was matched silently as `city_edge{vienna,leave}`,
 * with the preposition that flips the meaning landing in `unread` under a delivered answer. Both
 * readings are expressible in the closed union, so §11.3 rule 1 applies: **two readings is a
 * refusal, never a choice.**
 */
test('R70-6: an edge verb negated by the preposition beside it is ambiguous, not a silent pick', () => {
  const { trip } = europe2026();
  for (const text of ['when do I leave for Vienna', 'when do I depart for Prague', 'when do I arrive from Split']) {
    const m = core.matchQuestion(text, trip);
    assert.equal(m.kind, 'ambiguous', `silently picked one reading of "${text}"`);
    if (m.kind !== 'ambiguous') continue;
    assert.deepEqual(m.readings.map((r) => r.kind === 'city_edge' ? r.edge : r.kind).sort(), ['arrive', 'leave']);
    assert.equal(m.restatements.length, 2);
  }
  // The unprepositioned form still answers — the fix is the preposition, not the verb.
  const plain = core.matchQuestion('when do I leave Vienna', trip);
  assert.equal(plain.kind, 'matched');
  const other = core.matchQuestion('when do I arrive in Vienna', trip);
  assert.equal(other.kind, 'matched');
});

/**
 * **QA R70-7.** `tokenize` kept only `[a-z0-9]+` runs, so a word written in any other script
 * **could not appear in `unread`** — §11.3 rule 2 was unenforceable for exactly the input it was
 * written for, and *"do I have a free evening in Сплит"* was answered about the whole trip with
 * the user's own subject word gone without trace.
 */
test('R70-7: a non-Latin word the recogniser did not read is REPORTED, not deleted', () => {
  const { trip } = europe2026();
  const m = core.matchQuestion('do I have a free evening in 東京', trip);
  assert.equal(m.kind, 'matched');
  if (m.kind !== 'matched') return;
  assert.ok(m.unread.includes('東京'), `the user's own subject word vanished: ${JSON.stringify(m.unread)}`);

  // And the same tokenizer reads the trip's OWN names in that script — one function, both sides.
  const cyrillic: Trip = {
    ...trip,
    cities: trip.cities.map((c) => (c.key === 'split' ? { ...c, name: 'Сплит' } : c)),
  };
  const hit = core.matchQuestion('do I have a free evening in Сплит', cyrillic);
  assert.equal(hit.kind, 'matched');
  if (hit.kind !== 'matched') return;
  assert.deepEqual(hit.question, { kind: 'free_time', part: 'evening', cityKey: 'split' });
  assert.ok(!hit.unread.includes('сплит'), 'the city name was matched and should not be reported unread');
});

test('a recommendation is refused by name — Jacob\'s own fence, made a feature of the recogniser', () => {
  const { trip } = europe2026();
  for (const text of ['where should I eat in Split', 'any bars near the palace', 'what\'s good in Prague', 'recommend a restaurant']) {
    const m = core.matchQuestion(text, trip);
    assert.equal(m.kind, 'out_of_scope', `not refused: ${text}`);
    if (m.kind !== 'out_of_scope') continue;
    assert.equal(m.reason, 'recommendation');
    assert.match(m.pointer, /trip/i);
  }
});

test('two readings is a refusal, never a choice — two intents and two city names', () => {
  const { trip } = europe2026();
  const twoIntents = core.matchQuestion('what does my trip look like and what is still unbooked', trip);
  assert.equal(twoIntents.kind, 'ambiguous');
  if (twoIntents.kind === 'ambiguous') {
    assert.equal(twoIntents.readings.length, 2);
    assert.equal(twoIntents.restatements.length, 2);
    assert.deepEqual(twoIntents.readings.map((r) => r.kind).sort(), ['trip_overview', 'unbooked']);
  }
  const twoCities = core.matchQuestion('when do I leave Vienna and Prague', trip);
  assert.equal(twoCities.kind, 'ambiguous');
  if (twoCities.kind === 'ambiguous') {
    assert.deepEqual(twoCities.readings, [
      { kind: 'city_edge', cityKey: 'vienna', edge: 'leave' },
      { kind: 'city_edge', cityKey: 'prague', edge: 'leave' },
    ]);
  }
  assert.equal(core.matchQuestion('what is the weather like', trip).kind, 'unrecognised');
  assert.equal(core.matchQuestion('', trip).kind, 'unrecognised');
});

test('askableQuestions is the menu, instantiated over the trip\'s own cities, and every member is answerable', () => {
  const { trip } = europe2026();
  const menu = core.askableQuestions(trip);
  const keys = new Set(trip.cities.map((c) => c.key));
  for (const q of menu) {
    if (q.kind === 'city_edge') assert.ok(keys.has(q.cityKey), `${q.cityKey} is not a city of this trip`);
    if (q.kind === 'free_time' && q.cityKey !== null) assert.ok(keys.has(q.cityKey));
  }
  assert.equal(menu.filter((q) => q.kind === 'city_edge').length, trip.cities.length * 2);
  assert.equal(menu.filter((q) => q.kind === 'trip_overview').length, 1);
  // No duplicates: the menu is a set of distinct questions.
  assert.equal(new Set(menu.map((q) => JSON.stringify(q))).size, menu.length);
});

// ---------------------------------------------------------------------------------------------
// 7. Privacy (§11.8) and the ceilings
// ---------------------------------------------------------------------------------------------

test('N9 (injected, SHOWN TO FIRE): nothing sensitive reaches an answer, at both clocks', () => {
  const { trip } = europe2026();
  const check = (text: string) =>
    assert.deepEqual(core.redactionHits(text), [], `a credential-shaped string reached an answer: ${text}`);
  for (const today of [PLANNED, OVER]) {
    for (const q of core.askableQuestions(trip)) {
      const a = core.ask(q, ctxAt(trip, today));
      check(a.text);
      for (const key of Object.keys(a.params)) {
        assert.ok(!['lat', 'lng', 'centre'].includes(key), `params carries a coordinate key: ${key}`);
      }
      for (const f of a.facts) {
        for (const key of Object.keys(f.params)) {
          assert.ok(!['lat', 'lng', 'centre'].includes(key), `fact ${f.label} carries a coordinate key: ${key}`);
        }
      }
    }
  }
  // The fault: interpolate the stop's booking link into the `unbooked` line. **Fireable by
  // construction** — `unbooked_ticketed`'s predicate requires `stop.links.length > 0 ||
  // stop.ticket`, so every stop that answer can name has a link to leak.
  const conflicts = core.detectConflicts(trip, { today: PLANNED }).filter((c) => c.ruleId === 'unbooked_ticketed');
  const stopIds = new Set(conflicts.flatMap((c) => c.subjects.filter((s) => s.kind === 'stop').map((s) => s.id)));
  const named = trip.days.flatMap((d) => d.stops).filter((s) => stopIds.has(s.id));
  assert.ok(named.length > 0 && named.every((s) => (s.links?.length ?? 0) > 0 || !!s.ticket), 'the fault is not fireable by construction after all');
  const leaked = `${core.ask({ kind: 'unbooked' }, ctxAt(trip, PLANNED)).text} ${named[0].links![0].href}`;
  assert.throws(() => check(leaked), /credential-shaped/);
  assert.deepEqual(core.redactionHits(leaked), ['url']);
});

/**
 * **QA R70-4 / §11.8 clause 2 as rewritten by A-96 Part 6.** Revision 77 asserted
 * `redactionHits(answer.text) === []` over the reference trip and called it done — and it held
 * **only because the fixture's own six city names and its title happen to match no pattern**.
 * `title: "Split flat (door code 4821)"` rendered `['keyword_token','keyword_digits']`, a §6.6
 * credential class, straight into prose. A test that passes because of the fixture's spelling is
 * not a guarantee, so this one runs over a **mutated copy** whose title and one city name carry
 * one string per §6.6 pattern class.
 */
function pathological(trip: Trip): Trip {
  return {
    ...trip,
    // one string per §6.6 pattern class, in the two free-text fields revision 77 narrated
    title: 'Split flat (door code 4821) https://tickets.example.com/x me@example.com 000 000 0000 ABCDEF',
    cities: trip.cities.map((c) => (c.key === 'london' ? { ...c, name: 'LONDON' } : c)),
  };
}

test('R70-4: no credential reaches an answer\'s PROSE, and it is a property of the renderer — N3 (injected, SHOWN TO FIRE)', () => {
  const { trip } = europe2026();
  const dirty = pathological(trip);

  // The instrument itself: the unmutated fixture cannot fire this, which is what R70-4 measured.
  assert.deepEqual(core.redactionHits(trip.title), [], '0 of the reference trip\'s own title hits any pattern today');
  for (const c of trip.cities) assert.deepEqual(core.redactionHits(c.name), [], `${c.key} already hits a pattern`);
  assert.notDeepEqual(core.redactionHits(dirty.title), [], 'the mutated title is not actually credential-shaped');
  assert.deepEqual(core.redactionHits(dirty.cities.find((c) => c.key === 'london')!.name), ['alnum_reference']);

  // **§11.8 clause 2 as widened in place by §11.12 A-97 Part 7 (QA R71-5).** The guarantee is
  // over **every string `ask/` composes that a surface prints as prose** — `answer.text`, every
  // `caveat.message`, **and `restatement`**. `I-37`'s builder extended the chokepoint to
  // `restate()` and shipped it **unguarded**: reverting it left the suite at 1,945 pass / 0 fail.
  const check = (doc: Trip) => {
    let answers = 0;
    for (const today of [PLANNED, OVER]) {
      for (const q of core.askableQuestions(doc)) {
        const a = core.ask(q, ctxAt(doc, today));
        assert.deepEqual(core.redactionHits(a.text), [], `${q.kind}: a credential-shaped string reached the prose: ${a.text}`);
        for (const cav of a.caveats) {
          assert.deepEqual(core.redactionHits(cav.message), [], `${q.kind}: a credential-shaped string reached caveat ${cav.code}`);
        }
        const said = restate(q, doc);
        assert.deepEqual(core.redactionHits(said), [], `${q.kind}: a credential-shaped string reached the restatement: ${said}`);
        answers += 1;
      }
    }
    assert.ok(answers > 0, 'the sweep asserted nothing');
  };
  check(trip);
  check(dirty);

  // The chokepoint is real: the title is in `params` and in a fact, and NOT in the sentence.
  const overview = core.ask({ kind: 'trip_overview' }, ctxAt(dirty, PLANNED));
  assert.equal(overview.params.title, dirty.title, 'the structured half stopped carrying the document\'s own value');
  assert.equal(overview.facts.find((f) => f.label === 'trip_title')!.value, dirty.title);
  assert.ok(!overview.text.includes('4821'), 'the title is still narrated');

  // N3, injected: the fault is the city-name path bypassing the chokepoint. Rendered here as the
  // same three sentences built from the RAW name, which is what removing it would produce.
  const raw = dirty.cities.find((c) => c.key === 'london')!.name;
  for (const kind of ['trip_overview', 'city_edge', 'free_time']) {
    const q = core.askableQuestions(dirty).find((m) =>
      m.kind === kind && (m.kind !== 'city_edge' ? true : m.cityKey === 'london'))!;
    const a = core.ask(q, ctxAt(dirty, PLANNED));
    const bypassed = `${a.text} ${raw}`;
    assert.deepEqual(core.redactionHits(bypassed), ['alnum_reference'], `${kind}: the fault does not produce the hit it claims`);
    assert.throws(
      () => assert.deepEqual(core.redactionHits(bypassed), [], 'a credential-shaped string reached the prose'),
      /credential-shaped/,
    );
  }
  // And the redacted city still identifies its subject — A-96 Part 8 residue 2.
  const edge = core.ask({ kind: 'city_edge', cityKey: 'london', edge: 'leave' }, ctxAt(dirty, PLANNED));
  assert.equal(edge.params.cityKey, 'london');
  assert.ok(edge.text.includes('[redacted]'), 'an ALL-CAPS city name renders as poor prose, never as a leak');

  // **The second injected fault, A-97 Part 7's own: revert `restate()` to the raw `cityName`.**
  // It reddens on `city_edge` and `free_time`, which are the two arms whose restatement names a
  // city at all. Rendered here as the same restatements built from the raw name, which is what
  // removing the chokepoint from that path would produce.
  const cityName = (t: Trip, key: string) => t.cities.find((c) => c.key === key)!.name;
  const rawRestatements = [
    `when you leave ${cityName(dirty, 'london')}`,
    `when you arrive in ${cityName(dirty, 'london')}`,
    `whether you have a free evening in ${cityName(dirty, 'london')}`,
  ];
  for (const said of rawRestatements) {
    assert.deepEqual(core.redactionHits(said), ['alnum_reference'], `the fault does not produce the hit it claims: ${said}`);
    assert.throws(
      () => assert.deepEqual(core.redactionHits(said), [], 'a credential-shaped string reached the restatement'),
      /credential-shaped/,
    );
  }
  // The shipped restatements of the same three questions carry the hit nowhere.
  for (const q of [
    { kind: 'city_edge', cityKey: 'london', edge: 'leave' },
    { kind: 'city_edge', cityKey: 'london', edge: 'arrive' },
    { kind: 'free_time', part: 'evening', cityKey: 'london' },
  ] as Question[]) {
    assert.deepEqual(core.redactionHits(restate(q, dirty)), [], `the restatement of ${q.kind} leaks the raw name`);
    assert.ok(restate(q, dirty).includes('[redacted]'), `${q.kind}: the restatement does not name its subject at all`);
  }
});

test('R70-4: one chokepoint — nothing in ask/ interpolates a record\'s free text into prose except through it', () => {
  const src = readdirSync(ASK_DIR)
    .filter((f) => f.endsWith('.ts') && f !== 'prose.ts')
    .map((f) => [f, readFileSync(resolve(ASK_DIR, f), 'utf8')] as const);
  for (const [name, text] of src) {
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    // The inadmissible set of A-96 Part 6, as it would appear in a template literal.
    for (const banned of ['${trip.title}', '${stop.name}', '${s.name}', '${place.name}', '${p.name}', '${c.summary}', '${stop.note}']) {
      assert.equal(code.includes(banned), false, `ask/${name} narrates ${banned} — A-96 Part 6 admits only City.name`);
    }
  }
  // And `redactText` is reached in exactly one place inside `ask/`.
  const importers = readdirSync(ASK_DIR).filter((f) => readFileSync(resolve(ASK_DIR, f), 'utf8').includes("from '../build/redactText.ts'"));
  assert.deepEqual(importers, ['prose.ts'], 'the redaction chokepoint has more than one door');
});

/**
 * **QA R70-1.** `trip_overview`'s empty arm fired when **either** count was zero and always
 * rendered *"no days and no cities"*, contradicting the `day_count`/`city_count` facts printed
 * four lines below it in the same `Answer` — and labelled a describable document `none`.
 */
test('R70-1: the empty overview states only the count that is actually zero', () => {
  const { trip } = europe2026();
  const noCities: Trip = { ...trip, cities: [], days: trip.days.map((d) => ({ ...d, cities: [] })) };
  const noDays: Trip = { ...trip, days: [] };
  const neither: Trip = { ...noDays, cities: [] };

  const a = core.ask({ kind: 'trip_overview' }, ctxAt(noCities, PLANNED));
  assert.equal(a.facts.find((f) => f.label === 'day_count')!.value, 16);
  assert.equal(a.facts.find((f) => f.label === 'city_count')!.value, 0);
  assert.ok(a.text.includes('no cities'), 'the sentence does not say which count is zero');
  assert.ok(!a.text.includes('no days'), 'the sentence says "no days" about a document with 16 of them');
  assert.equal(a.coverage, 'partial', 'a document the engine can describe was labelled `none`');

  const b = core.ask({ kind: 'trip_overview' }, ctxAt(noDays, PLANNED));
  assert.equal(b.facts.find((f) => f.label === 'city_count')!.value, 6);
  assert.ok(b.text.includes('no days'));
  assert.ok(!b.text.includes('no cities'), 'the sentence says "no cities" about a document with 6 of them');
  assert.equal(b.coverage, 'partial');

  const c = core.ask({ kind: 'trip_overview' }, ctxAt(neither, PLANNED));
  assert.ok(c.text.includes('no days') && c.text.includes('no cities'));
  // **Re-cut at I-38 (QA R71-2).** This assertion required `'none'` of a document carrying 31
  // pooled ideas, 95 places and 21 bookings — R70-1's own defect in the third arm of the same
  // conditional. `none` now means *the document holds nothing for this question*, which this
  // document is not; the genuinely empty one is asserted in `R71-2`'s own test.
  assert.equal(c.coverage, 'partial');
  assert.deepEqual(c.caveats.map((x) => x.code), ['no_records']);

  // Every clause of every arm agrees with the facts it is rendered from (§11.5).
  for (const [doc, ans] of [[noCities, a], [noDays, b], [neither, c]] as const) {
    const row = core.tripSummary(doc, core.COUNTRY_INDEX);
    if (row.dayCount > 0) assert.ok(!ans.text.includes('no days'));
    if (row.cityCount > 0) assert.ok(!ans.text.includes('no cities'));
  }
});

test('the ceilings hold: no ambient clock, no randomness, no network, no fs inside ask/', () => {
  const files = readdirSync(ASK_DIR).filter((f) => f.endsWith('.ts'));
  assert.ok(files.length >= 3, 'ask/ is emptier than this criterion assumes');
  for (const f of files) {
    const src = readFileSync(resolve(ASK_DIR, f), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const banned of ['Date.now', 'Math.random', 'crypto.', 'fetch(', 'node:fs', 'new Date']) {
      assert.equal(code.includes(banned), false, `ask/${f} reaches for ${banned}`);
    }
  }
});

test('§11.9: SCHEMA_VERSION and SUMMARY_VERSION do not move — ask stores nothing', () => {
  assert.equal(core.SCHEMA_VERSION, 5);
  assert.equal(core.SUMMARY_VERSION, 8);
});

test('ask is total over the union and throws only on programmer error', () => {
  const { trip } = europe2026();
  for (const q of core.askableQuestions(trip)) {
    const a = core.ask(q, ctxAt(trip, PLANNED));
    assert.equal(typeof a.text, 'string');
    assert.ok(a.text.length > 0, `${q.kind} rendered an empty sentence`);
    assert.ok(a.facts.length > 0, `${q.kind} produced no facts`);
    for (const f of a.facts) assert.ok(f.value === null || typeof f.value === 'string' || typeof f.value === 'number');
  }
  // Programmer error: a missing country index. `tripSummary`'s own rule, applied at this door.
  assert.throws(
    () => core.ask({ kind: 'trip_overview' }, { trip, today: PLANNED, index: undefined as never }),
    /country index/,
  );
  assert.throws(
    () => core.ask({ kind: 'trip_overview' }, { trip, today: 'not-a-date' as never, index: core.COUNTRY_INDEX }),
    /today/,
  );
});

// ---------------------------------------------------------------------------------------------
// 8. §11.12 A-97 — a value computed to DECIDE is not a value to STATE, and every busy day
//    carries its evidence.
// ---------------------------------------------------------------------------------------------

/**
 * **A-97 Parts 3 and 4 (QA R71-1) — the flagship sentence is true of the document.**
 *
 * At `e0fea87` `node cli.ts ask "do I have a free evening"` printed *"on 2026-08-07 you are on a
 * flight from 16:45 **until 23:59**"* about a stop the document gives `arrival: {flight, 660}` —
 * 16:45 + 660 is 03:45 the next day, and `conflict/rules/overlap.ts` renders the same run as
 * **16:45–27:45** from the same `stopOccupancy`. 23:59 was `occupiedInterval`'s own clamp, and it
 * was invisible **because it coincides with the end of the window being asked about**.
 *
 * The criterion is scoped to the property rather than to a spelling: **no answer
 * `askableQuestions(referenceTrip)` can produce, at either clock, renders an end time for a stop
 * whose `crossesDay` is `true`** — which a run that genuinely ends at 23:59 would satisfy.
 */
test('A-97 Part 4: a run that outlives its day renders no end clock time — N1 (injected, SHOWN TO FIRE)', () => {
  const { trip } = europe2026();

  /** The scoped criterion, over one answer's text. */
  const check = (text: string, days: typeof trip.days) => {
    for (const day of days) {
      for (const stop of day.stops) {
        const i = occupiedInterval(stop);
        if (i === null || !i.crossesDay) continue;
        for (const spelling of [clockOf(i.endMin), '23:59', clockOf(i.endMin % 1440)]) {
          assert.equal(
            text.includes(`until ${spelling}`), false,
            `${day.date}: the answer states an end time (${spelling}) for a run that outlives its day`,
          );
        }
      }
    }
  };

  const flagship = core.ask({ kind: 'free_time', part: 'evening', cityKey: null }, ctxAt(trip, PLANNED));
  check(flagship.text, trip.days);
  assert.ok(
    flagship.text.includes('on 2026-08-07 you are on a flight from 16:45 and still on it at midnight'),
    `the 2026-08-07 clause does not state the fact the classifier used:\n${flagship.text}`,
  );
  // The in-day clause is untouched: a run that ends inside its day still says when.
  assert.ok(flagship.text.includes('on 2026-08-14 you are on a bus from 17:15 until 18:35'), flagship.text);

  // The whole menu, at both clocks — a spelling is not the criterion, the property is.
  for (const today of [PLANNED, OVER]) {
    for (const q of core.askableQuestions(trip)) {
      const a = core.ask(q, ctxAt(trip, today));
      check(a.text, trip.days);
      for (const c of a.caveats) check(c.message, trip.days);
    }
  }

  // **The structured half keeps the number** (A-97 Part 4): `runEndsAt` is the uncapped wall
  // clock, so a surface that wants the instant has it under its own §6.6 obligations.
  const state = (a: Answer, date: string) => a.facts.find((f) => f.label === 'day_state' && f.params.date === date)!;
  assert.equal(state(flagship, '2026-08-07').params.runEndsAt, '27:45');
  assert.equal(state(flagship, '2026-08-14').params.runEndsAt, '18:35');
  assert.equal(state(flagship, '2026-08-12').params.runEndsAt, '', 'a day with no run reports an end time for one');

  // N1: revert `endMin` to the clamped value. The renderer is unchanged; the number it is given
  // is the one A-96 shipped, and `crossesDay` is what that clamp recorded.
  const clamped = flagship.text.replace(
    'from 16:45 and still on it at midnight',
    'from 16:45 until 23:59',
  );
  assert.notEqual(clamped, flagship.text, 'the fault did not change the sentence it is supposed to change');
  assert.throws(() => check(clamped, trip.days), /2026-08-07: the answer states an end time/);
});

/**
 * **A-97 Part 5 (QA R71-7) — every `busy` day carries a clause, and the buckets are a PARTITION.**
 *
 * `answerFreeTime` gated its run clause on `run.stop.arrival`, so A-96 Part 3's population — *a
 * stop whose stated run reaches into the window* — was rendered only for the half of it that is a
 * journey. A stop stating its own `durationMins` fell to the `starts` branch, which by
 * construction that day has nothing for: the day was counted in *"every one of the N days"*, its
 * `day_state` fact said `runsIntoWindow=1`, its stop was in `cites` — and the sentence said
 * nothing about it, or said *"the other one"* over two remaining days.
 *
 * **The fault is fireable only against a document that states a duration**: the reference trip
 * carries **0** stops with a non-null `durationMins` (A-96 Part 5), so the instrument is this
 * hand-built `Trip`, driven through the real `ask`.
 */
test('A-97 Part 5: every busy day is named or counted — N2 (injected, SHOWN TO FIRE on a document that states a duration)', () => {
  const { trip } = europe2026();
  const dayOf = (id: string) => trip.days.find((d) => d.id === id)!;
  // The 13th becomes the ordinary Cairn-native shape: one stop, a stated `durationMins`, NO
  // `arrival`. 17:00 + 120 runs to 19:00, which is inside the evening.
  const first = dayOf('2026-08-13').stops[0];
  const stated = {
    ...first,
    travelRole: 'transfer' as const,
    arrival: null,
    durationMins: 120,
    placement: { ...(first.placement as { kind: 'scheduled' }), time: '17:00' },
  } as typeof first;
  const doc: Trip = {
    ...trip,
    days: trip.days.map((d) => (d.id === '2026-08-13' ? { ...d, stops: [stated] } : d)),
  };
  const q: Question = { kind: 'free_time', part: 'evening', cityKey: 'split' };
  const a = core.ask(q, ctxAt(doc, PLANNED));
  const splitDays = doc.days.filter((d) => d.cities.includes('split'));

  // The three shapes are all present: a journey run (the 14th), a `durationMins` run with no
  // `arrival` (the 13th) and in-window starts (the 12th and 15th).
  const verdicts = splitDays.map((d) => ({ date: d.date, v: classifyDay(d, 'evening') }));
  assert.equal(verdicts.filter((x) => x.v.state === 'busy').length, 4);
  assert.equal(verdicts.find((x) => x.date === '2026-08-13')!.v.runsInto[0].interval.source, 'stated_duration');
  assert.equal(verdicts.find((x) => x.date === '2026-08-14')!.v.runsInto[0].interval.source, 'journey_run');
  assert.equal(verdicts.find((x) => x.date === '2026-08-12')!.v.starts.length > 0, true);

  /**
   * **The criterion, and it is an arithmetic claim**: the number of days the prose names equals
   * the number of days it counts. A run day is named by date; a start day is counted in *"the
   * other N"* and its start time is listed. `busyRuns.length + busyStarts.length === busy`.
   */
  const check = (text: string) => {
    const busy = verdicts.filter((x) => x.v.state === 'busy');
    const named = busy.filter((x) => text.includes(x.date));
    const times = busy
      .filter((x) => !text.includes(x.date))
      .map((x) => x.v.occupying.find((o) => o.startsInWindow))
      .filter((o) => o !== undefined)
      .map((o) => clockOf(o.interval.startMin));
    const counted = times.filter((t) => text.includes('starting at') && text.includes(t));
    assert.equal(
      named.length + counted.length, busy.length,
      `the prose names ${named.length} busy days and counts ${counted.length} of ${busy.length}:\n${text}`,
    );
    const other = /the other (\d+|one) /.exec(text);
    assert.ok(other !== null, `no "the other N" clause over the days the prose did not name:\n${text}`);
    assert.equal(other[1] === 'one' ? 1 : Number(other[1]), busy.length - named.length, `"the other ${other[1]}" is a count over the wrong days:\n${text}`);
  };
  check(a.text);

  // The two run clauses, one per `source`, with the stop's NAME in neither (A-96 Part 6).
  assert.ok(a.text.includes('on 2026-08-13 something that starts at 17:00 runs until 19:00'), a.text);
  assert.ok(a.text.includes('on 2026-08-14 you are on a bus from 17:15 until 18:35'), a.text);
  assert.equal(a.text.includes(stated.name), false, 'a stop name reached prose — A-96 Part 6 makes it inadmissible');
  assert.ok(a.cites.some((c) => c.kind === 'stop' && c.id === stated.id), 'the stop the clause is about is not cited');

  // **The fourth clause form**: `source` picks the subject and `crossesDay` picks the ending, and
  // the two compose — a `stated_duration` run that outlives its day (17:00 + 500 = 01:20 the next
  // day) states no next-day clock time either, in any spelling.
  const late: Trip = {
    ...doc,
    days: doc.days.map((d) => (d.id === '2026-08-13'
      ? { ...d, stops: [{ ...stated, durationMins: 500 } as typeof stated] }
      : d)),
  };
  const lateText = core.ask(q, ctxAt(late, PLANNED)).text;
  assert.ok(lateText.includes('on 2026-08-13 something that starts at 17:00 is still running at midnight'), lateText);
  assert.equal(lateText.includes('25:20'), false, lateText);
  assert.equal(lateText.includes('01:20'), false, lateText);

  // N2: restore the `run.stop.arrival` gate. The 13th's run has no `arrival`, so it falls to the
  // `starts` branch, which this day has nothing for — the clause vanishes and the count is a
  // count over the days it did not name.
  const faulty = a.text.replace(/on 2026-08-13 [^,]+, /, '');
  assert.notEqual(faulty, a.text, 'the fault did not remove the clause it is supposed to remove');
  assert.throws(() => check(faulty), /names 1 busy days and counts 2 of 4|the other 2/);
});

/**
 * **A-97 Part 6 (QA R71-3) — `country_count` answers only where the text carries a trip-scope
 * marker.** §11.3 rule 3 as shipped was a **denylist over an open set** — every English way of
 * saying *"across everything"* — and it has been measured short twice: five phrasings at R70-5 and
 * eight more at R71-3, including *"how many countries have I **already** been to"*, one adverb
 * from a phrasing that is refused and the ordinary way to ask.
 *
 * The inverse is a list over a **bounded** set: the ways English refers to the document in hand.
 * **The argument is the asymmetry of failure, not the closedness of the list** — an unlisted
 * marker costs a refusal with the menu behind it, an unlisted totality phrase cost a false
 * statement about the user's life. The lifetime list stays and is asked first, because when it
 * fires it produces the better **diagnosis**; it is no longer the safety mechanism.
 */
test('R71-3: eight escapes refuse, the trip-scoped phrasings answer — N3 (injected, SHOWN TO FIRE)', () => {
  const { trip } = europe2026();
  const check = (m: core.MatchOutcome, text: string) => {
    assert.equal(m.kind, 'out_of_scope', `answered against THIS trip instead of refusing: "${text}"`);
    if (m.kind !== 'out_of_scope') return;
    assert.match(m.pointer, /stats/, `the refusal does not name a way forward: "${text}"`);
  };
  // R71-3's eight, plus R70-5's five and the original six: every one carries either a totality
  // marker or a past-tense first-person frame, so every one is the better-worded refusal.
  for (const text of [
    'how many countries have I already been to',
    'how many countries have I now visited',
    'how many countries have I actually visited',
    'how many countries have I ever really been to',
    'how many countries have I not visited',
    'how many countries have I not been to',
    'how many countries have we visited',
    'how many countries to date',
    'how many countries have I visited',
    'which countries have I visited',
    'how many countries did I visit',
    'how many countries did we go',
    'how many countries have I been to',
    'how many countries ever',
    'how many countries across all my trips',
  ]) {
    const m = core.matchQuestion(text, trip);
    check(m, text);
    if (m.kind === 'out_of_scope') assert.equal(m.reason, 'lifetime', `the diagnosis is less specific than it could be: "${text}"`);
  }

  // **The gate itself**: no marker, no answer. The reason is the less specific one and the pointer
  // names BOTH ways forward — the menu's own trip-scoped line and `stats` for the library.
  for (const text of ['how many countries', 'which countries', 'number of countries', 'how many different countries']) {
    const m = core.matchQuestion(text, trip);
    check(m, text);
    if (m.kind !== 'out_of_scope') return;
    assert.equal(m.reason, 'scope_unclear', text);
    assert.match(m.pointer, /how many countries am I visiting/, 'the refusal does not name the trip-scoped question');
  }

  // The trip-scoped neighbours still answer — and `askableQuestions`' own line is one of them.
  for (const text of [
    'how many countries am I visiting',
    'which countries am I visiting',
    'what countries does this trip cover',
    'how many countries on this trip',
    'how many countries does this trip visit',
  ]) {
    const m = core.matchQuestion(text, trip);
    assert.equal(m.kind, 'matched', `the scope gate swallowed a trip-scoped question: "${text}"`);
    if (m.kind === 'matched') assert.deepEqual(m.question, { kind: 'country_count' });
  }
  // The gate is scoped to `country_count` and reaches no other intent (A-97 Part 6 rider 3).
  assert.equal(core.matchQuestion('have I booked everything', trip).kind, 'matched');
  assert.equal(core.matchQuestion('what is still unbooked', trip).kind, 'matched');
  assert.equal(core.matchQuestion('do I have a free evening', trip).kind, 'matched');

  // N3: delete the marker requirement, so the country trigger matches on its own. That is the
  // outcome the gate exists to prevent, and it is answered "This trip accounts for 7 countries".
  const answered: core.MatchOutcome = { kind: 'matched', question: { kind: 'country_count' }, restatement: 'x', params: {}, unread: [] };
  assert.match(core.ask({ kind: 'country_count' }, ctxAt(trip, PLANNED)).text, /7 countries/);
  assert.throws(() => check(answered, 'how many countries have I already been to'), /answered against THIS trip/);
});

/**
 * **QA R71-2.** R70-1's fix covers two of its conditional's **three** arms. With `dayCount === 0`
 * **and** `cityCount === 0` the answer still said *"there is nothing more I can tell you about
 * it"* at `coverage: 'none'` while its own facts carried `pool_count=31`, `place_count=95` and
 * `booking_count=21` — R70-1's exact defect, in the arm nobody drove.
 */
test('R71-2: a document with no days and no cities still reports what it DOES carry', () => {
  const { trip } = europe2026();
  const skeletal: Trip = { ...trip, days: [], cities: [] };
  const a = core.ask({ kind: 'trip_overview' }, ctxAt(skeletal, PLANNED));
  const value = (label: string) => a.facts.find((f) => f.label === label)!.value;
  assert.equal(value('day_count'), 0);
  assert.equal(value('city_count'), 0);
  assert.ok(Number(value('pool_count')) > 0 && Number(value('booking_count')) > 0, 'the fixture no longer carries the population this finding is about');
  assert.equal(a.coverage, 'partial', 'a document that carries 31 pooled ideas and 21 bookings is not `none`');
  assert.equal(/nothing more I can tell you|nothing to summarise/.test(a.text), false, a.text);
  assert.ok(a.text.includes(`${value('pool_count')} pooled ideas`), a.text);
  assert.ok(a.text.includes(`${value('booking_count')} bookings`), a.text);
  // The genuinely empty document is still `none` — the arm is not deleted, it is scoped.
  const empty: Trip = { ...skeletal, pool: [], places: [], bookings: [] };
  const b = core.ask({ kind: 'trip_overview' }, ctxAt(empty, PLANNED));
  assert.equal(b.coverage, 'none');
  assert.match(b.text, /nothing more I can tell you/);
});

/**
 * **QA R71-6** — five rough edges in `I-37`'s own sentences. Each is a separate arm and each is
 * asserted over a document that reaches it.
 */
test('R71-6: five prose edges', () => {
  const { trip } = europe2026();

  // (a) A day that is `unknown` because a stop states no TIME offered the run-length census as
  // its reason, and that census reads ZERO. The stated reason was the opposite of a reason.
  const timed: Trip = {
    ...trip,
    days: trip.days.map((d) => (!d.cities.includes('split') ? d : {
      ...d,
      stops: d.stops.map((s, i) => (d.id === '2026-08-14' && i === 0
        ? { ...s, durationMins: 30, placement: { ...(s.placement as { kind: 'scheduled' }), time: null } } as typeof s
        : { ...s, durationMins: 30, arrival: null } as typeof s)),
    })),
  };
  const a = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctxAt(timed, PLANNED));
  const day14 = a.facts.find((f) => f.label === 'day_state' && f.params.date === '2026-08-14')!;
  assert.equal(day14.value, 'unknown', 'the document no longer reaches the arm this asserts about');
  assert.equal(a.facts.find((f) => f.label === 'stops_without_occupancy')!.value, 0);
  assert.match(a.text, /can'?t tell/);
  assert.equal(/0 of the \d+ stops/.test(a.text), false, `the reason given reads zero:\n${a.text}`);
  assert.match(a.text, /state no time at all|states no time at all/, a.text);
  // (b) noun and verb agree.
  const timeCaveat = a.caveats.find((c) => c.code === 'time_unknown')!;
  assert.match(timeCaveat.message, /^1 scheduled stop in this range carries no time/, timeCaveat.message);

  // (c) the whole-trip `no_records` caveat said "No day of this trip is recorded for this trip."
  const dayless: Trip = { ...trip, days: [] };
  const whole = core.ask({ kind: 'free_time', part: 'evening', cityKey: null }, ctxAt(dayless, PLANNED));
  assert.equal(whole.caveats[0].message, 'No day of this trip is recorded yet.');
  assert.equal(/for this trip\./.test(whole.caveats[0].message), false, whole.caveats[0].message);

  // (d) a one-day scope rendered "on every one of the 1 day in Split".
  const oneDay: Trip = { ...trip, days: trip.days.filter((d) => d.id === '2026-08-12') };
  const single = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctxAt(oneDay, PLANNED));
  assert.equal(/every one of the 1 day/.test(single.text), false, single.text);
  assert.match(single.text, /on the only day in Split/, single.text);

  // (e) `.trim()` bound to the second template literal rather than to the concatenation, so an
  // answer whose second half is empty ended in a trailing space. Both arms.
  // The "No." arm with an empty second half: every stop states a run, so the census clause is
  // suppressed. 240 minutes from 17:15 keeps the 14th busy, so no day is `unknown`.
  const allStated: Trip = {
    ...trip,
    days: trip.days.map((d) => ({ ...d, stops: d.stops.map((s) => ({ ...s, durationMins: 240 })) })),
  };
  const no = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctxAt(allStated, PLANNED));
  assert.match(no.text, /^No\./);
  assert.equal(no.text, no.text.trim(), `the "No." arm ends in whitespace: ${JSON.stringify(no.text.slice(-12))}`);
  // The "Yes." arm with an empty second half: one day, clear, and no busy day to contrast with.
  const clear: Trip = {
    ...trip,
    days: trip.days.filter((d) => d.id === '2026-08-14').map((d) => ({ ...d, stops: d.stops.map((s) => ({ ...s, durationMins: 30 })) })),
  };
  const yes = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctxAt(clear, PLANNED));
  assert.match(yes.text, /^Yes\./);
  assert.equal(yes.text, yes.text.trim(), `the "Yes." arm ends in whitespace: ${JSON.stringify(yes.text.slice(-12))}`);
  // And over the whole menu, at both clocks.
  for (const today of [PLANNED, OVER]) {
    for (const q of core.askableQuestions(trip)) {
      const text = core.ask(q, ctxAt(trip, today)).text;
      assert.equal(text, text.trim(), `${q.kind} rendered a sentence with edge whitespace`);
    }
  }
});
