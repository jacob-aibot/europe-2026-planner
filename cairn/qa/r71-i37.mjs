/**
 * QA round 71 — the confirmation pass over ROADMAP **I-37** (ARCHITECTURE **§11.11 A-96**), at
 * `master` = `e0fea87`. Round 70 found the class; this asks whether I-37 closed it and attacks
 * the code I-37 added on its own merits.
 *
 * Run from `cairn/`:
 *
 *   node qa/r71-i37.mjs            # every section — offline, ~6 s, writes nothing
 *   node qa/r71-i37.mjs A B        # named sections only
 *
 * Sections, and the finding each carries:
 *
 *   A  CONFIRMS  the 48-verdict sweep, re-derived cell by cell against revision 77's classifier
 *                re-implemented from `git show 3bc5b3e`. 44/0/4 → 46/0/2, two movers, both named.
 *   B  R71-1     `free_time` renders `OccupiedInterval.endMin` as a clock time. `endMin` is
 *                CLAMPED to 23:59, so the flagship answer states a flight ends at a time the
 *                document contradicts — while `overlap` renders the same run as `16:45–27:45`.
 *                `crossesDay`, the field A-96 Part 2 added to record the clamp, has no reader.
 *   C  R71-2     `answerOverview`'s BOTH-zero arm still contradicts its own facts: "there is
 *                nothing to summarise" at `coverage: 'none'` over 31 pooled ideas, 95 places and
 *                21 bookings the same `Answer` carries as facts. R70-1 fixed two arms of three.
 *   D  R71-3     R70-5's lifetime CLASS is adjacency-matched, so one adverb defeats it:
 *                "how many countries have I already been to" is answered about this trip. The
 *                `have I not <verb>` frame `match.ts:118` claims is not implemented either.
 *   E  R71-4     `intervalIntersects` tests only the END of a stated run against the window, so
 *                a stop that STARTS inside the window can be reported as not occupying it.
 *                Witnesses: a zero-length run at the window's first minute, and a negative one
 *                (`fromJSON` accepts both). The result is a confident "Yes." at `complete`.
 *   F  R71-5     `restate()` goes through the chokepoint (BUILD-NOTES disclosure 3) and NOTHING
 *                asserts it — and `cli.ts`'s own `questionLine` prints the raw name beside it.
 *   G  R71-6     five prose rough edges in I-37's own sentences.
 *   I  R71-7     A-96 Part 3 introduced `runsInto` — a stop whose STATED run reaches into the
 *                window — and the renderer handles only the JOURNEY half of it. A `busy` day whose
 *                occupying stop states its own `durationMins` and carries no `arrival` renders NO
 *                clause: two such days produce a bare "No." with no evidence, and mixed with a
 *                journey day the prose says "the other one" over two remaining days.
 *   H  ADJUDICATION — the chokepoint under a full sentinel sweep of every user-authored string
 *                field; `redactText`'s own boundary; the `stops_without_occupancy` rename; the
 *                `SOURCE_ALLOW` row; the `overlap` identity.
 *   J  the ceilings, re-run.
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
const occ = await import(resolve(ROOT, 'packages/core/src/derive/occupancy.ts'));
const { restate } = await import(resolve(ROOT, 'packages/core/src/ask/match.ts'));
const { loadEurope2026 } = await import(resolve(ROOT, 'fixtures/loadEurope2026.mjs'));

const { trip } = loadEurope2026();
const PLANNED = '2026-08-01';
const OVER = '2026-09-11';
const ctx = (t, today = PLANNED) => ({ trip: t, today, index: core.COUNTRY_INDEX });
const PARTS = ['morning', 'afternoon', 'evening'];

let fails = 0;
const want = process.argv.slice(2).filter((a) => /^[A-J]$/.test(a));
const on = (s) => want.length === 0 || want.includes(s);
const ok = (cond, label) => { console.log(`${cond ? '  ok  ' : '  FAIL'} ${label}`); if (!cond) fails++; };
const note = (label) => console.log(`  note  ${label}`);
const head = (s, title) => console.log(`\n§${s} ${title}`);

const timeVal = (t) => (t === null ? 99999 : Number(t.slice(0, 2)) * 60 + Number(t.slice(3)));

/** A minimal well-formed stop, for the boundary cases the fixture cannot express. */
const stopLike = (patch) => ({
  id: 'stop-probe', placement: { kind: 'scheduled', dayId: '2026-08-14', time: '20:00', order: 0 },
  name: 'probe', category: 'other', place: { kind: 'inline', at: { lat: 43.5, lng: 16.4 } }, note: '',
  cost: null, arrival: null, travelRole: 'transfer', bookingId: null, flags: [],
  provenance: { source: 'user', at: '2026-01-01' }, durationMins: null, ...patch,
});
const dayOf = (stops) => ({ id: '2026-08-14', date: '2026-08-14', primaryCity: 'split', cities: ['split'], title: '', subtitle: '', stops, provenance: { source: 'user', at: '2026-01-01' } });

