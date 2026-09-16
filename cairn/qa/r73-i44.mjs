/**
 * QA round 73 — the confirmation pass over ROADMAP **I-44** (ARCHITECTURE **§11.13 A-98**), at
 * `master` = `4142ecb`. Round 72 routed the question; A-98 answered it by **deleting** a list and
 * replacing it with whole-sentence equality against 816 sentences Cairn wrote. This asks whether
 * that closed R72-1, and attacks the code A-98 added on its own merits.
 *
 * Run from `cairn/`:
 *
 *   node qa/r73-i44.mjs            # every section — offline, ~15 s, writes nothing
 *   node qa/r73-i44.mjs A D        # named sections only
 *
 * Sections, and what each carries:
 *
 *   A  CONFIRMS  **R72-1 is CLOSED.** The accept set, regenerated here from A-98 Part 3's own
 *                published fragments rather than read out of the implementation: 816, no
 *                duplicates, every one answers, every one reports `unread: []`, 0 trip the
 *                lifetime diagnosis, 126 carry no country trigger at all. **R73-5** and **R73-6**
 *                live here — the set's EDGES, which is the only place A-97 rider 4's MAJOR class
 *                can still occur.
 *   B  R73-6     recall, measured on a corpus built independently of the builder's 18.
 *   C  CONFIRMS  A-98 Part 7's candidate filter, three pinned outcomes plus the structural reason
 *                it cannot discard a reading. **R73-7**: `scope_unclear`'s text is false of a
 *                sentence that names a city of this trip.
 *   D  **R73-1** the mode word is attached to a run length the mode's own field contradicts —
 *                *"you are on a flight from 16:45 until 20:05"* about a 660-minute flight,
 *                reachable through `updateStop` on the reference trip's own flagship leg.
 *   E  **R73-3** the numeral for a population of one, still standing at two more sites — one of
 *                them inside the sentence R72-6 fixed.
 *   F  **R73-2** R72-3's fix renders `24:00` in prose, where round 72 measured 0 malformed clocks.
 *   G  the ceilings: §2.10 stays 91, neither internal export reaches `index.ts`, the 48 verdicts
 *      are 46/0/2, criterion rule 11's pointer round-trip, determinism, and the increment's fence.
 *
 * A `FAIL` line is a finding. `note` lines are measurements recorded rather than asserted.
 * This script reads the fixture and the sources as text, and writes nothing.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const core = await import(resolve(ROOT, 'packages/core/src/index.ts'));
const { classifyDay } = await import(resolve(ROOT, 'packages/core/src/ask/freeTime.ts'));
const occ = await import(resolve(ROOT, 'packages/core/src/derive/occupancy.ts'));
const { matchQuestion, lifetimeScoped } = await import(resolve(ROOT, 'packages/core/src/ask/match.ts'));
const { journeyModeWord } = await import(resolve(ROOT, 'packages/core/src/ask/ask.ts'));
const { loadEurope2026 } = await import(resolve(ROOT, 'fixtures/loadEurope2026.mjs'));

const { trip } = loadEurope2026();
const PLANNED = '2026-08-01';
const ctx = (t, today = PLANNED) => ({ trip: t, today, index: core.COUNTRY_INDEX });
const PARTS = ['morning', 'afternoon', 'evening'];

let fails = 0;
const want = process.argv.slice(2).filter((a) => /^[A-G]$/.test(a));
const on = (s) => want.length === 0 || want.includes(s);
const ok = (cond, label) => { console.log(`${cond ? '  ok  ' : '  FAIL'} ${label}`); if (!cond) fails++; };
const note = (label) => console.log(`  note  ${label}`);
const head = (s, title) => console.log(`\n§${s} ${title}`);

const base = trip.days[0].stops[0];
const stopAt = (time, patch = {}, id = 'probe-1') => ({
  ...base, id, name: 'probe', bookingRef: null, durationMins: null, travelRole: 'transfer', arrival: null,
  placement: { kind: 'scheduled', dayId: 'd1', time, order: 0 }, ...patch,
});
const dayOf = (stops, date = '2026-08-10', id = 'd1') => ({ ...trip.days[0], id, date, cities: ['split'], stops });
const splitDoc = (days) => ({ ...trip, days });
const askFree = (doc, part = 'evening', cityKey = 'split') => core.ask({ kind: 'free_time', part, cityKey }, ctx(doc));

const outcome = (q) => {
  const m = matchQuestion(q, trip);
  return m.kind === 'out_of_scope' ? `out_of_scope:${m.reason}` : m.kind === 'matched' ? `matched:${m.question.kind}` : m.kind;
};
const answers = (q) => outcome(q) === 'matched:country_count';

// ---------------------------------------------------------------------------------------------
// The 43 fragments, transcribed from ARCHITECTURE §11.13 A-98 Part 3 — the DOCUMENT's copy, not
// the implementation's. A fragment that drifted on either side is a difference here.
// ---------------------------------------------------------------------------------------------
const STEMS = ['how many countries', 'how many different countries', 'which countries',
  'what countries', 'number of countries', 'countries'];
const DETERMINERS = ['this', 'my', 'the', 'our'];
const NOUNS = ['trip', 'itinerary'];
const NP_FRAMES = ['on <np>', 'in <np>', 'are on <np>', 'are in <np>', 'does <np> visit',
  'does <np> cover', 'does <np> go to', 'does <np> include', 'is <np>',
  'am i visiting on <np>', 'are we visiting on <np>', 'do i visit on <np>',
  'do we visit on <np>', 'will i visit on <np>', 'will we visit on <np>'];
const BARE_FRAMES = ['am i visiting', 'are we visiting', 'will i visit', 'will we visit',
  'do i visit', 'do we visit', 'am i seeing', 'are we seeing', 'will i see',
  'will we see', 'do i go to', 'do we go to', 'am i going to', 'are we going to',
  'am i travelling to', 'are we travelling to'];
const NPS = DETERMINERS.flatMap((d) => NOUNS.map((n) => `${d} ${n}`));
const FRAMES = [...BARE_FRAMES, ...NP_FRAMES.flatMap((f) => NPS.map((np) => f.replace('<np>', np)))];
const ACCEPT_RAW = STEMS.flatMap((s) => FRAMES.map((f) => `${s} ${f}`));

// -------------------------------------------------------------------------------------- A
if (on('A')) {
  head('A', 'CONFIRMS R72-1 — the accept set, regenerated from A-98 Part 3 and attacked at its edges');

  const fragments = STEMS.length + DETERMINERS.length + NOUNS.length + NP_FRAMES.length + BARE_FRAMES.length;
  ok(fragments === 43, `A-98 Part 3 publishes 43 fragments; the document's lists hold ${fragments}`);
  ok(FRAMES.length === 136 && ACCEPT_RAW.length === 816, `6 × (16 + 15 × 8) = ${ACCEPT_RAW.length} from ${FRAMES.length} frames`);
  const unique = new Set(ACCEPT_RAW);
  ok(unique.size === 816, `no two fragment pairs collide: ${unique.size} distinct of ${ACCEPT_RAW.length} generated`);

  // R72-1's own population, and the three preposition cases A-98 Part 1 adds. At `5fa74e1` all
  // thirteen reached `matched: country_count`.
  const lifetime = [
    'how many countries do I have under my belt', 'how many countries am I up to',
    'how many countries am I on now', 'what countries do I still need to visit',
    'how many countries do we have between us', 'how many countries do I have left in the world',
    'which countries do I still have to see', 'how many countries am I missing',
    'how many countries do I have on my list', 'which countries am I yet to visit',
    'how many countries am I up to including this trip',
    'which countries am I yet to visit before this trip',
    'apart from this trip how many countries am I up to',
  ];
  const escaped = lifetime.filter(answers);
  ok(escaped.length === 0, `R72-1: ${escaped.length} of 13 lifetime phrasings still reach an answer: ${JSON.stringify(escaped)}`);
  ok(lifetime.every((q) => outcome(q).startsWith('out_of_scope')), 'every one refuses rather than falling through to `unrecognised`');
  // And none of them is a member, which is the property that makes the refusal structural.
  ok(!lifetime.some((q) => unique.has(q.toLowerCase())), 'none of the thirteen is a sentence Cairn wrote');

  let notAnswered = [], withUnread = [], trippedLifetime = [], noTrigger = 0;
  const TRIGGERS = ['how many countries', 'how many different countries', 'number of countries',
    'which countries', 'what countries', 'countries am i visiting', 'countries on this trip'];
  for (const s of unique) {
    const m = matchQuestion(s, trip);
    if (!(m.kind === 'matched' && m.question.kind === 'country_count')) notAnswered.push(s);
    else if (m.unread.length > 0) withUnread.push(s);
    if (lifetimeScoped(s)) trippedLifetime.push(s);
    if (!TRIGGERS.some((t) => s.includes(t))) noTrigger++;
  }
  ok(notAnswered.length === 0, `every authored sentence answers: ${notAnswered.length} do not${notAnswered.length ? ` (${notAnswered[0]})` : ''}`);
  ok(withUnread.length === 0, `BUILD-NOTES disclosure 2 — every authored sentence reports \`unread: []\`: ${withUnread.length} do not`);
  ok(trippedLifetime.length === 0, `A-98 Part 9 criterion 2, re-derived: ${trippedLifetime.length} of 816 trip the lifetime diagnosis`);
  ok(noTrigger === 126, `BUILD-NOTES disclosure 3's substitute: ${noTrigger} of 816 carry no COUNTRY_TRIGGERS phrase and answer anyway`);
  // The substitute is only half of "the list authorises nothing". The other half — the list is
  // not SUFFICIENT either — is what makes the pair as strong as the claim it replaces.
  ok(outcome('which countries are we booking') === 'out_of_scope:scope_unclear',
    'and the other half: a sentence carrying a trigger is refused, so the list is neither necessary nor sufficient for an answer');

  // **R73-5 — the edge, and the only way A-97 rider 4's MAJOR class can still occur.**
  //
  // `BARE_FRAMES` is justified in the source as *"frames that name no document and are trip-scoped
  // by their own TENSE"*. Four of the sixteen are **present simple**, which is not a tense that
  // scopes to an occasion — it is habitual/generic, and a habitual question about travel resolves
  // against the library `travelStats` answers, not against the document in hand. A-98 Part 1's own
  // argument says so in as many words: *"first-person marker plus forward-looking travel verb is
  // present on both sides of the boundary"*, and it kills the marker list for exactly that.
  const HABITUAL = ['do i visit', 'do we visit', 'do i go to', 'do we go to'];
  const habitualCells = STEMS.flatMap((s) => HABITUAL.map((f) => `${s} ${f}`));
  note(`R73-5 candidates: ${habitualCells.length} cells over 4 present-simple bare fragments`);
  for (const q of ['what countries do I visit', 'which countries do I go to', 'how many countries do we visit']) {
    note(`  "${q}" → ${outcome(q)}`);
  }
  ok(!habitualCells.every(answers),
    'R73-5: a present-simple bare frame ("what countries do I visit") is habitual, not trip-scoped, and is answered about this trip');

  // **R73-6 — the set is not closed under adding the document's own noun phrase.**
  //
  // Six of the sixteen bare frames have an `… on <np>` twin in `NP_FRAMES`; ten do not. So making
  // an accepted sentence MORE explicit about its scope — appending the one phrase that can only
  // mean this document — turns an answer into a refusal.
  let closed = 0; const broken = [];
  for (const s of STEMS) for (const f of BARE_FRAMES) {
    if (answers(`${s} ${f} on this trip`)) closed++; else broken.push(`${s} ${f} on this trip`);
  }
  note(`closure over "<accepted bare sentence> on this trip": ${closed} answer, ${broken.length} refuse`);
  note(`  e.g. "${broken[0]}" → ${outcome(broken[0])}, while "${broken[0].replace(' on this trip', '')}" → ${outcome(broken[0].replace(' on this trip', ''))}`);
  ok(broken.length === 0,
    `R73-6: adding "on this trip" to an accepted sentence refuses it in ${broken.length} of ${closed + broken.length} cases`);
}

// -------------------------------------------------------------------------------------- B
if (on('B')) {
  head('B', 'R73-6 — recall, on a corpus built independently of the builder\'s 18');
  // BUILD-NOTES discloses that 7 of the 15 phrasings behind the published floor are the builder's
  // own, each written as a cell of the factor lists, and asks for an independent corpus if it
  // differs. This is forty phrasings written before the accept set was read, from the shape of the
  // question Jacob would actually type about his own trip.
  const corpus = [
    'how many countries am I visiting', 'how many countries is this trip',
    'how many countries do I visit on this trip', 'how many countries does this trip cover',
    'which countries am I visiting', 'what countries am I visiting',
    'how many countries on this trip', 'how many countries',
    'how many countries this trip', 'how many countries are we hitting',
    'how many countries will we be in', 'how many countries are we going to',
    'how many countries does the trip include', 'countries on this trip',
    'how many countries in total on this trip', 'how many countries am i visiting?',
    'how many countries are there on this trip', 'how many countries does this trip take me to',
    'how many countries will I be in', 'what countries will I see',
    'how many different countries am I visiting', 'how many countries are we visiting in total',
    'so how many countries am I visiting', 'how many countries am I visiting on this trip',
    'how many countries have I visited on this trip', 'list the countries on this trip',
    'what countries are on my itinerary', 'how many countries total',
    'which countries does this trip go to', 'how many countries am I going to visit',
    'how many countries am I travelling to', 'tell me how many countries I am visiting',
    'how many countries are we covering', 'which countries will we be visiting',
    'how many countries does my trip go to', 'how many countries am I seeing on this trip',
    'what countries does this trip visit', 'how many countries are in this trip',
    'whats the country count for this trip', 'how many countries are we going to visit',
  ];
  const answered = corpus.filter(answers);
  const refused = corpus.filter((q) => !answers(q));
  note(`independent recall: ${answered.length} of ${corpus.length} answer (${Math.round(100 * answered.length / corpus.length)}%)`);
  note(`published floor: 15 of 18 (83%), of which 7 phrasings are the builder's own`);
  for (const q of refused) note(`  REFUSED  ${outcome(q).padEnd(24)} ${q}`);
  // The failure direction is the accepted one, so this is not a BLOCKER. It is a floor: a
  // capability whose stated job is a text shortcut into a menu has to catch more than half of what
  // a person types, and eight of these twenty refusals NAME THE DOCUMENT in the sentence.
  const namesDoc = refused.filter((q) => /this trip|my trip|the trip|my itinerary/.test(q));
  note(`${namesDoc.length} of the ${refused.length} refusals contain a noun phrase that can only mean this document`);
  ok(answered.length >= 30,
    `R73-6: independent recall is ${answered.length}/${corpus.length}, materially below the published 15/18`);
  // …and the over-refusal is one-directional, which is the property that keeps it a MINOR.
  ok(refused.every((q) => outcome(q) !== 'matched:country_count'), 'no refusal is a silently wrong answer');
}

// -------------------------------------------------------------------------------------- C
if (on('C')) {
  head('C', 'CONFIRMS A-98 Part 7 — the candidate filter, and the one place its text is false');
  const m1 = matchQuestion('which countries have a free evening', trip);
  ok(m1.kind === 'matched' && m1.question.kind === 'free_time' && m1.question.part === 'evening' && m1.question.cityKey === null,
    `outcome 1: "which countries have a free evening" → ${outcome('which countries have a free evening')}`);
  const m2 = matchQuestion('how many countries have I booked', trip);
  ok(m2.kind === 'matched' && m2.question.kind === 'unbooked' && m2.unread.includes('countries'),
    `outcome 2: "how many countries have I booked" → ${outcome('how many countries have I booked')}`);
  ok(outcome('how many countries') === 'out_of_scope:scope_unclear', 'outcome 3: the bare stem, unchanged');

  // **It cannot discard a reading, and the reason is structural rather than exemplary.** The
  // sentence-level refusal sits inside `if (candidates.length === 0)`, so there is nothing to
  // discard when it runs. Asserted off the source, because three examples are not a proof.
  const src = readFileSync(resolve(ROOT, 'packages/core/src/ask/match.ts'), 'utf8');
  ok(/if \(candidates\.length === 0\) \{[\s\S]{0,400}?if \(countries !== null\)[\s\S]{0,400}?reason: 'scope_unclear'/.test(src),
    '`scope_unclear` is returned only from inside the no-candidate branch');
  ok(!/COUNTRY_TRIGGERS[\s\S]*?candidates\.push\(\{ kind: 'country_count' \}\)[\s\S]{0,40}?COUNTRY_TRIGGERS/.test(src)
    && (src.match(/COUNTRY_TRIGGERS/g) ?? []).length === 2,
    `COUNTRY_TRIGGERS is named exactly twice — its declaration and its one read (${(src.match(/COUNTRY_TRIGGERS/g) ?? []).length})`);

  // **R73-7 — the refusal says a thing that is false of the sentence it refuses.** `scope_unclear`
  // is *"I cannot tell whether you mean this trip or every trip you have recorded"*. A sentence
  // that names a city OF THIS TRIP is one it can tell about, and A-98 Part 7's own objection to
  // I-38 was this exact shape one sentence over ("false of a sentence containing free evening").
  const named = ['which countries am I visiting after Vienna', 'how many countries before Split'];
  for (const q of named) {
    const m = matchQuestion(q, trip);
    note(`"${q}" → ${outcome(q)}`);
    ok(!(m.kind === 'out_of_scope' && m.reason === 'scope_unclear'),
      `R73-7: a sentence naming a city of THIS trip is told Cairn cannot tell which trip is meant: "${q}"`);
  }
  // The control: with no entity of this trip in it, the same refusal is honest.
  ok(outcome('how many countries') === 'out_of_scope:scope_unclear', 'control: with nothing of this trip named, the refusal is true');
}

// -------------------------------------------------------------------------------------- D
if (on('D')) {
  head('D', 'R73-1 — the mode word is attached to a run length the mode\'s own field contradicts');
  // A-98 Part 8 rules the predicate verbatim: `travelRole === 'journey' && arrival !== null`,
  // **whatever `source` is**. The two conjuncts are right and both are checked below. What the
  // predicate does not ask is whether the interval it is labelling IS the journey: when a journey
  // states BOTH `durationMins` and `arrival`, `stopOccupancy` takes `durationMins` and the clause
  // renders the mode from `arrival.mode` beside a clock from `durationMins`. Where the two fields
  // disagree, the sentence states something the document contradicts — which is R71-1's own
  // failure ("a value computed to decide is not a value to state") re-created by A-98's fix.

  // Reachable through a PUBLIC DOOR on the reference trip's own flagship leg: `stop-2` is the
  // 2026-08-07 LAX→VIE flight, `arrival: {mode: 'flight', mins: 660}`, `durationMins: null`.
  const bctx = { ids: { newId: (p) => `${p}-r73` }, now: '2026-08-01T00:00:00Z', actorUserId: 'u1' };
  const flight = trip.days.flatMap((d) => d.stops).find((s) => s.id === 'stop-2');
  ok(flight !== undefined && flight.travelRole === 'journey' && flight.arrival?.mins === 660,
    `the reference trip's flagship leg: ${flight?.placement.time} + ${flight?.arrival?.mins} min = 03:45 the next day`);
  const patched = core.updateStop(trip, 'stop-2', { durationMins: 200 }, bctx);
  const after = patched.days.flatMap((d) => d.stops).find((s) => s.id === 'stop-2');
  note(`after updateStop({durationMins: 200}): durationMins=${after.durationMins}, arrival.mins=${after.arrival.mins}`);
  const a = core.ask({ kind: 'free_time', part: 'evening', cityKey: null }, ctx(patched));
  const clause = a.text.match(/on 2026-08-07 [^,.]+/)?.[0] ?? '(no clause)';
  note(`clause: "${clause}"`);
  ok(!/you are on a flight from 16:45 until 20:05/.test(a.text),
    `R73-1: the answer states a landing time the document contradicts — arrival.mins says 660, the clause says 200: "${clause}"`);
  // `runEndsAt` carries the same number, so the structured half agrees with the false prose.
  const f = a.facts.find((x) => x.label === 'day_state' && x.params.date === '2026-08-07');
  note(`day_state.runEndsAt for 2026-08-07 = ${JSON.stringify(f?.params.runEndsAt)} (the document's own arithmetic is 27:45)`);
  // At `de9585f` this same document rendered the non-committal subject phrase, which was true.
  note('before I-44 this clause read "something that starts at 16:45 runs until 20:05" — odd, and true');
  // Not a straw man: the builder's OWN pinned test plants `durationMins: 120` beside
  // `arrival: {mode: "flight", mins: 300}` and asserts the sentence "you are on a flight from
  // 16:30 until 18:30" about a flight the same stop says takes five hours.
  const tst = readFileSync(resolve(ROOT, 'packages/core/test/ask.test.ts'), 'utf8');
  ok(!/arrival: \{ mode: 'flight' as const, mins: 300 \}[\s\S]{0,120}durationMins: 120/.test(tst),
    'R73-1 (b): the shipped test that proves A-98 Part 8 pins a clause whose own document disagrees with it');

  // The two conjuncts themselves are right, and both are checked so the finding cannot be read
  // as an argument for dropping either.
  ok(journeyModeWord(stopAt('16:30', { durationMins: 120, travelRole: 'transfer', arrival: { mode: 'bus', mins: 60 } })) === '',
    'N′: a transfer carrying an arrival — the leg INTO it — names no mode (60 of 112 scheduled stops)');
  ok(journeyModeWord(stopAt('16:30', { durationMins: 120, travelRole: 'unknown', arrival: { mode: 'bus', mins: 60 } })) === '',
    "`travelRole: 'unknown'` is not `'journey'` and states nothing (§2.12's degrade rule)");
  ok(journeyModeWord(stopAt('16:30', { durationMins: 120, travelRole: 'journey', arrival: null })) === '',
    'a journey with no arrival has no mode to name');
  ok(journeyModeWord(stopAt('16:30', { durationMins: null, travelRole: 'journey', arrival: { mode: 'ferry', mins: 90 } })) === 'ferry',
    'and the shape A-98 Part 8 exists for keeps its mode');
  // Agreeing fields: the clause A-98 Part 8 wanted, and it is correct.
  const agree = askFree(splitDoc([dayOf([stopAt('16:30', { durationMins: 120, travelRole: 'journey', arrival: { mode: 'flight', mins: 120 } })])]));
  ok(/you are on a flight from 16:30 until 18:30/.test(agree.text),
    'where the two fields AGREE the clause is right, which is what A-98 Part 8 fixed');
}

// -------------------------------------------------------------------------------------- E
if (on('E')) {
  head('E', 'R73-3 — the numeral for a population of one, at two sites R72-6 did not enumerate');
  const clear = stopAt('09:00', { durationMins: 30 }, 'clear');
  const yes = askFree(splitDoc([dayOf([clear])]));
  note(`\`Yes.\` arm, one day: ${yes.text}`);
  // R72-6 replaced "Of the 1 day in Split" with "Of the only day in Split" and left the count of
  // days three tokens later. §0 position 10: a claim is only as strong as the mechanism that
  // maintains it, and this one is maintained by a list of sites.
  ok(!/Of the only day in [^,]+, 1 is clear/.test(yes.text),
    `R73-3 (a): the sentence R72-6 fixed still counts to one inside itself: "${yes.text.slice(0, 60)}…"`);

  const uncertain = stopAt('20:00', {}, 'u');
  const other = stopAt('21:00', { durationMins: 30 }, 'o');
  const cant = askFree(splitDoc([dayOf([uncertain, other])]), 'morning');
  note(`\`I can't tell\` arm, one day: ${cant.text}`);
  ok(!/Of the 1 day in/.test(cant.text),
    `R73-3 (b): BUILD-NOTES' own disclosure — the third site, left standing: "${cant.text.slice(0, 48)}…"`);
  ok(!/across 1 day in/.test(cant.text),
    'R73-3 (c): the census says "across 1 day in Split" — the fourth site, and it is on the same `n`');
  // …and a fifth thing at the census, which is not a numeral at all: the verb.
  ok(!/\b1 of the \d+ stops[^.]*? state\b/.test(cant.text),
    'R73-3 (d): "1 of the 2 stops … state no run length" — a subject of one takes a singular verb');

  // The controls: the four sites R71-6 (d) and R72-6 DID fix are fixed, so this is a residue and
  // not a regression.
  const busy = stopAt('20:00', { durationMins: 30 }, 'busy');
  const two = askFree(splitDoc([dayOf([clear], '2026-08-10', 'd1'), dayOf([busy], '2026-08-11', 'd2')]));
  ok(/The other one is busy then\./.test(two.text), 'control: R72-6 (b) is fixed — "The other one is busy then."');
  ok(/on the only day in Split/.test(askFree(splitDoc([dayOf([busy])])).text), 'control: R71-6 (d) is fixed — the `No.` arm');
  ok(/Of the 2 days in Split, 1 is clear/.test(two.text), 'control: a real population of two still counts, correctly');
}

// -------------------------------------------------------------------------------------- F
if (on('F')) {
  head('F', 'R73-2 — R72-3\'s fix renders `24:00`, where round 72 measured 0 malformed clocks');
  // `crossesDay` is now `endMin > DAY_END_MIN + 1`, which is right. But it moves exactly one value
  // — `endMin === 1440` — out of the *"still on it at midnight"* arm and into the clock arm, and
  // the clock arm has no case for it: `clockOf(1440)` is `"24:00"`, an hour no wall clock shows
  // and the one value the comment above that arm promises is never rendered (*"no next-day clock
  // time is rendered anywhere"*).
  const lands = stopAt('17:00', { travelRole: 'journey', arrival: { mode: 'flight', mins: 7 * 60 } }, 'j');
  const i = occ.occupiedInterval(lands);
  ok(i.endMin === 1440 && i.crossesDay === false, `R72-3 itself is right: endMin ${i.endMin}, crossesDay ${i.crossesDay}`);
  ok(occ.intervalIntersects(i, 1439, 1439) === true, 'R72-4 itself is right: the 24:00 lander is in the air at 23:59');
  const a = askFree(splitDoc([dayOf([lands])]));
  note(`prose: ${a.text.slice(-70)}`);
  ok(!/until 24:00/.test(a.text), `R73-2: the clause renders an hour no clock shows: "${a.text.match(/you are on [^,.]+/)?.[0]}"`);
  const f = a.facts.find((x) => x.label === 'day_state');
  ok(f.params.runEndsAt !== '24:00', `R73-2 (b): and the structured half carries it too: runEndsAt = ${JSON.stringify(f.params.runEndsAt)}`);
  // One minute either side, to show the defect is exactly one value wide.
  const before = askFree(splitDoc([dayOf([stopAt('17:00', { travelRole: 'journey', arrival: { mode: 'flight', mins: 6 * 60 + 59 } }, 'j')])]));
  const after = askFree(splitDoc([dayOf([stopAt('17:00', { travelRole: 'journey', arrival: { mode: 'flight', mins: 7 * 60 + 1 } }, 'j')])]));
  ok(/until 23:59/.test(before.text), 'control: one minute earlier renders 23:59');
  ok(/still on it at midnight/.test(after.text), 'control: one minute later renders the crossesDay arm');
  note('`qa/r72-i38.mjs D` measures the same thing over 1,800 fuzzed answers: 8 malformed, all `24:00`, where round 72 measured 0');
}

// -------------------------------------------------------------------------------------- G
if (on('G')) {
  head('G', 'the ceilings — the export surface, the sweep, criterion rule 11, determinism, the fence');
  ok(Object.keys(core).length === 91, `§2.10 stays at 91: ${Object.keys(core).length}`);
  ok(!('lifetimeScoped' in core) && !('journeyModeWord' in core),
    'neither internal export reaches index.ts (§11.9) — they are module exports for their criteria and nothing else');
  ok(typeof lifetimeScoped === 'function' && typeof journeyModeWord === 'function',
    'and both ARE reachable from their own modules, which is what makes the two criteria assertions rather than claims');
  // The reasoning BUILD-NOTES gives for `journeyModeWord`: without it, N5 has no site that reddens
  // on the reference trip. Checked: the predicate is not observable through `answerFreeTime`'s
  // prose there, because every `runsInto` entry on that trip is already a journey.
  const scheduled = trip.days.flatMap((d) => d.stops);
  const legsInto = scheduled.filter((s) => s.travelRole !== 'journey' && s.arrival !== null);
  const journeys = scheduled.filter((s) => s.travelRole === 'journey' && s.arrival !== null);
  ok(scheduled.length === 112 && journeys.length === 21 && legsInto.length === 60,
    `the reference trip: ${scheduled.length} scheduled stops, ${journeys.length} journeys, ${legsInto.length} legs INTO a stop`);
  let observable = 0;
  for (const d of trip.days) for (const p of PARTS) {
    for (const o of classifyDay(d, p).runsInto) if (o.stop.travelRole !== 'journey') observable++;
  }
  ok(observable === 0,
    `BUILD-NOTES' reason for the second export holds: ${observable} of the reference trip's \`runsInto\` entries are non-journey, so N5 has no prose site there`);

  const rows = trip.days.flatMap((d) => PARTS.map((p) => classifyDay(d, p).state));
  ok(rows.filter((s) => s === 'busy').length === 46 && rows.filter((s) => s === 'open').length === 0
    && rows.filter((s) => s === 'unknown').length === 2,
    `A-96 Part 4's 48 verdicts are unmoved: ${rows.filter((s) => s === 'busy').length} busy / ${rows.filter((s) => s === 'open').length} open / ${rows.filter((s) => s === 'unknown').length} unknown`);

  // **Criterion rule 11** — text the product tells a user to type round-trips. The whole surface,
  // found by grep rather than by list: `cli.ts`'s menu, and every `"…"` inside every pointer.
  const quoted = (p) => [...p.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  let pointers = 0, quotedPhrases = 0;
  for (const t of ['how many countries', 'how many countries have I been to', 'where should I eat in Split']) {
    const m = matchQuestion(t, trip);
    if (m.kind !== 'out_of_scope') continue;
    pointers++;
    ok(!/§\d/.test(m.pointer), `R72-7 stays closed: the pointer for "${t}" cites no internal section`);
    for (const phrase of quoted(m.pointer)) {
      quotedPhrases++;
      ok(outcome(phrase) === 'matched:country_count', `criterion rule 11: a refusal tells the user to type "${phrase}" and Cairn ${outcome(phrase)}`);
    }
  }
  ok(pointers === 3 && quotedPhrases === 1,
    `the rule's whole surface today is ${quotedPhrases} quoted phrasing across ${pointers} pointers — thin, and not vacuous`);
  const coreSrc = readdirSync(resolve(ROOT, 'packages/core/src/ask')).map((n) => readFileSync(resolve(ROOT, 'packages/core/src/ask', n), 'utf8')).join('\n');
  ok((coreSrc.match(/Ask "/g) ?? []).length === 1, 'and grep agrees there is exactly one such string in `ask/`');
  // The menu's own round-trip, re-derived rather than taken from `test/cli.test.ts`.
  ok(outcome('how many countries am I visiting') === 'matched:country_count', 'the menu line for country_count is typeable');

  // Determinism and the zero-dep ceiling over the five files I-44 opened.
  for (const f of ['packages/core/src/ask/ask.ts', 'packages/core/src/ask/match.ts', 'packages/core/src/derive/occupancy.ts']) {
    const code = readFileSync(resolve(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    ok(!/Date\.now|Math\.random|crypto\.|process\.env|require\(|from '(?!\.)/.test(code),
      `${f}: no ambient clock, randomness, env or non-relative import`);
  }
  // The accept set is built once at module load and is not rebuilt per call: two identical calls
  // and 816 lookups cost nothing observable, and no call mutates it.
  const t0 = process.hrtime.bigint();
  for (const s of ACCEPT_RAW) matchQuestion(s, trip);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  note(`816 equality lookups in ${ms.toFixed(0)} ms`);
  ok(JSON.stringify(matchQuestion('how many countries am I visiting', trip)) === JSON.stringify(matchQuestion('how many countries am I visiting', trip)),
    'and the recogniser is deterministic across two calls');

  // The fence I-44 was given, checked against the commit range rather than against the report.
  const stat = execSync('git diff --stat de9585f..4142ecb -- .', { cwd: ROOT }).toString();
  note(stat.trim().split('\n').map((l) => `  ${l.trim()}`).join('\n'));
  ok(!/\.tsx|apps\/web|docs\/design|fixtures\/golden|package-lock/.test(stat),
    'the fence holds: no .tsx, no apps/web, no docs/design, no golden byte, no lockfile');
  ok(!/\bqa\//.test(stat), 'and the builder did not touch `qa/`, which is the breaker\'s surface');
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL`}`);
process.exit(fails === 0 ? 0 : 1);
