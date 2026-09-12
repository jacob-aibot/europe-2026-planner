/**
 * QA round 70 — the adversarial pass over ROADMAP **I-35** (`packages/core/src/ask/`, ARCHITECTURE
 * **§11**), at `master` = `43315ef`.
 *
 * Run from `cairn/`:
 *
 *   node qa/r70-ask.mjs            # every section
 *   node qa/r70-ask.mjs A C F      # named sections only
 *
 * Sections, and the finding each carries:
 *
 *   A  R70-1   `trip_overview`'s empty arm says "no days and no cities" when only ONE is zero,
 *              contradicting its own `day_count`/`city_count` facts.
 *   B  R70-2   `free_time` renders "Yes." with `coverage: 'complete'` while carrying a
 *              `time_unknown` caveat — the untimed stop may be inside the window it calls free.
 *   C  R70-3   a `travelRole: 'journey'` stop's `arrival.mins` IS its own run (§2.12), and
 *              `classifyDay` calls it "states no duration". 21 of 21 journey stops state one.
 *   D  R70-4   `answer.text` interpolates `trip.title` and `City.name` verbatim, so
 *              `redactionHits(answer.text)` is NOT `[]` for ordinary user input.
 *   E  R70-5   lifetime-scope phrasings outside the trigger list are answered against THIS trip.
 *   F  R70-6/7 two readings picked silently; `unread` cannot report a word `tokenize` deleted.
 *   G  R70-8/9/10  three prose defects in `free_time`.
 *   H  ADJUDICATION — N7 (the injected fault the builder declared unfireable as stated), the
 *              `time_unknown` / `no_records` unfireability claims, and the full free_time sweep.
 *   I  ADJUDICATION — KD-131 measured against the data: the literal §11.7 rule 4 reading prints a
 *              falsehood on TWO edge days, not one.
 *   J  the ceilings: zero non-core imports, no ambient clock, no randomness, determinism.
 *
 * A `FAIL` line is a finding. `note` lines are measurements recorded rather than asserted.
 * This script reads the fixture and writes nothing.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const core = await import(resolve(ROOT, 'packages/core/src/index.ts'));
const { classifyDay, DAYPART_WINDOWS } = await import(resolve(ROOT, 'packages/core/src/ask/freeTime.ts'));
const { loadEurope2026 } = await import(resolve(ROOT, 'fixtures/loadEurope2026.mjs'));

const { trip } = loadEurope2026();
const PLANNED = '2026-08-01';
const ctx = (t, today = PLANNED) => ({ trip: t, today, index: core.COUNTRY_INDEX });

let fails = 0;
const want = process.argv.slice(2).filter((a) => /^[A-J]$/.test(a));
const on = (s) => want.length === 0 || want.includes(s);
const ok = (cond, label) => { console.log(`${cond ? '  ok  ' : '  FAIL'} ${label}`); if (!cond) fails++; };
const note = (label) => console.log(`  note  ${label}`);
const head = (s, title) => console.log(`\n§${s} ${title}`);

// -------------------------------------------------------------------------------------- A
if (on('A')) {
  head('A', 'R70-1 — trip_overview\'s empty arm contradicts its own facts');
  const noDays = { ...trip, days: [], pool: [] };
  const a = core.ask({ kind: 'trip_overview' }, ctx(noDays));
  note(`cities=6 days=0 → "${a.text.slice(a.text.indexOf('Nothing else'))}"`);
  ok(!(a.text.includes('no cities') && a.facts.find((f) => f.label === 'city_count').value > 0),
    'a trip with 6 cities and 0 days is not told it has "no cities"');

  const noCities = { ...trip, cities: [], days: trip.days.map((d) => ({ ...d, cities: [] })), pool: [] };
  const b = core.ask({ kind: 'trip_overview' }, ctx(noCities));
  note(`cities=0 days=16 → day_count fact = ${b.facts.find((f) => f.label === 'day_count').value}, coverage = ${b.coverage}`);
  ok(!(b.text.includes('no days') && b.facts.find((f) => f.label === 'day_count').value > 0),
    'a trip with 16 days and 0 cities is not told it has "no days"');
  ok(b.coverage !== 'none' || b.facts.find((f) => f.label === 'day_count').value === 0,
    'coverage is not `none` over a document holding 16 days of records');
}

// -------------------------------------------------------------------------------------- B
if (on('B')) {
  head('B', 'R70-2 — "Yes." + coverage:complete + a time_unknown caveat');
  // Every stop states a duration (an ordinary Cairn-native trip), and the 14th's last stop
  // states no TIME. Nothing else changes.
  const doc = {
    ...trip,
    days: trip.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => {
        let n = { ...s, durationMins: 45 };
        if (d.id === '2026-08-14' && s.placement.kind === 'scheduled' && s.placement.time === '17:15') {
          n = { ...n, placement: { ...s.placement, time: null } };
        }
        return n;
      }),
    })),
    pool: trip.pool.map((s) => ({ ...s, durationMins: 45 })),
  };
  const a = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctx(doc));
  note(`text: ${a.text}`);
  note(`coverage: ${a.coverage}  caveats: ${a.caveats.map((c) => c.code).join(',') || '-'}`);
  const hasHole = a.caveats.some((c) => c.code === 'time_unknown');
  ok(!(hasHole && a.coverage === 'complete'),
    'an answer carrying a time_unknown caveat does not also claim coverage: complete');
  ok(!(hasHole && /^Yes\./.test(a.text)),
    'an answer that cannot place a scheduled stop in or out of the window does not open with "Yes."');
}

// -------------------------------------------------------------------------------------- C
if (on('C')) {
  head('C', 'R70-3 — arrival.mins IS a journey stop\'s own run (§2.12), and free_time ignores it');
  const journeys = trip.days.flatMap((d) => d.stops).filter((s) => s.travelRole === 'journey');
  const stated = journeys.filter((s) => s.arrival && typeof s.arrival.mins === 'number');
  note(`journey stops: ${journeys.length}; of which state arrival.mins: ${stated.length}`);
  ok(stated.length === 0 || journeys.length === 0,
    'no journey stop states a run length the classifier ignores');

  const d14 = trip.days.find((d) => d.id === '2026-08-14');
  const last = d14.stops.filter((s) => s.placement.kind === 'scheduled' && s.placement.time !== null)
    .sort((x, y) => (x.placement.time < y.placement.time ? 1 : -1))[0];
  const add = (hhmm, mins) => {
    const t = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)) + mins;
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };
  const ends = last.arrival ? add(last.placement.time, last.arrival.mins) : null;
  note(`the 14th's last start: ${last.placement.time} "${last.name}" travelRole=${last.travelRole} ` +
    `arrival=${JSON.stringify(last.arrival)} → ends ${ends}`);
  const w = DAYPART_WINDOWS.evening;
  ok(!(last.travelRole === 'journey' && ends !== null && ends >= w.from),
    `the stop §11.7 calls "states no duration" does not in fact run into the ${w.from}-${w.to} window`);

  const a = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctx(trip));
  const claimed = Number(a.facts.find((f) => f.label === 'stops_without_duration').value);
  const splitStops = trip.days.filter((d) => d.cities.includes('split')).flatMap((d) => d.stops);
  const withArrival = splitStops.filter((s) => s.travelRole === 'journey' && s.arrival);
  note(`the sentence says ${claimed} Split stops "say nothing about how long they take"; ` +
    `${withArrival.length} of them are journeys that state arrival.mins`);
  ok(withArrival.length === 0, 'the rendered clause is true of every stop it counts');
}

// -------------------------------------------------------------------------------------- D
if (on('D')) {
  head('D', 'R70-4 — trip.title and City.name are interpolated into answer.text verbatim');
  const cases = [
    ['title "EUROPE 2026"', { ...trip, title: 'EUROPE 2026' }, { kind: 'trip_overview' }],
    ['title "Split flat (door code 4821)"', { ...trip, title: 'Split flat (door code 4821)' }, { kind: 'trip_overview' }],
    ['city renamed LONDON / overview', { ...trip, cities: trip.cities.map((c) => (c.key === 'london' ? { ...c, name: 'LONDON' } : c)) }, { kind: 'trip_overview' }],
    ['city renamed LONDON / city_edge', { ...trip, cities: trip.cities.map((c) => (c.key === 'london' ? { ...c, name: 'LONDON' } : c)) }, { kind: 'city_edge', cityKey: 'london', edge: 'leave' }],
    ['city renamed LONDON / free_time', { ...trip, cities: trip.cities.map((c) => (c.key === 'london' ? { ...c, name: 'LONDON' } : c)) }, { kind: 'free_time', part: 'evening', cityKey: 'london' }],
  ];
  for (const [label, doc, q] of cases) {
    const hits = core.redactionHits(core.ask(q, ctx(doc)).text);
    ok(hits.length === 0, `§11.8: redactionHits(answer.text) is [] — ${label} → [${hits.join(',')}]`);
  }
  // The control: the reference trip's own strings really are clean, so the above is about the
  // renderer and not about the pattern set.
  let clean = true;
  for (const q of core.askableQuestions(trip)) {
    for (const today of [PLANNED, '2026-09-11']) {
      if (core.redactionHits(core.ask(q, ctx(trip, today)).text).length > 0) clean = false;
    }
  }
  ok(clean, 'control: every answer over the UNMODIFIED reference trip is clean');
}

// -------------------------------------------------------------------------------------- E
if (on('E')) {
  head('E', 'R70-5 — lifetime scope answered against this trip');
  const lifetime = [
    'how many countries have I visited',
    'how many countries have I seen',
    'how many countries have I stayed in',
    'which countries have I visited',
    'how many countries did I visit',
    'how many countries total',
  ];
  for (const text of lifetime) {
    const m = core.matchQuestion(text, trip);
    const answered = m.kind === 'matched' ? core.ask(m.question, ctx(trip)).text.slice(0, 46) : '';
    ok(m.kind === 'out_of_scope' && m.reason === 'lifetime',
      `"${text}" → ${m.kind}${answered ? ` :: ${answered}…` : ''}`);
  }
  // The controls the criterion names, which do hold.
  for (const text of ['how many countries have I been to', 'how many countries ever']) {
    const m = core.matchQuestion(text, trip);
    ok(m.kind === 'out_of_scope' && m.reason === 'lifetime', `control refused: "${text}"`);
  }
  const back = core.matchQuestion('what does my trip look like so far', trip);
  note(`the refusal also fires the other way: "what does my trip look like so far" → ${back.kind}/${back.reason ?? ''}` +
    ' — a trip-scoped question pointed at `stats`, which cannot answer it');
}

// -------------------------------------------------------------------------------------- F
if (on('F')) {
  head('F', 'R70-6 / R70-7 — a silent reading, and a word `unread` cannot report');
  const m = core.matchQuestion('when do I leave for Vienna', trip);
  note(`"when do I leave for Vienna" → ${m.kind} :: ${m.kind === 'matched' ? m.restatement : ''} ` +
    `(unread: ${m.kind === 'matched' ? m.unread.join(' ') : ''})`);
  ok(m.kind === 'ambiguous',
    '"leave FOR Vienna" has two readings in the closed union (leave vienna / arrive vienna) and is refused');

  const cyr = { ...trip, cities: trip.cities.map((c) => (c.key === 'split' ? { ...c, name: 'Сплит' } : c)) };
  const n = core.matchQuestion('do I have a free evening in Сплит', cyr);
  note(`"…free evening in Сплит" → ${n.kind} :: ${n.kind === 'matched' ? n.restatement : ''} ` +
    `(unread: ${n.kind === 'matched' ? n.unread.join(' ') : ''})`);
  ok(n.kind !== 'matched' || n.question.cityKey === 'split',
    'the trip\'s own city, named in Cyrillic, is not silently widened to the whole trip');
  ok(n.kind !== 'matched' || n.unread.some((w) => /[^\x00-\x7f]/.test(w)),
    '§11.3 rule 2: a word the recogniser did not read is reported, not deleted by the tokenizer');

  const far = core.matchQuestion('do I have a free evening in 東京', trip);
  ok(far.kind !== 'matched' || far.unread.some((w) => /[^\x00-\x7f]/.test(w)),
    'a place that is not on this trip at all is reported as unread rather than dropped');
}

// -------------------------------------------------------------------------------------- G
if (on('G')) {
  head('G', 'R70-8 / R70-9 / R70-10 — three prose defects in free_time');
  // R70-8: the cited `latestStart` is day-wide, so it can be AFTER the window asked about.
  const rows = trip.days.flatMap((d) => ['morning', 'afternoon', 'evening'].map((p) => ({ date: d.date, part: p, ...classifyDay(d, p) })));
  const odd = rows.filter((r) => r.state === 'unknown' && r.latestStart !== null && r.latestStart > DAYPART_WINDOWS[r.part].to);
  for (const r of odd) note(`${r.date} ${r.part} (window ${DAYPART_WINDOWS[r.part].from}-${DAYPART_WINDOWS[r.part].to}) cites latestStart ${r.latestStart}`);
  ok(odd.length === 0, 'the "nothing starts after X" clause names a time inside the window it explains');

  // R70-9: the no-days arm hard-codes "evening".
  const dangling = { ...trip, cities: [...trip.cities, { key: 'lisbon', name: 'Lisbon', countryCode: 'PT', centre: { lat: 38.72, lng: -9.14 }, pick: null, order: 99, meta: {} }] };
  const a = core.ask({ kind: 'free_time', part: 'morning', cityKey: 'lisbon' }, ctx(dangling));
  note(`text: ${a.text}`);
  ok(!/not a free evening/.test(a.text) || a.question.part === 'evening',
    'the no-days sentence names the daypart that was asked, not "evening"');

  // R70-10: a day with no stops renders a positive claim about stops that do not exist.
  const emptyDay = { ...trip, days: trip.days.map((d) => (d.id === '2026-08-14' ? { ...d, stops: [] } : d)) };
  const b = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctx(emptyDay));
  note(`text: ${b.text}`);
  note(`coverage: ${b.coverage}  caveats: ${b.caveats.map((c) => c.code).join(',') || '-'}`);
  ok(!/every stop on that day states how long it takes/.test(b.text),
    'a day with zero stops does not render a claim about the stops it does not have');
}

// -------------------------------------------------------------------------------------- H
if (on('H')) {
  head('H', 'ADJUDICATION — N7, the two unfireable arms, and the free_time sweep');
  // N7 as ROADMAP I-35 states it: drop the pool from the evidence walk and compare the CODE SET.
  const IDX = core.COUNTRY_INDEX;
  const walk = (withPool) => {
    const m = new Map();
    const push = (c) => { if (c !== null) m.set(c, (m.get(c) ?? 0) + 1); };
    for (const p of trip.places) push(p.at === null ? null : core.countryOf(p.at, IDX));
    const stops = withPool ? [...trip.days.flatMap((d) => d.stops), ...trip.pool] : trip.days.flatMap((d) => d.stops);
    for (const s of stops) { const at = core.stopLatLng(s, trip); push(at === null ? null : core.countryOf(at, IDX)); }
    return m;
  };
  const full = walk(true); const nopool = walk(false);
  const setOf = (m) => [...m.keys()].sort().join(',');
  note(`code set with pool   : ${setOf(full)}`);
  note(`code set without pool: ${setOf(nopool)}`);
  ok(setOf(full) === setOf(nopool), 'N7 AS STATED is unfireable — the builder\'s declaration is honest');

  const row = core.tripSummary(trip, IDX);
  const obj = (m) => Object.fromEntries(row.countryCodes.map((c) => [c, m.get(c) ?? 0]));
  const claimedFault = { AT: 29, CZ: 52, DE: 2, GB: 15, HR: 55, HU: 44, US: 2 };
  note(`real   : ${JSON.stringify(obj(full))}`);
  note(`fault  : ${JSON.stringify(obj(nopool))}`);
  ok(JSON.stringify(obj(nopool)) === JSON.stringify(claimedFault),
    'the STRENGTHENED N7\'s hand-typed faulty object is exactly what the real fault produces');
  ok(JSON.stringify(obj(full)) !== JSON.stringify(obj(nopool)),
    'the strengthened criterion can see the fault');

  // The two arms declared unfireable on this trip.
  const sched = trip.days.flatMap((d) => d.stops).filter((s) => s.placement.kind === 'scheduled');
  note(`scheduled stops: ${sched.length}; with a null time: ${sched.filter((s) => s.placement.time === null).length}`);
  ok(sched.filter((s) => s.placement.time === null).length === 0, '`time_unknown` is genuinely unfireable on the reference trip');
  const cityless = trip.cities.filter((c) => !trip.days.some((d) => d.cities.includes(c.key)));
  ok(cityless.length === 0, '`no_records` is genuinely unfireable on the reference trip (every city occupies days)');

  // The full sweep the builder claims returns zero `open`.
  const rows = trip.days.flatMap((d) => ['morning', 'afternoon', 'evening'].map((p) => classifyDay(d, p).state));
  const tally = rows.reduce((t, s) => ({ ...t, [s]: (t[s] ?? 0) + 1 }), {});
  note(`day x daypart sweep over ${rows.length} combinations: ${JSON.stringify(tally)}`);
  ok(!rows.includes('open'), 'not one day/daypart of the reference trip returns `open`');
}

// -------------------------------------------------------------------------------------- I
if (on('I')) {
  head('I', 'ADJUDICATION — KD-131 measured against the data');
  const wrong = [];
  for (const c of trip.cities) {
    const ds = trip.days.filter((d) => d.cities.includes(c.key));
    for (const [edge, day] of [['arrive', ds[0]], ['leave', ds[ds.length - 1]]]) {
      if (!day || day.cities.length !== 1) continue;
      const j = day.stops.find((s) => s.travelRole === 'journey');
      if (j) wrong.push(`${c.key} ${edge} ${day.id} — ${j.placement.time} "${j.name}"`);
    }
  }
  for (const w of wrong) note(`literal §11.7 rule 4 would print "no departure stop" here: ${w}`);
  note(`BUILD-NOTES KD-131 names ONE such day (London's last); the data carries ${wrong.length}`);
  ok(wrong.length === 0, 'the literal reading of §11.7 rule 4 agrees with §11.5\'s no_departure_stop definition');
}

// -------------------------------------------------------------------------------------- J
if (on('J')) {
  head('J', 'the ceilings — zero non-core imports, no ambient clock, determinism');
  const dir = resolve(ROOT, 'packages/core/src/ask');
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));
  let bad = [];
  for (const f of files) {
    const src = readFileSync(resolve(dir, f), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of code.matchAll(/from\s+'([^']+)'/g)) {
      if (!m[1].startsWith('.')) bad.push(`${f}: ${m[1]}`);
    }
    for (const banned of ['Date.now', 'new Date', 'Math.random', 'crypto.', 'fetch(', 'node:fs', 'node:', 'process.', 'Intl.', 'toLocale']) {
      if (code.includes(banned)) bad.push(`${f}: ${banned}`);
    }
  }
  ok(bad.length === 0, `ask/ takes no dependency and no ambient input — ${bad.join(', ') || 'clean'}`);

  // Determinism, run rather than grepped: the same question twice is the same bytes.
  let stable = true;
  for (const q of core.askableQuestions(trip)) {
    const a = JSON.stringify(core.ask(q, ctx(trip)));
    const b = JSON.stringify(core.ask(q, ctx(trip)));
    if (a !== b) stable = false;
  }
  ok(stable, `every one of the ${core.askableQuestions(trip).length} menu answers is byte-identical across two calls`);
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL`}`);
process.exitCode = fails === 0 ? 0 : 1;