// -------------------------------------------------------------------------------------- A
if (on('A')) {
  head('A', 'CONFIRMS — the 48-verdict sweep, re-derived cell by cell');
  // Revision 77's classifier, transcribed from `git show 3bc5b3e:…/ask/freeTime.ts`. It reads
  // `durationMins` and START INSTANTS only — which is R70-3's defect, in its own words.
  const classify77 = (day, part) => {
    const w = DAYPART_WINDOWS[part];
    const fromMin = timeVal(w.from);
    const toMin = timeVal(w.to);
    const starts = [];
    const withoutDuration = [];
    for (const stop of day.stops) {
      if (stop.placement.kind === 'scheduled' && stop.placement.time !== null) {
        const v = timeVal(stop.placement.time);
        if (v >= fromMin && v <= toMin) starts.push(stop);
      }
      if (stop.durationMins === null) withoutDuration.push(stop);
    }
    return starts.length > 0 ? 'busy' : withoutDuration.length === 0 ? 'open' : 'unknown';
  };
  const cells = trip.days.flatMap((d) => PARTS.map((p) => ({
    date: d.date, part: p, before: classify77(d, p), after: classifyDay(d, p).state,
  })));
  const tally = (k) => cells.reduce((t, c) => ({ ...t, [c[k]]: (t[c[k]] ?? 0) + 1 }), {});
  note(`revision 77 : ${JSON.stringify(tally('before'))}`);
  note(`A-96        : ${JSON.stringify(tally('after'))}`);
  ok(cells.length === 48, 'the population is 16 days × 3 dayparts = 48');
  ok(JSON.stringify(tally('before')) === JSON.stringify({ unknown: 4, busy: 44 }), 'revision 77 measured 44 busy / 0 open / 4 unknown');
  ok(JSON.stringify(tally('after')) === JSON.stringify({ unknown: 2, busy: 46 }), 'A-96 measures 46 busy / 0 open / 2 unknown');
  const moved = cells.filter((c) => c.before !== c.after);
  for (const m of moved) note(`moved: ${m.date} ${m.part}  ${m.before} → ${m.after}`);
  ok(moved.length === 2, 'exactly two cells move — no third mover');
  ok(moved.every((m) => m.before === 'unknown' && m.after === 'busy'), 'both move unknown → busy, and nothing moves the other way');
  ok(JSON.stringify(moved.map((m) => `${m.date} ${m.part}`)) === JSON.stringify(['2026-08-07 evening', '2026-08-14 evening']),
    'the two movers are the evenings of 2026-08-07 and 2026-08-14, exactly as A-96 Part 4 measured');
  ok(JSON.stringify(cells.filter((c) => c.after !== 'busy').map((c) => `${c.date} ${c.part}`)) ===
    JSON.stringify(['2026-08-07 morning', '2026-08-08 morning']),
    'the two survivors are the mornings of 2026-08-07 and 2026-08-08');
  ok(cells.every((c) => c.after !== 'open'), 'no verdict becomes `open` (A-96 Part 5: 0 of 48 before and after)');
  ok(cells.every((c) => !(c.before === 'busy' && c.after !== 'busy')), 'the change is strictly additive — every revision-77 `busy` is still `busy`');
}

