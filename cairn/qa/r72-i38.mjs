/**
 * QA round 72 — the confirmation pass over ROADMAP **I-38** (ARCHITECTURE **§11.12 A-97**), at
 * `master` = `465c200`. Round 71 found the class; this asks whether I-38 closed it, and attacks
 * the code I-38 added on its own merits.
 *
 * Run from `cairn/`:
 *
 *   node qa/r72-i38.mjs            # every section — offline, ~10 s, writes nothing
 *   node qa/r72-i38.mjs A F        # named sections only
 *
 * Sections, and what each carries:
 *
 *   A  CONFIRMS  R71-1 is closed. `occupiedInterval(flight).endMin === 1665`, `clockOf` renders
 *                `27:45`, the flagship answer says *"and still on it at midnight"*, no `23:59`
 *                and no `% 1440` anywhere, and `crossesDay` has a production reader.
 *   B  CONFIRMS  the uncapped `endMin`'s blast radius, measured rather than argued: the consumer
 *                census, the clamped-vs-unclamped sweep over all 143 fixture stops × 3 windows,
 *                `overlap`'s independent spelling of the same instant, and the substitute
 *                evidence for *"16:45–27:45"* re-derived here (BUILD-NOTES' disclosure 1).
 *                **R72-4** lives here: the clamp's new home is wrong for a window that begins at
 *                23:59, and the test BUILD-NOTES cites as its proof pins that reading.
 *   C  R72-3     `crossesDay` is off by one against the half-open convention the same file states:
 *                a run ending EXACTLY at 24:00 renders *"still on it at midnight"*.
 *   D  CONFIRMS  R71-7 is closed. The evidence partition over 1,800 fuzzed answers: every busy
 *                day is named or counted, every rendered clock is a real time, no day is named
 *                twice, and the three-arm census sums to the days in scope.
 *   E  R72-5     `runEndsAt` renders `clockOf` with no domain guard — `"-16:-20"` from a document
 *                `fromJSON` accepts — and has no production reader (criterion rule 10).
 *   F  R72-1     the trip-scope marker set admits six markers that are not scope markers, so
 *                lifetime questions carrying them are still ANSWERED about this trip (A-97 Part 6
 *                rider 4's own MAJOR class). **R72-2**: the refusal returns from inside the
 *                candidate loop and discards readings of other intents. **R72-7**: the pointer
 *                prints `§8.4` at a user. CONFIRMS R71-3 for marker-less text.
 *   G  R72-6     R71-6 (d)'s numeral survives in the two sibling arms. **R72-8**: a journey that
 *                states both `durationMins` and `arrival` loses its mode word.
 *   H  CONFIRMS  the R70-1 → R71-2 re-cut is correct in BOTH directions, and R71-5's two halves.
 *   I  the ceilings: determinism of the new prose, no ambient input in the changed files.
 *
 * A `FAIL` line is a finding. `note` lines are measurements recorded rather than asserted.
 * This script reads the fixture and writes nothing.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const core = await import(resolve(ROOT, 'packages/core/src/index.ts'));
const { classifyDay, DAYPART_WINDOWS } = await import(resolve(ROOT, 'packages/core/src/ask/freeTime.ts'));
const occ = await import(resolve(ROOT, 'packages/core/src/derive/occupancy.ts'));
const { matchQuestion } = await import(resolve(ROOT, 'packages/core/src/ask/match.ts'));
const { loadEurope2026 } = await import(resolve(ROOT, 'fixtures/loadEurope2026.mjs'));

const { trip } = loadEurope2026();
const PLANNED = '2026-08-01';
const ctx = (t, today = PLANNED) => ({ trip: t, today, index: core.COUNTRY_INDEX });
const PARTS = ['morning', 'afternoon', 'evening'];
const DAY_END_MIN = 23 * 60 + 59;

let fails = 0;
const want = process.argv.slice(2).filter((a) => /^[A-I]$/.test(a));
const on = (s) => want.length === 0 || want.includes(s);
const ok = (cond, label) => { console.log(`${cond ? '  ok  ' : '  FAIL'} ${label}`); if (!cond) fails++; };
const note = (label) => console.log(`  note  ${label}`);
const head = (s, title) => console.log(`\n§${s} ${title}`);

const timeVal = (t) => (t === null ? 99999 : Number(t.slice(0, 2)) * 60 + Number(t.slice(3)));
const base = trip.days[0].stops[0];
/** A stop shaped like the fixture's, with the fields this round cares about overridden. */
const stopAt = (time, patch = {}, id = 'probe-1') => ({
  ...base, id, name: 'probe', bookingRef: null, durationMins: null, travelRole: 'transfer', arrival: null,
  placement: { kind: 'scheduled', dayId: 'd1', time, order: 0 }, ...patch,
});
const dayOf = (stops, date = '2026-08-10', id = 'd1') => ({ ...trip.days[0], id, date, cities: ['split'], stops });
const splitDoc = (days) => ({ ...trip, days });
const askFree = (doc, part = 'evening', cityKey = 'split') =>
  core.ask({ kind: 'free_time', part, cityKey }, ctx(doc));