// -------------------------------------------------------------------------------------- B
if (on('B')) {
  head('B', 'R71-1 — a clamped interval end is rendered as a clock time');
  const crossing = trip.days.flatMap((d) => d.stops.map((s) => ({ d, s, i: occ.occupiedInterval(s) })))
    .filter((x) => x.i !== null && x.i.crossesDay);
  for (const { d, s, i } of crossing) {
    const stated = s.durationMins ?? s.arrival.mins;
    note(`${d.date} ${s.placement.time} role=${s.travelRole} arrival.mins=${s.arrival?.mins ?? '-'} → ` +
      `document says it runs to ${occ.clockOf(i.startMin + stated)}; endMin is clamped to ${occ.clockOf(i.endMin)} (crossesDay=${i.crossesDay})`);
  }
  ok(crossing.length === 2, 'A-96 Part 3: 2 of the 21 journey intervals run past 23:59');

  const a = core.ask({ kind: 'free_time', part: 'evening', cityKey: null }, ctx(trip));
  note(`text: ${a.text.slice(0, 190)}…`);
  // The rendered clause names an END TIME. It may only name one the document agrees with.
  for (const m of a.text.matchAll(/on (\d{4}-\d{2}-\d{2}) you are on a (\w+) from (\d\d:\d\d) until (\d\d:\d\d)/g)) {
    const [, date, mode, from, until] = m;
    const day = trip.days.find((d) => d.date === date);
    const stop = day.stops.find((s) => s.placement.kind === 'scheduled' && s.placement.time === from && s.arrival?.mode === mode);
    const stated = stop ? (stop.durationMins ?? stop.arrival.mins) : null;
    const truth = stop ? occ.clockOf(timeVal(from) + stated) : '?';
    ok(until === truth, `"${date} … from ${from} until ${until}" — the document says that ${mode} runs until ${truth}`);
  }
  ok(a.coverage === 'complete', 'and it is asserted at coverage: complete, with no caveat about the clamp');
  note(`caveats: ${a.caveats.map((c) => c.code).join(',') || '-'}`);

  // `crossesDay` exists to record exactly this and nothing reads it.
  const readers = [];
  for (const dir of ['packages/core/src', 'packages/client/src', 'cli.ts']) {
    const walk = (p) => {
      const full = resolve(ROOT, p);
      let entries;
      try { entries = readdirSync(full, { withFileTypes: true }); } catch { return [full]; }
      return entries.flatMap((e) => walk(`${p}/${e.name}`));
    };
    for (const f of walk(dir)) {
      if (!f.endsWith('.ts')) continue;
      if (f.endsWith('derive/occupancy.ts')) continue;
      if (readFileSync(f, 'utf8').includes('crossesDay')) readers.push(f.replace(`${ROOT}/`, ''));
    }
  }
  note(`production readers of OccupiedInterval.crossesDay: ${readers.length === 0 ? 'NONE' : readers.join(', ')}`);
  ok(readers.length > 0, 'the field A-96 Part 2 added to record the clamp is read by the renderer that shows the clamped value');
}

// -------------------------------------------------------------------------------------- C
if (on('C')) {
  head('C', 'R71-2 — trip_overview\'s BOTH-zero arm contradicts its own facts');
  // A trip at the start of its life: bookings and pooled ideas are on it, days and cities are not.
  const early = { ...trip, days: [], cities: [] };
  const a = core.ask({ kind: 'trip_overview' }, ctx(early));
  const f = (l) => a.facts.find((x) => x.label === l)?.value;
  note(`text: ${a.text}`);
  note(`caveat: ${a.caveats.map((c) => c.message).join(' | ')}`);
  note(`its own facts: stop_count=${f('stop_count')} pool_count=${f('pool_count')} place_count=${f('place_count')} booking_count=${f('booking_count')}`);
  const held = Number(f('pool_count')) + Number(f('place_count')) + Number(f('booking_count'));
  ok(!(/nothing to summarise|nothing more I can tell you/.test(`${a.text} ${a.caveats.map((c) => c.message).join(' ')}`) && held > 0),
    `the answer says there is nothing to summarise while carrying ${held} records in its own facts`);
  ok(!(a.coverage === 'none' && held > 0),
    `coverage is not \`none\` over a document holding ${held} records — the field a surface branches on`);
  // The two arms R70-1 DID fix, as controls.
  const noDays = core.ask({ kind: 'trip_overview' }, ctx({ ...trip, days: [] }));
  const noCities = core.ask({ kind: 'trip_overview' }, ctx({ ...trip, cities: [], days: trip.days.map((d) => ({ ...d, cities: [] })) }));
  ok(noDays.text.includes('no days') && !noDays.text.includes('no cities'), 'control (R70-1): 0 days / 6 cities names only the count that is zero');
  ok(noCities.text.includes('no cities') && !noCities.text.includes('no days'), 'control (R70-1): 16 days / 0 cities names only the count that is zero');
  ok(noDays.coverage === 'partial' && noCities.coverage === 'partial', 'control (R70-1): one-zero documents are `partial`, not `none`');
}

// -------------------------------------------------------------------------------------- D
if (on('D')) {
  head('D', 'R71-3 — R70-5\'s lifetime class is adjacency-matched, so an adverb defeats it');
  const refused = (t) => {
    const m = core.matchQuestion(t, trip);
    return m.kind === 'out_of_scope' && m.reason === 'lifetime';
  };
  const answered = (t) => {
    const m = core.matchQuestion(t, trip);
    return m.kind === 'matched' ? core.ask(m.question, ctx(trip)).text.slice(0, 44) : '';
  };
  // Controls: the five phrasings R70-5 named, all closed.
  for (const t of ['how many countries have I visited', 'how many countries have I seen',
    'how many countries have I stayed in', 'which countries have I visited', 'how many countries did I visit']) {
    ok(refused(t), `control, R70-5 closed it: "${t}"`);
  }
  // One adverb between the auxiliary and the participle.
  for (const t of ['how many countries have I already been to', 'how many countries have I now visited',
    'how many countries have I actually visited', 'how many countries have I ever really been to']) {
    ok(refused(t), `"${t}"${answered(t) ? ` → answered "${answered(t)}…"` : ''}`);
  }
  // `match.ts:118` — "The same class in the bare-infinitive frame `did I <verb>` / `have I not
  // <verb>`." The second frame in that sentence is not implemented in `lifetimeFrame`.
  for (const t of ['how many countries have I not visited', 'how many countries have I not been to']) {
    ok(refused(t), `the frame match.ts:118's comment claims: "${t}"${answered(t) ? ` → answered "${answered(t)}…"` : ''}`);
  }
  // First person PLURAL, on a product whose second pillar is shared trips.
  ok(refused('how many countries have we visited'), '"how many countries have we visited" (a shared trip is a first-person-plural document)');
  // Totality markers the list does not carry.
  ok(refused('how many countries to date'), '"how many countries to date" — `to date` is `so far`');
  // The trip-scoped neighbours must stay answerable.
  for (const t of ['how many countries am I visiting', 'which countries am I visiting', 'have I booked everything']) {
    ok(!refused(t), `control, still answerable: "${t}"`);
  }
}

// -------------------------------------------------------------------------------------- E
if (on('E')) {
  head('E', 'R71-4 — intervalIntersects tests only the END of a stated run');
  const EV = [timeVal('18:00'), timeVal('23:59')];
  const occupies = (s) => {
    const i = occ.occupiedInterval(s);
    return i === null ? null : occ.intervalIntersects(i, EV[0], EV[1]);
  };
  // The invariant the doc comment implies: a stop that STARTS inside the window occupies it,
  // whatever run length it states. It holds for `source === null` and for `mins > 0`.
  const at = (time, patch) => stopLike({ placement: { kind: 'scheduled', dayId: 'd', time, order: 0 }, ...patch });
  const cases = [
    ['18:00, no run length stated', at('18:00', {}), true],
    ['18:00, durationMins 60', at('18:00', { durationMins: 60 }), true],
    ['18:00, durationMins 0', at('18:00', { durationMins: 0 }), true],
    ['20:00, durationMins 0', at('20:00', { durationMins: 0 }), true],
    ['20:00, durationMins -300', at('20:00', { durationMins: -300 }), true],
    ['20:00, journey arrival.mins -300', at('20:00', { travelRole: 'journey', arrival: { mode: 'bus', mins: -300 } }), true],
  ];
  for (const [label, s, expected] of cases) {
    const got = occupies(s);
    ok(got === expected, `a stop starting inside 18:00–23:59 occupies it — ${label} → ${got}`);
  }
  // …and what that does to an answer. Both values pass `fromJSON` (`numOf` checks finite only).
  for (const [label, mins] of [['durationMins: 0 at 18:00', 0], ['durationMins: -600', -600]]) {
    const doc = {
      ...trip,
      days: trip.days.map((d) => (!d.cities.includes('split') ? d : ({
        ...d,
        stops: d.stops.map((s) => ({
          ...s, durationMins: mins,
          placement: mins === 0 && s.placement.kind === 'scheduled' ? { ...s.placement, time: '18:00' } : s.placement,
        })),
      }))),
    };
    const a = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctx(doc));
    note(`${label} → ${a.text.slice(0, 150)}…`);
    ok(!/^Yes\./.test(a.text), `${label}: Split's evenings are not reported clear when stops start inside the window`);
  }
  // The boundary the builder DID get right — the trap A-96 Part 2 names.
  ok(occ.stopOccupancy(stopLike({ travelRole: 'transfer', arrival: { mode: 'bus', mins: 80 } })) === null,
    'the trap: an `arrival` on a `transfer` stop is not occupancy');
  ok(occ.stopOccupancy(stopLike({ travelRole: 'unknown', arrival: { mode: 'bus', mins: 80 } })) === null,
    "the trap: `'unknown'` is not `'journey'` and states nothing");
  ok(occ.stopOccupancy(stopLike({ travelRole: undefined, arrival: { mode: 'bus', mins: 80 } })) === null,
    'a stop with no `travelRole` at all does not get the fallback');
  const v = classifyDay(dayOf([stopLike({ travelRole: undefined, arrival: { mode: 'bus', mins: 80 } })]), 'evening');
  ok(v.state === 'busy' && v.withoutOccupancy.length === 1,
    'and it degrades to "states no run length" rather than to a wrong number');
}