// -------------------------------------------------------------------------------------- A
if (on('A')) {
  head('A', 'CONFIRMS R71-1 — the clamp is gone from the value and the prose states the document');
  const flight = trip.days.find((d) => d.date === '2026-08-07').stops
    .find((s) => s.placement.kind === 'scheduled' && s.placement.time === '16:45');
  const i = occ.occupiedInterval(flight);
  note(`2026-08-07 16:45 ${flight.travelRole} arrival.mins=${flight.arrival.mins} → endMin=${i.endMin} clockOf=${occ.clockOf(i.endMin)} crossesDay=${i.crossesDay}`);
  ok(i.endMin === 1665, 'endMin is the document\'s own arithmetic: 1005 + 660 = 1665, not 1439');
  ok(occ.clockOf(i.endMin) === '27:45' && i.crossesDay === true, 'clockOf(endMin) === "27:45" and crossesDay is true');
  const o = occ.stopOccupancy(flight);
  ok(occ.clockOf(timeVal('16:45') + o.mins) === occ.clockOf(i.endMin),
    'one end-of-run instant: `overlap`\'s own spelling (start + mins) and `endMin` agree');

  const a = core.ask({ kind: 'free_time', part: 'evening', cityKey: null }, ctx(trip));
  note(`text: ${a.text.slice(0, 180)}…`);
  ok(/on 2026-08-07 you are on a flight from 16:45 and still on it at midnight/.test(a.text),
    'the flagship answer renders the overnight leg as "still on it at midnight"');
  ok(!/16:45 until 23:59/.test(a.text), 'the clamped landing time R71-1 found is gone');
  ok(/on 2026-08-14 you are on a bus from 17:15 until 18:35/.test(a.text),
    'and the same-day bus keeps its precise end time — the discriminant works in both directions');
  ok(!/03:45|3:45|27:45/.test(a.text), 'no next-day clock time is stated anywhere in the prose (no % 1440)');
  ok(a.coverage === 'complete' && a.caveats.length === 0, 'still `complete` with no caveat');

  const d7 = a.facts.find((f) => f.label === 'day_state' && f.params.date === '2026-08-07');
  note(`day_state 2026-08-07 params: ${JSON.stringify(d7.params)}`);
  ok(d7.params.runEndsAt === '27:45', 'the structured half keeps the instant: params.runEndsAt === "27:45"');
  const d8 = a.facts.find((f) => f.label === 'day_state' && f.params.date === '2026-08-08');
  ok(d8.params.runEndsAt === '' || /^\d\d:\d\d$/.test(String(d8.params.runEndsAt)),
    'a day with no run carries "" rather than a made-up instant');

  const src = readFileSync(resolve(ROOT, 'packages/core/src/ask/ask.ts'), 'utf8');
  ok(/crossesDay/.test(src), 'crossesDay has a production reader in ask/ask.ts (criterion rule 10)');
}