// -------------------------------------------------------------------------------------- F
if (on('F')) {
  head('F', 'R71-5 — restate() passes the chokepoint and nothing asserts that it does');
  const dirty = { ...trip, cities: trip.cities.map((c) => (c.key === 'london' ? { ...c, name: 'LONDON' } : c)) };
  const r = restate({ kind: 'city_edge', cityKey: 'london', edge: 'leave' }, dirty);
  note(`restate → "${r}"`);
  ok(r.includes('[redacted]'), 'today, restate() does redact — BUILD-NOTES disclosure 3 is implemented');
  // …and it is unguarded. Reverting `cityProse` to `cityName` in `restate` leaves the suite at
  // 1,945 pass / 0 fail and typecheck at exit 0 — run in a throwaway worktree, round 71:
  //   git worktree add /tmp/wt e0fea87 && cp -r cairn/node_modules /tmp/wt/cairn/
  //   sed -i 's/cityProse(trip, question.cityKey)/cityName(trip, question.cityKey)/g' \
  //     /tmp/wt/cairn/packages/core/src/ask/match.ts && (cd /tmp/wt/cairn && npm run test:tap)
  const testDir = resolve(ROOT, 'packages/core/test');
  const guarded = readdirSync(testDir).filter((f) => f.endsWith('.ts')).some((f) => {
    const src = readFileSync(resolve(testDir, f), 'utf8');
    return /redactionHits\s*\(\s*[A-Za-z.]*restate/.test(src) || /restate\([^)]*\)[^;]*redactionHits/.test(src);
  });
  ok(guarded, 'some test asserts redactionHits over restate()\'s own output — otherwise the disclosure is decorative');

  // And at the only surface that prints it, the raw name is printed BESIDE the redacted one.
  const cliSrc = readFileSync(resolve(ROOT, 'cli.ts'), 'utf8');
  const raw = /function questionLine[\s\S]*?const name = \(key: string\) => trip\.cities\.find/.test(cliSrc);
  note(`cli.ts questionLine interpolates the raw City.name: ${raw}`);
  note('so `ask "when do I leave for LONDON"` prints: `1. when you leave [redacted]  —  ask it as: when do I leave LONDON`');
  ok(!raw || !r.includes('[redacted]'),
    'the restatement and the menu line beside it agree about whether a city name may be shown');
}

// -------------------------------------------------------------------------------------- G
if (on('G')) {
  head('G', 'R71-6 — four prose rough edges in I-37\'s own sentences');
  // 1. An untimed stop makes the day `unknown`, and the sentence offers the CENSUS as the reason
  //    — a census that reads zero. The real reason is only in the caveat.
  const timed = {
    ...trip,
    days: trip.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => {
        const n = { ...s, durationMins: 45 };
        return d.id === '2026-08-14' && s.placement.kind === 'scheduled' && s.placement.time === '17:15'
          ? { ...n, placement: { ...s.placement, time: null } } : n;
      }),
    })),
    pool: trip.pool.map((s) => ({ ...s, durationMins: 45 })),
  };
  const a = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctx(timed));
  note(`text: ${a.text}`);
  ok(!/but 0 of the \d+ stops.*state no run length\. So I cannot say/.test(a.text),
    'the "I can\'t tell" sentence does not give as its reason a census that reads zero');
  // 2. Verb agreement in the `time_unknown` caveat.
  const cav = a.caveats.find((c) => c.code === 'time_unknown');
  note(`caveat: ${cav?.message}`);
  ok(!/1 scheduled stop in this range carry/.test(cav?.message ?? ''), '`1 scheduled stop … carry no time` — the noun is pluralised and the verb is not');
  // 3. The whole-trip `no_records` caveat says "this trip" twice.
  const zero = core.ask({ kind: 'free_time', part: 'evening', cityKey: null }, ctx({ ...trip, days: [] }));
  note(`caveat: ${zero.caveats[0]?.message}`);
  ok(!/No day of this trip is recorded for this trip\./.test(zero.caveats[0]?.message ?? ''), '`No day of this trip is recorded for this trip.`');
  // 4. A one-day scope renders "every one of the 1 day".
  const oneDay = { ...trip, days: trip.days.filter((d) => d.id === '2026-08-14') };
  const b = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctx(oneDay));
  note(`text: ${b.text.slice(0, 110)}…`);
  ok(!/every one of the 1 day/.test(b.text), '`on every one of the 1 day in Split`');
  // 5. `.trim()` binds to the second template literal, not to the concatenation, so the `Yes.` arm
  //    ends in a trailing space whenever no day is busy. (The `No.` arm's version is §I.)
  const allOpen = { ...trip, days: trip.days.filter((d) => d.id === '2026-08-14').map((d) => ({ ...d, stops: d.stops.map((s) => ({ ...s, durationMins: 5, placement: s.placement.kind === 'scheduled' ? { ...s.placement, time: '09:00' } : s.placement })) })) };
  const c = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctx(allOpen));
  note(`text: ${JSON.stringify(c.text.slice(-40))}`);
  ok(!/ $/.test(c.text), 'the `Yes.` arm does not end in a trailing space');
}

// -------------------------------------------------------------------------------------- I
if (on('I')) {
  head('I', 'R71-7 — a `busy` day whose occupying stop is not a journey renders no clause');
  // A-96 Part 3 introduced `runsInto` — a stop whose STATED run reaches into the window. The
  // renderer handles only the JOURNEY half of it: `busyRuns` is gated on `run.stop.arrival`, and a
  // stop that states its own `durationMins` and carries no `arrival` falls to the `starts` branch,
  // where there is nothing to render. This is the ordinary shape of a Cairn-native stop — A-96
  // Part 5 says the fixture cannot reach it only because the legacy planner recorded no durations.
  const proto = trip.days[0].stops[0];
  // Real provenance off the fixture, so every document below survives `fromJSON` — this finding is
  // claimed as reachable through `cli.ts ask --file` and the probe proves the file is parseable.
  const prov = trip.days[0].provenance;
  const mkDay = (date, stops) => ({ id: date, date, primaryCity: 'split', cities: ['split'], title: '', subtitle: '', stops, provenance: prov });
  const mkStop = (id, time, patch) => ({
    ...proto, id, name: 'evening plan', travelRole: 'transfer', arrival: null, durationMins: null,
    bookingId: null, ticket: null, placement: { kind: 'scheduled', dayId: date0, time, order: 0 }, ...patch,
  });
  const date0 = '2026-08-12';
  const splitOnly = (days) => ({ ...trip, pool: [], cities: trip.cities.filter((c) => c.key === 'split'), days });

  // (a) Every busy day is busy by a stated-duration run. No clause at all.
  const allRuns = splitOnly([
    mkDay('2026-08-12', [mkStop('s1', '16:30', { durationMins: 120 })]),
    mkDay('2026-08-13', [mkStop('s2', '16:00', { durationMins: 180 })]),
  ]);
  const a = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctx(allRuns));
  note(`text: ${JSON.stringify(a.text)}`);
  note(`facts: ${a.facts.filter((f) => f.label === 'day_state').map((f) => `${f.params.date}=${f.value} runsInto=${f.params.runsIntoWindow} starts=${f.params.startsInWindow}`).join(' | ')}`);
  ok(/in Split: /.test(a.text), 'a confident "No." over two days that each carry a stated run states its evidence');
  // The `.trim()` in the `No.` arm binds to the second template literal, not to the concatenation,
  // so when the census half is empty the whole answer ends in a space. Same in the `Yes.` arm.
  ok(!/ $/.test(a.text), `and it does not end in a trailing space — ${JSON.stringify(a.text.slice(-12))}`);

  // (b) Mixed — and the count in the prose is then WRONG, not merely absent.
  const mixed = splitOnly([
    mkDay('2026-08-12', [mkStop('j', '17:15', { travelRole: 'journey', arrival: { mode: 'bus', mins: 80 } })]),
    mkDay('2026-08-13', [mkStop('d', '16:30', { durationMins: 120 })]),
    mkDay('2026-08-14', [mkStop('s', '20:00', { durationMins: 60 })]),
  ]);
  const b = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctx(mixed));
  note(`text: ${b.text}`);
  note(`facts: ${b.facts.filter((f) => f.label === 'day_state').map((f) => `${f.params.date}=${f.value} runsInto=${f.params.runsIntoWindow} starts=${f.params.startsInWindow}`).join(' | ')}`);
  const named = new Set([...b.text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map((m) => m[1]));
  const busyDates = b.facts.filter((f) => f.label === 'day_state' && f.value === 'busy').map((f) => String(f.params.date));
  note(`busy days: ${busyDates.length}; days the sentence accounts for: 1 named (${[...named].join(',')}) + "the other one"`);
  ok(!/and the other one has something starting/.test(b.text) || busyDates.length === 2,
    `"the other one" is a count over ${busyDates.length} busy days, and it accounts for 2 of them`);
  ok(b.coverage !== 'complete' || busyDates.every((d) => named.has(d)) || /the other \d+/.test(b.text),
    'a `complete` answer accounts for every day it says is busy');

  // (c) The document is one the shipped parser accepts, so the route is `cli.ts ask --file`.
  let reparsed = null;
  try { reparsed = core.fromJSON(core.toJSON(mixed)); } catch (err) { note(`fromJSON refused: ${err.message}`); }
  ok(reparsed !== null, 'the document behind (b) round-trips through toJSON/fromJSON — it is a file a user can open');
  if (reparsed) {
    const c = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctx(reparsed));
    ok(c.text === b.text, 'and the answer off the re-parsed document is the same bytes');
  }
}