// -------------------------------------------------------------------------------------- B
if (on('B')) {
  head('B', 'CONFIRMS the blast radius of the uncapped endMin — measured, not argued');
  // 1. The consumer census. `occupiedInterval` has exactly ONE caller in production.
  const files = ['packages/core/src/ask/freeTime.ts', 'packages/core/src/ask/ask.ts', 'cli.ts',
    'packages/core/src/conflict/rules/overlap.ts', 'packages/core/src/index.ts'];
  const callers = files.filter((f) => /occupiedInterval/.test(readFileSync(resolve(ROOT, f), 'utf8')));
  note(`production files naming occupiedInterval: ${callers.join(', ') || '(none)'}`);
  ok(callers.length === 1 && callers[0] === 'packages/core/src/ask/freeTime.ts',
    'exactly one production caller — classifyDay, whose only use of endMin is through intervalIntersects');
  const ov = readFileSync(resolve(ROOT, 'packages/core/src/conflict/rules/overlap.ts'), 'utf8');
  ok(!/occupiedInterval|endMin/.test(ov), '`overlap` does not read the interval at all: no conflict verdict can move');
  ok(!/\.endMin\s*[-+*/<>]|sort\(/.test(readFileSync(resolve(ROOT, 'packages/core/src/ask/ask.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')),
    'no consumer does arithmetic on endMin or sorts by it — it is formatted and compared, nothing else');

  // 2. The clamp is inert over the REAL population, not just over an argument about bounds.
  let intervals = 0, moved = 0, crossers = 0;
  for (const day of trip.days) for (const stop of day.stops) {
    const i = occ.occupiedInterval(stop);
    if (i === null) continue;
    intervals++;
    if (i.crossesDay) crossers++;
    for (const p of PARTS) {
      const w = DAYPART_WINDOWS[p];
      const from = timeVal(w.from), to = timeVal(w.to);
      const withClamp = occ.intervalIntersects(i, from, to);
      const without = i.startMin > to ? false
        : i.source === null ? i.startMin >= from : (i.startMin >= from || i.endMin > from);
      if (withClamp !== without) moved++;
    }
  }
  note(`${intervals} intervals on the fixture, ${crossers} of them crossing midnight`);
  ok(moved === 0, `clamped vs unclamped over ${intervals} intervals × 3 dayparts: ${moved} verdicts differ`);
  const rows = trip.days.flatMap((d) => PARTS.map((p) => classifyDay(d, p).state));
  ok(rows.filter((s) => s === 'busy').length === 46 && rows.filter((s) => s === 'unknown').length === 2 && rows.filter((s) => s === 'open').length === 0,
    'and A-96 Part 4\'s 48 verdicts are still 46 busy / 0 open / 2 unknown');

  // 3. **R72-4** — the clamp's new home, exercised rather than assumed.
  const i660 = occ.occupiedInterval(stopAt('16:45', { travelRole: 'journey', arrival: { mode: 'flight', mins: 660 } }));
  const matrix = [
    ['evening    1080–1439', 1080, 1439, true],
    ['late night 1380–1439', 1380, 1439, true],
    ['last minute 1439–1439', 1439, 1439, true],   // the flight IS in the air at 23:59
    ['1438–1439', 1438, 1439, true],
    ['next morning 0–299', 0, 299, false],          // A-97 Part 9 residue 1: no claim about the next day
    ['inverted 700–600', 700, 600, false],
    ['zero-width 500–500', 500, 500, false],
  ];
  for (const [label, from, to, expected] of matrix) {
    const got = occ.intervalIntersects(i660, from, to);
    const unclamped = i660.startMin > to ? false : (i660.startMin >= from || i660.endMin > from);
    note(`${label}: clamped=${got} unclamped=${unclamped}`);
    ok(got === expected, `a 16:45 flight running to 27:45 against ${label} → ${got}, want ${expected}`);
  }
  note('R72-4: the clamp is Math.min(endMin, 1439) but the predicate is half-open (`end > fromMin`),');
  note('       so a run that genuinely covers minute 1439 tests FALSE for a window that begins there.');
  note('       `Math.min(endMin, DAY_END_MIN + 1)` is day-closed AND end-exclusive; 1439 is neither.');

  // 4. The substitute evidence for "16:45–27:45" — BUILD-NOTES disclosure 1, re-derived.
  const byRule = core.detectConflicts(trip, { today: PLANNED }).reduce((a, c) => ({ ...a, [c.ruleId ?? c.kind]: 1 }), {});
  const overlapOnFixture = core.detectConflicts(trip, { today: PLANNED }).filter((c) => c.summary.includes(' runs '));
  note(`conflict kinds on the reference trip: ${Object.keys(byRule).join(', ')}`);
  ok(overlapOnFixture.length === 0,
    '`overlap` returns 0 findings on the reference trip — round 71\'s `cli.ts conflicts` claim was illustrative, not measured');
  const d7 = trip.days.find((d) => d.date === '2026-08-07');
  const planted = { ...trip, days: trip.days.map((d) => (d.date !== '2026-08-07' ? d : ({
    ...d, stops: [...d.stops, stopAt('20:00', { durationMins: 30 }, 'probe-overlap')] })) ) };
  const found = core.detectConflicts(planted, { today: PLANNED }).filter((c) => c.summary.includes(' runs '));
  note(`planted 20:00 stop on ${d7.date} → ${found.length} overlap finding(s): ${found[0]?.summary ?? '(none)'}`);
  ok(found.length === 1 && found[0].summary.includes('16:45–27:45'),
    'the substitute evidence holds: a deliberately-conflicting stop makes `overlap` print 16:45–27:45');
}

// -------------------------------------------------------------------------------------- C
if (on('C')) {
  head('C', 'R72-3 — crossesDay at the exact midnight boundary');
  // A run is half-open at its end everywhere else in this file: "a leg landing at 18:00 does not
  // occupy 18:00". A run ending at 24:00 therefore does not reach into the next day at all.
  for (const [mins, wantCrosses] of [[419, false], [420, false], [421, true]]) {
    const i = occ.occupiedInterval(stopAt('17:00', { travelRole: 'journey', arrival: { mode: 'flight', mins } }));
    note(`17:00 + ${mins} → endMin=${i.endMin} (${occ.clockOf(i.endMin)}) crossesDay=${i.crossesDay}`);
    ok(i.crossesDay === wantCrosses,
      `a ${mins}-minute run from 17:00 ends at ${occ.clockOf(i.endMin)} → crossesDay should be ${wantCrosses}`);
  }
  const doc = splitDoc([dayOf([stopAt('17:00', { travelRole: 'journey', arrival: { mode: 'flight', mins: 420 } })])]);
  const a = askFree(doc);
  note(`text: ${a.text}`);
  ok(/until 24:00|until midnight/.test(a.text),
    'a flight that LANDS at midnight is not "still on it at midnight" — the document says it is over');
  // The >24h case A-97 Part 4 (b) deliberately keeps silent about: true, and understated on purpose.
  const long = askFree(splitDoc([dayOf([stopAt('17:00', { travelRole: 'journey', arrival: { mode: 'flight', mins: 2400 } })])]));
  note(`40-hour run: ${long.text.slice(0, 110)}…`);
  ok(/still on it at midnight/.test(long.text) && !/\d\d:\d\d the next day/.test(long.text),
    'a 40-hour run says "still on it at midnight" and refuses a next-day clock — A-97 Part 4 (b), correct');
}

// -------------------------------------------------------------------------------------- D
if (on('D')) {
  head('D', 'CONFIRMS R71-7 — the evidence partition, fuzzed');
  let seed = 999; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const TIMES = [null, '00:00', '05:00', '11:59', '12:00', '17:00', '17:59', '18:00', '20:00', '23:00', '23:59'];
  const shape = () => {
    const r = rnd();
    if (r < 0.2) return { durationMins: pick([0, 30, 120, 420, 421, 1440, -60]), travelRole: pick(['transfer', 'journey', 'unknown']), arrival: null };
    if (r < 0.45) return { durationMins: null, travelRole: 'journey', arrival: { mode: pick(['flight', 'bus', 'train', 'ferry']), mins: pick([0, 45, 420, 660, 2400, -90]) } };
    if (r < 0.6) return { durationMins: pick([60, 180]), travelRole: 'journey', arrival: { mode: 'flight', mins: pick([60, 900]) } };
    if (r < 0.8) return { durationMins: null, travelRole: 'transfer', arrival: { mode: 'bus', mins: 80 } };
    return { durationMins: null, travelRole: 'unknown', arrival: null };
  };
  let answers = 0, mismatch = 0, censusOff = 0, badClock = 0, badName = 0, noArm = 0, samples = [];
  for (let it = 0; it < 600; it++) {
    const nDays = 1 + Math.floor(rnd() * 4);
    const days = [];
    for (let d = 0; d < nDays; d++) {
      const stops = [];
      for (let s = 0, n = Math.floor(rnd() * 4); s < n; s++) {
        stops.push(stopAt(pick(TIMES), shape(), `s${d}-${s}`));
      }
      days.push(dayOf(stops, `2026-08-${String(10 + d).padStart(2, '0')}`, `day-${d}`));
    }
    const doc = splitDoc(days);
    for (const part of PARTS) {
      const a = askFree(doc, part);
      answers++;
      const st = (s) => a.facts.filter((f) => f.label === 'day_state' && f.value === s);
      const busyDates = st('busy').map((f) => f.params.date);
      const busy = busyDates.length;
      if (busy + st('open').length + st('unknown').length !== nDays) { censusOff++; samples.push(`CENSUS ${a.text.slice(0, 120)}`); }
      for (const m of a.text.matchAll(/\b(\d{1,3}):(-?\d{1,2})\b/g)) {
        const h = Number(m[1]), mm = Number(m[2]);
        if (!(h >= 0 && h <= 23 && mm >= 0 && mm <= 59)) { badClock++; if (samples.length < 6) samples.push(`CLOCK ${m[0]} :: ${a.text.slice(0, 140)}`); }
      }
      if (!/^No\./.test(a.text)) continue;
      noArm++;
      const named = [...a.text.matchAll(/on (2026-\d\d-\d\d) /g)].map((m) => m[1]);
      let others = 0;
      const one = /(?:the other )?one has something starting at/.test(a.text);
      const many = a.text.match(/(?:the other )?(\d+) have something starting at/);
      if (one) others = 1; else if (many) others = Number(many[1]);
      if (named.length + others !== busy) { mismatch++; if (samples.length < 6) samples.push(`PARTITION busy=${busy} named=${named.length} other=${others} :: ${a.text.slice(0, 160)}`); }
      if (new Set(named).size !== named.length || named.some((d) => !busyDates.includes(d))) { badName++; }
    }
  }
  note(`${answers} answers over 600 fuzzed documents; ${noArm} of them are the "No." arm the identity governs`);
  for (const s of samples.slice(0, 6)) note(s);
  ok(mismatch === 0, `busyRuns + busyStarts === busy in the prose: ${mismatch} mismatches`);
  ok(censusOff === 0, `the three-arm census sums to the days in scope: ${censusOff} mismatches`);
  ok(badClock === 0, `every clock rendered in prose is a real time of day: ${badClock} malformed`);
  ok(badName === 0, `no day is named twice and every named day is one the facts call busy: ${badName} violations`);

  // The three shapes A-97 Part 5 names, in one document, through the CLI's own entry point.
  const mixed = splitDoc([
    dayOf([stopAt('17:15', { travelRole: 'journey', arrival: { mode: 'bus', mins: 80 } }, 'a')], '2026-08-10', 'd1'),
    dayOf([stopAt('16:30', { durationMins: 120 }, 'b')], '2026-08-11', 'd2'),
    dayOf([stopAt('20:00', {}, 'c')], '2026-08-12', 'd3'),
  ]);
  const m = askFree(mixed);
  note(`three shapes: ${m.text}`);
  ok(/you are on a bus from 17:15 until 18:35/.test(m.text) &&
     /something that starts at 16:30 runs until 18:30/.test(m.text) &&
     /the other one has something starting at 20:00/.test(m.text),
    'a journey run, a durationMins run with no arrival, and an in-window start each render their own clause');
  ok(!/probe/.test(m.text), 'and no stop name reaches the prose (A-96 Part 6)');
}

// -------------------------------------------------------------------------------------- E
if (on('E')) {
  head('E', 'R72-5 — runEndsAt formats without a domain guard, and has no production reader');
  for (const [mins, want] of [[-1200, '-2:00'], [-2000, '-16:-20'], [1e9, '16666684:40']]) {
    const doc = splitDoc([dayOf([stopAt('18:00', { durationMins: mins })])]);
    const a = askFree(doc);
    const f = a.facts.find((x) => x.label === 'day_state');
    note(`durationMins ${mins} → params.runEndsAt = ${JSON.stringify(f.params.runEndsAt)}`);
    let accepted = true;
    try { core.fromJSON(core.toJSON(doc)); } catch { accepted = false; }
    ok(!(f.params.runEndsAt === want && accepted),
      `a document fromJSON accepts puts ${JSON.stringify(want)} in day_state.params.runEndsAt`);
  }
  // …and nothing reads it, which is the shape criterion rule 10 exists for (`crossesDay`).
  const cli = readFileSync(resolve(ROOT, 'cli.ts'), 'utf8');
  const readers = ['cli.ts'].filter((f) => /runEndsAt/.test(readFileSync(resolve(ROOT, f), 'utf8')));
  note(`surfaces naming runEndsAt: ${readers.join(', ') || '(none)'}`);
  ok(readers.length > 0 || !/slice\(0, 4\)/.test(cli),
    'runEndsAt has a production reader, or the one surface that prints params does not truncate before it');
  note('cli.ts prints the first FOUR non-empty params of each fact; runEndsAt is the seventh, so it is');
  note('never shown — the malformed value is not user-meetable today, and neither is the good one.');
}

// -------------------------------------------------------------------------------------- F
if (on('F')) {
  head('F', 'R72-1 / R72-2 / R72-7 — the default-deny scope gate');
  const kind = (q) => { const m = matchQuestion(q, trip); return m.kind === 'out_of_scope' ? `out_of_scope:${m.reason}` : m.kind === 'matched' ? `matched:${m.question.kind}` : m.kind; };
  const answered = (q) => kind(q) === 'matched:country_count';

  // CONFIRMS R71-3: marker-less text refuses, and the trip-scoped menu line still answers.
  for (const q of ['how many countries', 'number of countries', 'which countries are covered', 'how many different countries']) {
    ok(kind(q) === 'out_of_scope:scope_unclear', `marker-less text refuses: "${q}" → ${kind(q)}`);
  }
  for (const q of ['how many countries am I visiting', 'which countries am I visiting', 'how many countries on this trip',
    'how many countries does this trip cover', 'what countries do we go to', 'how many countries are on my trip']) {
    ok(answered(q), `a trip-scoped phrasing still answers: "${q}" → ${kind(q)}`);
  }
  for (const q of ['how many countries have I already been to', 'how many countries have we visited', 'how many countries in total']) {
    ok(kind(q) === 'out_of_scope:lifetime', `the lifetime diagnosis still fires first: "${q}"`);
  }

  // **R72-1** — six of the twelve markers are person/tense, not scope. A lifetime question that
  // carries one is ANSWERED about this trip: A-97 Part 6 rider 4's own MAJOR class.
  const lifetimeWithMarker = [
    'how many countries do I have under my belt',
    'how many countries am I up to',
    'how many countries am I on now',
    'what countries do I still need to visit',
    'how many countries do we have between us',
    'how many countries do I have left in the world',
    'which countries do I still have to see',
    'how many countries am I missing',
    'how many countries do I have on my list',
    'which countries am I yet to visit',
  ];
  let escapes = 0;
  for (const q of lifetimeWithMarker) if (answered(q)) escapes++;
  const a = core.ask({ kind: 'country_count' }, ctx(trip));
  note(`answer these reach: "${a.text.slice(0, 80)}…"`);
  for (const q of lifetimeWithMarker) {
    ok(!answered(q), `a lifetime question carrying a first-person marker is not answered about this trip: "${q}" → ${kind(q)}`);
  }
  note(`${escapes} of ${lifetimeWithMarker.length} lifetime phrasings reach an ANSWER through 'am i' / 'do i' / 'do we'`);
  note('measured at d8f5a1e too — this is A-97 Part 6\'s residue, not I-38\'s regression');

  // **R72-2** — the refusal returns from inside the candidate loop and discards what was collected.
  for (const [q, before] of [['how many countries have I booked', 'ambiguous'], ['which countries have a free evening', 'ambiguous']]) {
    note(`"${q}": d8f5a1e → ${before}, 465c200 → ${kind(q)}`);
    ok(kind(q) === before,
      `the scope gate suppresses country_count only, and leaves other intents' readings standing: "${q}"`);
  }
  // …and the control: with a marker present, the other reading survives as an ambiguity.
  ok(kind('what countries do I fly out of Vienna to') === 'ambiguous',
    'control: with a marker, a country trigger beside a city_edge is still two readings');

  // **R72-7** — the pointer a user reads.
  const m = matchQuestion('how many countries', trip);
  note(`pointer: ${m.pointer}`);
  ok(!/§\d/.test(m.pointer), 'the refusal a user reads does not cite an internal document section');
}

// -------------------------------------------------------------------------------------- G
if (on('G')) {
  head('G', 'R72-6 / R72-8 — the prose edges R71-6 did not reach');
  const clear = stopAt('09:00', { durationMins: 30 }, 'clear');
  const busy = stopAt('20:00', { durationMins: 30 }, 'busy');
  const two = askFree(splitDoc([dayOf([busy], '2026-08-10', 'd1'), dayOf([clear], '2026-08-11', 'd2')]));
  note(`2 days, 1 clear: ${two.text}`);
  ok(!/The other 1 is busy/.test(two.text), '"The other 1 is busy then." — R71-6 (d)\'s numeral, in the `Yes.` arm');
  const one = askFree(splitDoc([dayOf([clear])]));
  note(`1 day, clear: ${one.text}`);
  ok(!/the 1 day/.test(one.text), '"Of the 1 day in Split" — R71-6 (d) fixed this string in the `No.` arm only');
  const oneBusy = askFree(splitDoc([dayOf([busy])]));
  ok(/on the only day in Split/.test(oneBusy.text), 'control: the `No.` arm says "the only day in Split" (R71-6 (d), fixed)');

  // **R72-8** — a journey that states BOTH fields loses its mode word.
  const both = askFree(splitDoc([dayOf([stopAt('16:30', { durationMins: 120, travelRole: 'journey', arrival: { mode: 'flight', mins: 120 } })])]));
  note(`durationMins + arrival: ${both.text.slice(0, 140)}`);
  ok(/you are on a flight from 16:30/.test(both.text),
    'a journey stop whose run came from durationMins still knows its mode, and the mode is an enum label');
}

// -------------------------------------------------------------------------------------- H
if (on('H')) {
  head('H', 'CONFIRMS the R70-1 → R71-2 re-cut, and R71-5\'s two halves');
  const skeletal = { ...trip, days: [], cities: [] };
  const s = core.ask({ kind: 'trip_overview' }, ctx(skeletal));
  note(`no days, no cities, 31 pooled ideas: coverage=${s.coverage}`);
  ok(s.coverage === 'partial' && !/nothing more I can tell you/.test(s.text),
    'the re-cut is in the right direction: a document holding 147 records is `partial`');
  const empty = { ...skeletal, pool: [], places: [], bookings: [] };
  const e = core.ask({ kind: 'trip_overview' }, ctx(empty));
  note(`genuinely empty: coverage=${e.coverage} — ${e.text.slice(0, 120)}`);
  ok(e.coverage === 'none' && /nothing more I can tell you/.test(e.text),
    'and it is not a weakening: the genuinely empty document keeps `none` and its sentence');
  // The arm is scoped, not deleted — one record anywhere flips it.
  const onePlace = { ...empty, places: [trip.places[0]] };
  ok(core.ask({ kind: 'trip_overview' }, ctx(onePlace)).coverage === 'partial',
    'one record anywhere is enough to stop saying "there is nothing to summarise"');

  // R71-5 half 1: restate() through the chokepoint. Half 2: the CLI prints the typeable form only.
  const dirty = { ...trip, cities: trip.cities.map((c) => (c.key === 'london' ? { ...c, name: 'LONDON' } : c)) };
  const m = matchQuestion('when do I leave for London', dirty);
  note(`ambiguous restatements: ${JSON.stringify(m.restatements)}`);
  ok(m.restatements.every((r) => r.includes('[redacted]')), 'restate() still goes through the redaction sweep');
  const cli = readFileSync(resolve(ROOT, 'cli.ts'), 'utf8');
  ok(!/\$\{m\.restatements\[i\]\}/.test(cli),
    'cli.ts prints the typeable form only — the raw name is no longer printed beside the redacted one');
}

// -------------------------------------------------------------------------------------- I
if (on('I')) {
  head('I', 'the ceilings — determinism and no ambient input in the files I-38 opened');
  const changed = ['packages/core/src/ask/ask.ts', 'packages/core/src/ask/match.ts',
    'packages/core/src/ask/types.ts', 'packages/core/src/derive/occupancy.ts'];
  for (const f of changed) {
    const code = readFileSync(resolve(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    ok(!/Date\.now|Math\.random|crypto\.|process\.env|require\(|from '(?!\.)/.test(code),
      `${f}: no ambient clock, randomness, env or non-relative import`);
  }
  const qs = core.askableQuestions(trip);
  let drift = 0;
  for (const q of qs) {
    const a = JSON.stringify(core.ask(q, ctx(trip)));
    const b = JSON.stringify(core.ask(q, ctx(trip)));
    if (a !== b) drift++;
  }
  ok(drift === 0, `every one of the ${qs.length} menu answers is byte-identical across two calls`);
  const before = JSON.stringify(trip);
  for (const q of qs) core.ask(q, ctx(trip));
  ok(JSON.stringify(trip) === before, 'and nothing in ask/ mutates the document');
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL`}`);
process.exit(fails === 0 ? 0 : 1);