// -------------------------------------------------------------------------------------- H
if (on('H')) {
  head('H', 'ADJUDICATION — the chokepoint, the rename, the allow row, the identity');

  // H1 — every user-authored string field carries a distinct sentinel. Only `City.name`, the one
  // field A-96 Part 6 makes admissible, may reach prose.
  const S = (k) => `Zqx${k}qzx`;
  const doc = {
    ...trip,
    title: S('title'),
    cities: trip.cities.map((c) => ({ ...c, name: S(`city${c.key}`) })),
    places: trip.places.map((p) => ({ ...p, name: S('place'), note: S('placenote') })),
    bookings: trip.bookings.map((b) => ({
      ...b, operator: S('operator'), reference: S('bref'),
      ...(b.route ? { route: { fromName: S('routefrom'), toName: S('routeto') } } : {}),
      ...(b.seat !== undefined ? { seat: S('seat') } : {}),
      ...(b.ticket ? { ticket: { ...b.ticket, label: S('ticketlabel') } } : {}),
    })),
    days: trip.days.map((d) => ({
      ...d, title: S('daytitle'), subtitle: S('daysub'),
      stops: d.stops.map((s) => ({
        ...s, name: S('stopname'), note: S('stopnote'),
        ...(s.arrival ? { arrival: { ...s.arrival, label: S('arrlabel') } } : {}),
        flags: s.flags.map(() => S('flag')),
      })),
    })),
    pool: trip.pool.map((s) => ({ ...s, name: S('poolname'), note: S('poolnote') })),
  };
  const RE = /Zqx[a-z0-9]+qzx/g;
  const seen = new Set();
  let answers = 0;
  for (const q of core.askableQuestions(doc)) {
    for (const today of [PLANNED, OVER]) {
      const a = core.ask(q, ctx(doc, today));
      for (const s of [a.text, ...a.caveats.map((c) => c.message), restate(q, doc)]) {
        for (const h of String(s).match(RE) ?? []) seen.add(h);
      }
      answers += 1;
    }
  }
  ok(answers > 0, 'the sentinel sweep asserted something');
  const nonCity = [...seen].filter((h) => !h.startsWith('Zqxcity'));
  note(`fields that reached prose: ${[...seen].map((h) => h.replace(/^Zqx|qzx$/g, '')).join(', ') || 'none'}`);
  ok(nonCity.length === 0, `only City.name reaches prose — ${nonCity.join(', ') || 'confirmed over every field of the model'}`);

  // H2 — `redactText`'s own boundary. The chokepoint is exactly as good as §6.6, and §11.8's
  // criterion uses `redactionHits` as BOTH the guard and the oracle, so it cannot see this.
  for (const n of ['LONDON', 'London door code 4821', 'London flat 4821', 'London wifi hunter2', 'ЛОНДОН', 'London ４８２１']) {
    const d = { ...trip, cities: trip.cities.map((c) => (c.key === 'london' ? { ...c, name: n } : c)) };
    const a = core.ask({ kind: 'city_edge', cityKey: 'london', edge: 'leave' }, ctx(d));
    const narrated = a.text.match(/^You leave (.*?) on /)?.[1] ?? '?';
    note(`city "${n}" → redactionHits(name)=${JSON.stringify(core.redactionHits(n))} narrated "${narrated}" hits(text)=${JSON.stringify(core.redactionHits(a.text))}`);
    ok(core.redactionHits(a.text).length === 0, `the chokepoint is faithful to §6.6 for "${n}"`);
  }

  // H3 — the `stops_without_duration` → `stops_without_occupancy` rename. `AnswerFact.label` is a
  // free `string`, no closed union and no golden, and the number it labels counts run length by
  // ANY field. The rename is right; `qa/r70-ask.mjs` is what moves.
  const census = core.ask({ kind: 'free_time', part: 'evening', cityKey: 'split' }, ctx(trip))
    .facts.find((f) => f.label === 'stops_without_occupancy');
  const splitStops = trip.days.filter((d) => d.cities.includes('split')).flatMap((d) => d.stops);
  const silent = splitStops.filter((s) => occ.stopOccupancy(s) === null);
  note(`stops_without_occupancy = ${census.value} of ${census.params.of}; re-derived ${silent.length} of ${splitStops.length}`);
  ok(Number(census.value) === silent.length && Number(census.params.of) === splitStops.length,
    'the census counts stops that state no run length in ANY field, which is what the new label says');
  const goldens = readdirSync(resolve(ROOT, 'fixtures/golden')).filter((f) => f.endsWith('.json'));
  const inGolden = goldens.filter((f) => readFileSync(resolve(ROOT, 'fixtures/golden', f), 'utf8').includes('stops_without'));
  ok(inGolden.length === 0, `no golden pins an AnswerFact label — ${goldens.length} checked`);

  // H4 — the `SOURCE_ALLOW` row is keyed `<path>::<name>` and the tripwire separately asserts
  // that every key is SEEN, so it cannot cover a second declaration site.
  const stats = readFileSync(resolve(ROOT, 'test/stats-storage.test.ts'), 'utf8');
  ok(stats.includes("'packages/core/src/ask/freeTime.ts::stopCount'"), 'the new allow row is file-scoped to freeTime.ts');
  ok(!/SOURCE_ALLOW\[[^\]]*\breplace\b/.test(stats) && stats.includes('Object.keys(SOURCE_ALLOW).filter((k) => !seen.has(k))'),
    'the tripwire rejects a stale allow row, so the entry cannot outlive its declaration');
  const summarySrc = readFileSync(resolve(ROOT, 'packages/core/src/derive/summary.ts'), 'utf8');
  ok(summarySrc.includes('stopCount'), "control: `stopCount` is declared in summary.ts too, and that site is NOT allow-listed by the new row");

  // H5 — the `overlap` identity, re-derived over every stop rather than trusted.
  const oldOccupancy = (s) => {
    if (s.durationMins != null) return { mins: s.durationMins, derived: false };
    if (s.travelRole === 'journey' && s.arrival) return { mins: s.arrival.mins, derived: true };
    return null;
  };
  const all = [...trip.days.flatMap((d) => d.stops), ...trip.pool];
  const variants = all.flatMap((s) => [
    s,
    { ...s, durationMins: 45 },
    { ...s, travelRole: 'journey', arrival: { mode: 'bus', mins: 90 } },
    { ...s, travelRole: 'unknown', arrival: { mode: 'bus', mins: 90 } },
    { ...s, travelRole: 'transfer' },
    { ...s, arrival: null },
  ]);
  const same = variants.every((s) => {
    const a = oldOccupancy(s);
    const b = occ.stopOccupancy(s);
    if (a === null || b === null) return a === b;
    return a.mins === b.mins && a.derived === (b.source === 'journey_run');
  });
  ok(same, `stopOccupancy ≡ overlap.ts's deleted private occupancy over ${variants.length} stop shapes`);
  const conflicts = core.detectConflicts(trip, { today: PLANNED }).filter((c) => c.ruleId === 'overlap');
  ok(conflicts.length === 0, '`overlap` still returns 0 findings on the reference trip (§2.7)');
}

// -------------------------------------------------------------------------------------- J
if (on('J')) {
  head('J', 'the ceilings — zero non-core imports, no ambient input, determinism');
  const bad = [];
  for (const [dir, files] of [['packages/core/src/ask', null], ['packages/core/src/derive', ['occupancy.ts']]]) {
    const names = files ?? readdirSync(resolve(ROOT, dir)).filter((f) => f.endsWith('.ts'));
    for (const f of names) {
      const src = readFileSync(resolve(ROOT, dir, f), 'utf8');
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const m of code.matchAll(/from\s+'([^']+)'/g)) if (!m[1].startsWith('.')) bad.push(`${dir}/${f}: ${m[1]}`);
      // `window` is NOT in this list: `freeTime.ts` and `ask.ts` both hold a local
      // `const window = DAYPART_WINDOWS[part]`, which is a daypart and not the DOM. `globalThis`
      // and `document` are the checkable forms of the same constraint.
      for (const b of ['Date.now', 'new Date', 'Math.random', 'crypto.', 'fetch(', 'node:', 'process.', 'document.', 'globalThis', 'Intl.', 'toLocale']) {
        if (code.includes(b)) bad.push(`${dir}/${f}: ${b}`);
      }
    }
  }
  ok(bad.length === 0, `ask/ and derive/occupancy.ts take no dependency and no ambient input — ${bad.join(', ') || 'clean'}`);

  let stable = true;
  const menu = core.askableQuestions(trip);
  for (const q of menu) if (JSON.stringify(core.ask(q, ctx(trip))) !== JSON.stringify(core.ask(q, ctx(trip)))) stable = false;
  ok(stable, `every one of the ${menu.length} menu answers is byte-identical across two calls`);

  // Purity: `ask` and `classifyDay` do not mutate the document they read.
  const before = JSON.stringify(core.toJSON(trip));
  for (const q of menu) core.ask(q, ctx(trip));
  for (const d of trip.days) for (const p of PARTS) classifyDay(d, p);
  ok(JSON.stringify(core.toJSON(trip)) === before, 'nothing in ask/ or derive/occupancy.ts mutates the trip');
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL`}`);
process.exitCode = fails === 0 ? 0 : 1;
