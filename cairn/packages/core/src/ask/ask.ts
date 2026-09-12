/**
 * **`ask` — the capability of ARCHITECTURE §11.** Given a `Trip` the user already owns and a
 * question from the closed set `Question` enumerates, produce a sentence that is **true of that
 * document and traceable to the records that made it true**. No network, no vendor, no key, no
 * server, no model. The whole value is that every answer is checkable, and the whole design is
 * arranged so that the day a model *is* in the loop, the model cannot touch the answer.
 *
 * > **A language model may parse a question. It may never answer one.**
 *
 * `ask` takes a **structured** `Question`; `matchQuestion` is the only thing that turns free text
 * into one. **(b), whenever it arrives, replaces `matchQuestion` and may not replace `ask`** — a
 * model that emits a `Question` produces no cites, so there is nothing for it to fabricate.
 *
 * ---
 *
 * **Three rules govern this file and a reviewer should check them first.**
 *
 * 1. **`ask` reads the `Trip` document, never a `TripSummaryRow`** (§11.4). It calls
 *    `tripSummary(trip, index)` **itself**, which is a different statement: the *derivation* is
 *    reused, the *stored copy* is not. A row is a copy, a copy goes stale, and a row carries no
 *    stop ids, no bookings and no conflicts — so §11.6's grounding law is unsatisfiable from one.
 * 2. **`ask/` holds no domain arithmetic** (§11.4's ceiling, sequencing rule 1 at a new door).
 *    Every number in an answer is a field of the document or the return value of an existing
 *    `derive/`, `conflict/` or `validate/` function. **Exactly two computations are `ask/`'s
 *    own** — the daypart classifier (`freeTime.ts`) and `country_count`'s evidence walk (below) —
 *    both about *answering* rather than about the trip. A third is a design defect routed to the
 *    architect, whose fix is a function in `derive/` used by both callers. **That trigger fired
 *    inside the increment that wrote it** (QA R70-3): *how long a stop occupies the clock* was a
 *    third computation, already implemented privately in `conflict/rules/overlap.ts`, and §11.11
 *    A-96 moved it to `derive/occupancy.ts` with both callers reading it. `ask/` is still at two.
 * 3. **`text` is rendered from `facts` and from nothing else** (§11.5). There is no template that
 *    describes the trip in prose.
 *
 * **A rule this file adds, and it is load-bearing rather than fussy** (§11.8 clause 2, rewritten
 * by §11.11 **A-96 Part 6** after QA R70-4): **a record's free text may be narrated only where
 * the closed `Question` union makes that record the SUBJECT of the question.** `Question` carries
 * a `cityKey` and nothing else that names a record, so the admissible set is **exactly
 * `{City.name}`** and it goes through the **one chokepoint** in `prose.ts`, which applies §6.6's
 * `redactText` before interpolation. `trip.title`, `Stop.name`, `Place.name`, `Booking.*` and
 * `Stop.note` are descriptions of records no question takes as its subject: they travel in
 * `AnswerFact.value`/`params` and through the cites, which is where a surface reads them from,
 * and they never reach `text` or a `caveat.message`. Revision 77 asserted this as a property of
 * the data and it was a property of the fixture's spelling: a trip titled *"Split flat (door code
 * 4821)"* rendered a §6.6 credential class straight into prose.
 *
 * Pure. No `Date.now()`, no randomness, no `fetch`, no `fs`: `today` and the country index are
 * **injected** (§2.1). It mints no record, takes no `IdFactory`, has no write path, and
 * `SCHEMA_VERSION`/`SUMMARY_VERSION` do not move for anything here.
 */
import type { Conflict, Day, Stop, Trip } from '../model/types.ts';
import type { CityKey, CountryCode, IsoDate } from '../model/ids.ts';
import { isIsoDate } from '../model/ids.ts';
import { cityRange, daysForCity, orderedCities, tripSummary, weekdayOf } from '../derive/summary.ts';
import { lifecycle } from '../derive/lifecycle.ts';
import { stopLatLng } from '../derive/geo.ts';
import { clockOf } from '../derive/occupancy.ts';
import { countryOf } from '../derive/country.ts';
import { detectConflicts } from '../conflict/detect.ts';
import { UNBOOKED_HORIZON_DAYS } from '../conflict/rules/unbookedTicketed.ts';
import { classifyDay, DAYPART_WINDOWS } from './freeTime.ts';
import { cityProse } from './prose.ts';
import type {
  Answer, AnswerCaveat, AnswerCaveatCode, AnswerCite, AnswerCoverage, AnswerFact, AskCtx, Question,
} from './types.ts';

// ---------------------------------------------------------------- small shared constructors

const tripCite = (trip: Trip): AnswerCite => ({ kind: 'trip', id: trip.id });
const dayCite = (day: Day | IsoDate): AnswerCite => ({ kind: 'day', id: typeof day === 'string' ? day : day.id });
const stopCite = (stop: Stop): AnswerCite => ({ kind: 'stop', id: stop.id });
const cityCite = (key: CityKey): AnswerCite => ({ kind: 'city', key });
const conflictCite = (c: Conflict): AnswerCite => ({ kind: 'conflict', id: c.id });

function fact(
  label: string,
  value: string | number | null,
  params: Record<string, string | number>,
  cites: readonly AnswerCite[],
): AnswerFact {
  return { label, value, params, cites };
}

/** Every cite any fact carries, de-duplicated, in first-seen order. §11.5's "subset" both ways. */
function citesOf(facts: readonly AnswerFact[], extra: readonly AnswerCite[]): AnswerCite[] {
  const seen = new Set<string>();
  const out: AnswerCite[] = [];
  for (const c of [...extra, ...facts.flatMap((f) => [...f.cites])]) {
    const k = JSON.stringify(c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

function caveat(code: AnswerCaveatCode, message: string, params: Record<string, string | number>): AnswerCaveat {
  return { code, message, params };
}

/** `a, b and c`. Pure formatting over values that are already facts. */
function list(parts: readonly string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * The city's own name, **for `facts` and `params` only**. A-96 Part 6: the structured half of an
 * `Answer` is the document's own values and carries no redaction guarantee — that decision
 * belongs to the surface that renders them (§6.6). Anything headed for `text` or a
 * `caveat.message` uses `cityProse` instead, which is the one chokepoint.
 */
function cityNameOf(trip: Trip, key: CityKey): string {
  return trip.cities.find((c) => c.key === key)?.name ?? key;
}

/** `2026-08-10 (Mon)`. The document's own date, plus the weekday `derive/summary.ts` computes. */
function dated(date: IsoDate): string {
  return `${date} (${weekdayOf(date)})`;
}

// ------------------------------------------------------------------------------ the entry point

/**
 * Answer one question about one trip. **Total over the union.**
 *
 * @throws {Error} programmer error only — a missing country index (`tripSummary`'s own rule,
 * applied at this door so every kind fails the same way rather than only the two that reach it),
 * or a `today` that is not a real calendar date. A hole in the *document* is never a throw: it is
 * an `AnswerCaveat` and a `coverage` below `complete`.
 */
export function ask(question: Question, ctx: AskCtx): Answer {
  const { trip, today, index } = ctx;
  if (!index || !Array.isArray((index as { countries?: unknown }).countries)) {
    throw new Error(
      'ask: the country index is a required argument (ARCHITECTURE §11.9, §8.4 clause 3) — there ' +
        'is deliberately no default, because the only available default is an answer that claims ' +
        'to be complete while carrying no countries',
    );
  }
  if (!isIsoDate(today)) {
    throw new Error(`ask: today must be a real calendar date in YYYY-MM-DD, got ${JSON.stringify(today)}`);
  }
  switch (question.kind) {
    case 'trip_overview': return answerOverview(question, ctx);
    case 'city_edge': return answerCityEdge(question, ctx);
    case 'unbooked': return answerUnbooked(question, ctx);
    case 'country_count': return answerCountryCount(question, ctx);
    case 'free_time': return answerFreeTime(question, ctx);
  }
}

// ------------------------------------------------------------------------------- trip_overview

/**
 * §11.7 rule 5, second trap: **city day counts do not sum to the trip.** A day spanning two
 * cities contributes to both (§8.4 A-56 residue 1) — measured: 3 + 3 + 4 + 4 + 4 + 2 = **20**
 * over a **16**-day trip. So this prints `dayCount` and the per-city ranges **beside** each other
 * and **never a total of the ranges**, and it says why they do not add up.
 */
function answerOverview(question: Question, ctx: AskCtx): Answer {
  const { trip, today, index } = ctx;
  const row = tripSummary(trip, index);
  const stage = lifecycle(trip, today);
  const facts: AnswerFact[] = [
    fact('trip_title', trip.title, { title: trip.title }, [tripCite(trip)]),
    fact('trip_dates', `${trip.startDate} → ${trip.endDate}`,
      { startDate: trip.startDate, endDate: trip.endDate, datePrecision: trip.datePrecision }, [tripCite(trip)]),
    fact('day_count', row.dayCount, { dayCount: row.dayCount }, [tripCite(trip)]),
    fact('lifecycle', stage, { stage, today }, [tripCite(trip)]),
    fact('city_count', row.cityCount, { cityCount: row.cityCount }, [tripCite(trip)]),
    fact('stop_count', row.stopCount, { stopCount: row.stopCount }, [tripCite(trip)]),
    fact('pool_count', row.poolCount, { poolCount: row.poolCount }, [tripCite(trip)]),
    fact('place_count', row.placeCount, { placeCount: row.placeCount }, [tripCite(trip)]),
    fact('booking_count', trip.bookings.length, { bookingCount: trip.bookings.length }, [tripCite(trip)]),
  ];

  const cities = orderedCities(trip);
  const clauses: string[] = [];
  for (const c of cities) {
    const days = daysForCity(trip, c.key);
    const range = cityRange(trip, c.key);
    const cites: AnswerCite[] = [cityCite(c.key)];
    if (days.length > 0) { cites.push(dayCite(days[0])); cites.push(dayCite(days[days.length - 1])); }
    facts.push(fact('city_range', range, {
      city: c.name,
      cityKey: c.key,
      range: range ?? '',
      days: days.length,
      firstDay: days.length > 0 ? days[0].date : '',
      lastDay: days.length > 0 ? days[days.length - 1].date : '',
    }, cites));
    const cityWord = cityProse(trip, c.key);
    clauses.push(range === null
      ? `${cityWord} (no days recorded)`
      : `${cityWord} ${range} (${days.length} day${days.length === 1 ? '' : 's'})`);
  }

  // **QA R70-1.** The empty arm used to fire when EITHER count was zero and then render *"no
  // days and no cities"* for both, contradicting the `day_count`/`city_count` facts in the same
  // `Answer` — and label a describable document `none`. The sentence now states only the count
  // that is actually zero, and a document with one of the two is `partial` rather than `none`:
  // §11.5's *"every rendered clause corresponds to a fact"* is checked inside one answer.
  const missing: string[] = [];
  if (row.dayCount === 0) missing.push('no days');
  if (row.cityCount === 0) missing.push('no cities');
  const bothMissing = missing.length === 2;
  const empty = missing.length > 0;
  const coverage: AnswerCoverage = bothMissing ? 'none' : empty ? 'partial' : 'complete';
  const caveats = empty
    ? [caveat('no_records',
        `This trip records ${list(missing)} yet, so ${bothMissing ? 'there is nothing to summarise' : 'this summary is what is on it so far'}.`,
        { dayCount: row.dayCount, cityCount: row.cityCount })]
    : [];

  // A-96 Part 6: `trip.title` is a record's free text that no question takes as its subject, so
  // the sentence opens with the dates and the lifecycle stage instead. The title is in `params`,
  // in the `trip_title` fact, and the trip's id is in `cites`.
  const text = empty
    ? `This trip runs ${trip.startDate} → ${trip.endDate}, and it is ${stage} as of ${today}. ` +
      `It records ${list(missing)} yet` +
      (bothMissing
        ? ', so there is nothing more I can tell you about it.'
        : `, so this is partial: ${row.dayCount} days, ${row.cityCount} cities, ${row.stopCount} scheduled stops, ` +
          `${row.poolCount} pooled ideas, ${row.placeCount} places and ${trip.bookings.length} bookings.` +
          (clauses.length > 0 ? ` It covers ${list(clauses)}.` : ''))
    : `This trip runs ${trip.startDate} → ${trip.endDate}: ${row.dayCount} days, ${stage} as of ${today}. ` +
      `It covers ${row.cityCount} cities — ${list(clauses)}. ` +
      `On it are ${row.stopCount} scheduled stops, ${row.poolCount} pooled ideas, ${row.placeCount} places and ` +
      `${trip.bookings.length} bookings. ` +
      `A day that spans two cities counts for both, so those per-city day counts do not add up to ${row.dayCount}.`;

  return {
    question,
    text,
    params: { title: trip.title, startDate: trip.startDate, endDate: trip.endDate, dayCount: row.dayCount, cityCount: row.cityCount, stage, today },
    facts,
    cites: citesOf(facts, [tripCite(trip)]),
    coverage,
    caveats,
  };
}

// ----------------------------------------------------------------------------------- city_edge

/**
 * §11.7 rule 4 — **`city_edge` follows the days, and it knows about a two-city day.**
 *
 * *"When do I leave Vienna"* is **the last day the city occupies**; *"when do I arrive"* is the
 * first, symmetrically. The evidence is that day's first `travelRole: 'journey'` stop; where the
 * day carries none, the answer is **the date alone**, `coverage: 'partial'`, with a caveat that
 * no departure stop is recorded.
 *
 * **The journey stop is looked for on every edge day, not only on a two-city one**, which is the
 * `AnswerCaveatCode` set's own mechanical definition of `no_departure_stop` (*the day carries no
 * `travelRole: 'journey'` stop*). §11.7's two-city sentence describes the measured case — Vienna's
 * last day is `2026-08-10`, `cities: ["vienna","dubrovnik"]`, and its first three stops are
 * journeys at 05:00, 06:55 and 08:45 — rather than gating the search. BUILD-NOTES **KD-131**
 * records the choice; the two readings differ only for a single-city edge day that does carry a
 * journey, and answering *"no departure stop is recorded"* about a day that records one would be
 * false of the document.
 */
function answerCityEdge(question: Extract<Question, { kind: 'city_edge' }>, ctx: AskCtx): Answer {
  const { trip } = ctx;
  const name = cityNameOf(trip, question.cityKey);
  // The narrated form — A-96 Part 6's one admissible user-authored value, through the one
  // chokepoint. `name` above is the raw value and stays in `facts`/`params`.
  const said = cityProse(trip, question.cityKey);
  const days = daysForCity(trip, question.cityKey);
  const leaving = question.edge === 'leave';

  if (days.length === 0) {
    const facts = [fact(leaving ? 'departure_day' : 'arrival_day', null, { city: name, cityKey: question.cityKey }, [cityCite(question.cityKey)])];
    return {
      question,
      text:
        `I have no days recorded for ${said} on this trip, so I cannot tell you when you ` +
        `${leaving ? 'leave' : 'arrive'}. That is a gap in the document, not an answer.`,
      params: { city: name, cityKey: question.cityKey, edge: question.edge },
      facts,
      cites: citesOf(facts, [tripCite(trip), cityCite(question.cityKey)]),
      coverage: 'none',
      caveats: [caveat('no_records', `No day of this trip lists ${said} among its cities.`, { city: name, cityKey: question.cityKey })],
    };
  }

  const edgeDay = leaving ? days[days.length - 1] : days[0];
  const journey = edgeDay.stops.find((s) => s.travelRole === 'journey');
  const others = edgeDay.cities.filter((c) => c !== question.cityKey);
  const facts: AnswerFact[] = [
    fact(leaving ? 'departure_day' : 'arrival_day', edgeDay.date, {
      city: name, cityKey: question.cityKey, date: edgeDay.date, weekday: weekdayOf(edgeDay.date),
      dayCount: days.length,
    }, [dayCite(edgeDay), cityCite(question.cityKey)]),
  ];
  if (others.length > 0) {
    facts.push(fact('day_spans_cities', others.join(', '), { date: edgeDay.date, others: others.join(', '), cityCount: edgeDay.cities.length }, [dayCite(edgeDay)]));
  }
  if (journey) {
    const t = journey.placement.kind === 'scheduled' ? journey.placement.time : null;
    facts.push(fact(leaving ? 'departure_stop' : 'arrival_stop', t, {
      stopName: journey.name, stopId: journey.id, date: edgeDay.date, time: t ?? '', travelRole: journey.travelRole,
    }, [stopCite(journey), dayCite(edgeDay)]));
  }

  const spans = others.length > 0
    ? ` That day also carries ${list(others.map((k) => cityProse(trip, k)))}.`
    : '';
  const time = journey && journey.placement.kind === 'scheduled' ? journey.placement.time : null;
  const text = journey
    ? (leaving
        ? `You leave ${said} on ${dated(edgeDay.date)} — the last of the ${days.length} day${days.length === 1 ? '' : 's'} it occupies.${spans} ` +
          `The first journey recorded on that day ${time === null ? 'states no time' : `starts at ${time}`}, and it is cited below.`
        : `You arrive in ${said} on ${dated(edgeDay.date)} — the first of the ${days.length} day${days.length === 1 ? '' : 's'} it occupies.${spans} ` +
          `The first journey recorded on that day ${time === null ? 'states no time' : `starts at ${time}`}, and it is cited below.`)
    : (leaving
        ? `The last day ${said} occupies is ${dated(edgeDay.date)}.${spans} No stop on that day is recorded as a journey, ` +
          'so I can give you the date and not the time.'
        : `The first day ${said} occupies is ${dated(edgeDay.date)}.${spans} No stop on that day is recorded as a journey, ` +
          'so I can give you the date and not the time.');

  return {
    question,
    text,
    params: { city: name, cityKey: question.cityKey, edge: question.edge, date: edgeDay.date, days: days.length },
    facts,
    cites: citesOf(facts, [tripCite(trip)]),
    coverage: journey ? 'complete' : 'partial',
    caveats: journey ? [] : [caveat('no_departure_stop', `No stop on ${edgeDay.date} carries travelRole 'journey', so the time of travel is not recorded.`, { date: edgeDay.date, city: name })],
  };
}

// ------------------------------------------------------------------------------------ unbooked

/**
 * §11.4 — **"what's still unbooked" has one definition and it is already in the repository.**
 * `conflict/rules/unbookedTicketed.ts` and `conflict/rules/missingLodging.ts` are that
 * definition, they are tested, and they carry §8.2's feasibility class. **`ask` re-publishes
 * them; it does not compute a second "looks unbooked to me" list.**
 *
 * The selector is `c.kind === 'coverage' && !c.resolution` over `detectConflicts(trip, {today})`.
 * Measured: **12** at `today = 2026-08-01` (2 `missing_lodging` + 10 `unbooked_ticketed`;
 * unscoped `detectConflicts` returns 17) and **0** at `2026-09-11` (unscoped 5, `lifecycle` is
 * `completed`).
 *
 * **The consequence is a feature, not a limitation, and the answer states it**: both rules are
 * feasibility rules and `unbooked_ticketed` looks `UNBOOKED_HORIZON_DAYS` ahead, so for a trip
 * that has ended the honest answer is *"nothing — this trip is over"* and **never** *"nothing is
 * unbooked"*. `coverage` is therefore `'partial'` on every arm: an answer that can only see 60
 * days is not a complete answer about a document, whatever its count.
 *
 * **§11.6 clause 3: `ask` does not copy `Conflict.subjects`.** A re-published conflict is cited
 * as `{kind: 'conflict', id}` — the identity the conflicts panel and `cli.ts conflicts` already
 * show, and which content-addresses its own contents (§2.7). Copying subjects would make `ask` a
 * second reader of a rule's internal bookkeeping.
 */
function answerUnbooked(question: Question, ctx: AskCtx): Answer {
  const { trip, today } = ctx;
  const open = detectConflicts(trip, { today }).filter((c) => c.kind === 'coverage' && !c.resolution);
  const ticketed = open.filter((c) => c.ruleId === 'unbooked_ticketed');
  const lodging = open.filter((c) => c.ruleId === 'missing_lodging');
  const stage = lifecycle(trip, today);

  const facts: AnswerFact[] = [
    fact('unbooked_count', open.length, { count: open.length, today }, [tripCite(trip)]),
    fact('unbooked_ticketed_count', ticketed.length, { count: ticketed.length }, ticketed.map(conflictCite)),
    fact('missing_lodging_count', lodging.length, { count: lodging.length }, lodging.map(conflictCite)),
    fact('horizon_days', UNBOOKED_HORIZON_DAYS, { horizonDays: UNBOOKED_HORIZON_DAYS }, [tripCite(trip)]),
    fact('lifecycle', stage, { stage, today }, [tripCite(trip)]),
  ];
  // One fact per item, carrying the RULE's own published sentence and its own params. The names
  // live here rather than in `text` — see this module's header for why.
  for (const c of open) {
    facts.push(fact('unbooked_item', c.summary, { ...c.params, ruleId: c.ruleId, severity: c.severity }, [conflictCite(c)]));
  }

  const horizon =
    `Both rules behind this answer look ${UNBOOKED_HORIZON_DAYS} days ahead and stop asking once a ` +
    'date has passed, so this is what is reachable now rather than a complete audit of the trip.';
  const text = open.length > 0
    ? `As of ${today}, ${open.length} thing${open.length === 1 ? '' : 's'} on this trip ${open.length === 1 ? 'is' : 'are'} not booked: ` +
      `${ticketed.length} ticketed stop${ticketed.length === 1 ? '' : 's'} that carry a booking link with no booking behind ` +
      `${ticketed.length === 1 ? 'it' : 'them'}, and ${lodging.length} stretch${lodging.length === 1 ? '' : 'es'} of nights with no lodging on file. ` +
      `Each one is listed below with the record it came from. ${horizon}`
    : stage === 'completed'
      ? `Nothing — but that is because this trip is over. Cairn stops asking you to book things for a trip you have ` +
        `already taken, so as of ${today} there is nothing to report. Read that as "the question no longer applies", ` +
        'not as "everything was booked".'
      : `Nothing that Cairn can see as of ${today}. ${horizon}`;

  return {
    question,
    text,
    params: { count: open.length, ticketed: ticketed.length, lodging: lodging.length, today, stage, horizonDays: UNBOOKED_HORIZON_DAYS },
    facts,
    cites: citesOf(facts, [tripCite(trip)]),
    // Feasibility-gated on every arm — §8.2. Never `complete`.
    coverage: 'partial',
    caveats: [
      caveat('feasibility_horizon',
        `These are §8.2 feasibility rules: unbooked_ticketed looks ${UNBOOKED_HORIZON_DAYS} days ahead, and both stop ` +
          'reporting for dates that have passed. A trip further out than that horizon reports nothing here.',
        { horizonDays: UNBOOKED_HORIZON_DAYS, today, stage }),
    ],
  };
}

// ------------------------------------------------------------------------------- country_count

/**
 * §11.6 clause 4 — **the evidence walk is pinned to the number it explains.**
 *
 * The **count** is `tripSummary(trip, index).countryCodes`, always, with no second opinion. The
 * **evidence** is a walk over `trip.places[].at` and `stopLatLng` for every scheduled and pooled
 * stop, through the same exported `countryOf(at, index)`, producing the records behind each code.
 * Where the two disagree at runtime **the count still wins** and the code is listed with empty
 * evidence, because a country dropped from an answer is worse than a country with no receipt.
 *
 * **§11.7 rule 6: a count is reported with its denominator.** Measured: **7** countries
 * (`AT, CZ, DE, GB, HR, HU, US`), **95 places of which 94 carry a coordinate and 91 resolved**,
 * **143 stops of which 132 are located and 128 resolved** — so a user who wonders why Germany is
 * on the list gets the Frankfurt layover cited, and a user whose trip has holes is told there are
 * holes. `null` from `countryOf` stays first-class and is never snapped (§8.4 clause 1).
 *
 * **Residue (§11.6):** the third caller of a per-record attribution map moves it into `derive/`
 * and `tripSummary` uses it too. **Trigger:** that third caller. Today there are two — this walk
 * and `tripSummary`'s own — which is why this one stays here.
 */
function answerCountryCount(question: Question, ctx: AskCtx): Answer {
  const { trip, index } = ctx;
  const row = tripSummary(trip, index);

  const evidence = new Map<CountryCode, AnswerCite[]>();
  const push = (code: CountryCode | null, cite: AnswerCite) => {
    if (code === null) return;
    const hit = evidence.get(code);
    if (hit) hit.push(cite);
    else evidence.set(code, [cite]);
  };
  for (const p of trip.places) push(p.at === null ? null : countryOf(p.at, index), { kind: 'place', id: p.id });
  // **Both populations**, exactly as `tripSummary`'s own census walks them: a census whose
  // denominator excluded the pool could report fewer attributed records than the row claims
  // countries (§8.4 clause 3).
  for (const s of [...trip.days.flatMap((d) => d.stops), ...trip.pool]) {
    const at = stopLatLng(s, trip);
    push(at === null ? null : countryOf(at, index), stopCite(s));
  }
  // A city's own attributed code is evidence too — it is how §8.4 A-29's `stated` and A-84's
  // `picked` paths reach `countryCodes` at all, and without it such a code would have no receipt.
  const cityEvidence = new Map<CountryCode, AnswerCite[]>();
  for (const c of row.cities) {
    if (c.countryCode === null) continue;
    const hit = cityEvidence.get(c.countryCode);
    if (hit) hit.push(cityCite(c.key));
    else cityEvidence.set(c.countryCode, [cityCite(c.key)]);
  }

  const facts: AnswerFact[] = [
    fact('country_count', row.countryCodes.length, { count: row.countryCodes.length }, [tripCite(trip)]),
  ];
  const byCode: string[] = [];
  for (const code of row.countryCodes) {
    const records = evidence.get(code) ?? [];
    const cities = cityEvidence.get(code) ?? [];
    facts.push(fact('country_code', code, { code, recordCount: records.length, cityCount: cities.length }, [...records, ...cities]));
    byCode.push(`${code} ${records.length}`);
  }
  const placeSeen = row.placeCount;
  const stopSeen = trip.days.reduce((n, d) => n + d.stops.length, 0) + trip.pool.length;
  facts.push(fact('place_census', placeSeen, { seen: placeSeen, located: row.attribution.places.located, attributed: row.attribution.places.attributed }, [tripCite(trip)]));
  facts.push(fact('stop_census', stopSeen, { seen: stopSeen, located: row.attribution.stops.located, attributed: row.attribution.stops.attributed }, [tripCite(trip)]));

  const lostPlaces = row.attribution.places.located - row.attribution.places.attributed;
  const lostStops = row.attribution.stops.located - row.attribution.stops.attributed;
  const holes = lostPlaces + lostStops > 0;
  const noCountries = row.countryCodes.length === 0;

  const census =
    `That comes from ${placeSeen} place records (${row.attribution.places.located} carry a coordinate, ` +
    `${row.attribution.places.attributed} of which resolved to a country) and ${stopSeen} stops ` +
    `(${row.attribution.stops.located} located, ${row.attribution.stops.attributed} resolved). ` +
    `By records: ${byCode.join(', ')}.`;
  const text = noCountries
    ? 'I cannot place this trip in any country. Nothing on it carries a coordinate I could resolve, so the ' +
      'honest answer is that there is nothing to count rather than that the answer is zero.'
    : holes
      ? `This trip accounts for ${row.countryCodes.length} countries: ${row.countryCodes.join(', ')}. ${census} ` +
        `${lostPlaces} place${lostPlaces === 1 ? '' : 's'} and ${lostStops} stop${lostStops === 1 ? '' : 's'} carry a ` +
        'coordinate I could not place in any country, so treat this as a floor rather than a ceiling.'
      : `This trip accounts for ${row.countryCodes.length} countries: ${row.countryCodes.join(', ')}. ${census} ` +
        'Every located record resolved, so nothing is missing from that list.';

  return {
    question,
    text,
    params: {
      count: row.countryCodes.length,
      codes: row.countryCodes.join(','),
      placesSeen: placeSeen,
      placesLocated: row.attribution.places.located,
      placesAttributed: row.attribution.places.attributed,
      stopsSeen: stopSeen,
      stopsLocated: row.attribution.stops.located,
      stopsAttributed: row.attribution.stops.attributed,
    },
    facts,
    cites: citesOf(facts, [tripCite(trip)]),
    coverage: noCountries ? 'none' : holes ? 'partial' : 'complete',
    caveats: [
      ...(holes
        ? [caveat('unattributed_records',
            `${lostPlaces} places and ${lostStops} stops carry a coordinate that resolved to no country. ` +
              'A null from countryOf stays null and is never snapped to the nearest place.',
            { places: lostPlaces, stops: lostStops })]
        : []),
      ...(noCountries ? [caveat('no_records', 'No record on this trip resolved to a country.', { count: 0 })] : []),
    ],
  };
}

// ------------------------------------------------------------------------------------ free_time

/**
 * §11.7 rule 3 — **nothing is defaulted into existence, and nothing the document DOES state is
 * ignored** (§11.11 A-96 Part 3). This is the worked example.
 *
 * Measured over the reference trip: **0 of 143 stops carry a non-null `durationMins`**, and **91
 * of 112 scheduled stops state no run length by any field at all** — the other 21 are journeys
 * that state one in `arrival.mins`. The classifier is three-valued (`freeTime.ts`) and works over
 * **occupied intervals** rather than start instants, which is what makes the `[stated]` oracle
 * for this increment come out right: Split's four days, `evening = 18:00–23:59` — **12th busy**
 * (20:00), **13th busy** (20:15, 20:30), **15th busy** (18:00, 19:30), and **14th busy** because
 * nothing *starts* after 17:15 but that 17:15 stop is a `travelRole: 'journey'` bus with
 * `arrival: {bus, 80}`, so the document says you are on it until **18:35**. `coverage` is
 * `complete` and the answer is a **No**. Revision 77 answered *"I can't tell"* here, over
 * evidence the document carries (QA R70-3).
 *
 * **Rule 1: a partial answer says so in its own sentence.** The three arms below are three
 * different sentences, so a `coverage` field nothing renders cannot survive here — and **a
 * `time_unknown` caveat can no longer sit beside a confident verdict** (QA R70-2): a stop that
 * cannot be placed on the clock makes its day `unknown` in the classifier, which is the field a
 * surface branches on, so the caveat only ever accompanies the *"I can't tell"* arm.
 */
function answerFreeTime(question: Extract<Question, { kind: 'free_time' }>, ctx: AskCtx): Answer {
  const { trip } = ctx;
  const where = question.cityKey === null ? 'this trip' : cityNameOf(trip, question.cityKey);
  // The narrated scope — A-96 Part 6's chokepoint. `where` is the raw value, for `params`.
  const said = question.cityKey === null ? 'this trip' : cityProse(trip, question.cityKey);
  const days = question.cityKey === null ? trip.days : daysForCity(trip, question.cityKey);
  const window = DAYPART_WINDOWS[question.part];
  const windowText = `${question.part} (${window.from}–${window.to})`;
  const scopeCites: AnswerCite[] = question.cityKey === null ? [] : [cityCite(question.cityKey)];

  if (days.length === 0) {
    const facts = [fact('days_in_scope', 0, { city: where, part: question.part }, scopeCites)];
    return {
      question,
      text:
        `I have no days recorded for ${said}, so there is no ${question.part} for me to look at. ` +
        // QA R70-9: the daypart asked for, not a hard-coded "evening" beside it.
        `That is a gap in the document, not a free ${question.part}.`,
      params: { city: where, part: question.part, days: 0 },
      facts,
      cites: citesOf(facts, [tripCite(trip), ...scopeCites]),
      coverage: 'none',
      caveats: [caveat('no_records', `No day of this trip is recorded for ${said}.`, { city: where })],
    };
  }

  const facts: AnswerFact[] = [fact('days_in_scope', days.length, { city: where, part: question.part, window: `${window.from}-${window.to}`, days: days.length }, scopeCites)];
  const busyStarts: Array<{ date: IsoDate; time: string }> = [];
  const busyRuns: Array<{ date: IsoDate; mode: string; from: string; to: string }> = [];
  const unknownDays: Array<{ date: IsoDate; lastBefore: string; without: number }> = [];
  const openDays: IsoDate[] = [];
  const emptyDays: IsoDate[] = [];
  let busy = 0;
  let open = 0;
  let stopsWithoutOccupancy = 0;
  let stopsWithoutTime = 0;
  let stopsInScope = 0;

  for (const day of days) {
    const v = classifyDay(day, question.part);
    stopsInScope += v.stopCount;
    stopsWithoutOccupancy += v.withoutOccupancy.length;
    // **QA R70-2.** Only a day whose verdict the hole could change reports it: on a `busy` day an
    // unplaceable stop cannot make the window free, and §11.5 defines a caveat as *why an answer
    // is not complete*. A caveat on an answer that IS complete is the contradiction R70-2 found.
    if (v.state !== 'busy') stopsWithoutTime += v.withoutTime.length;
    const cites: AnswerCite[] = [dayCite(day), ...scopeCites, ...v.occupying.map((o) => stopCite(o.stop))];
    if (v.state === 'unknown' && v.lastUncertainBefore !== null) {
      const last = day.stops.find((s) => s.placement.kind === 'scheduled' && s.placement.time === v.lastUncertainBefore);
      if (last) cites.push(stopCite(last));
    }
    facts.push(fact('day_state', v.state, {
      date: day.date,
      part: question.part,
      state: v.state,
      occupying: v.occupying.length,
      startsInWindow: v.starts.length,
      runsIntoWindow: v.runsInto.length,
      lastStartBeforeWindow: v.lastUncertainBefore ?? '',
      stopsWithoutOccupancy: v.withoutOccupancy.length,
      stopsWithoutTime: v.withoutTime.length,
      stopsOnDay: v.stopCount,
    }, cites));
    if (v.state === 'busy') {
      busy += 1;
      const run = v.runsInto[0];
      const start = v.starts[0];
      // The stop's own evidence, and only the parts of it the engine controls: a `TravelMode`
      // is an enum label and the times are the document's clock. The stop's NAME is in `cites`.
      if (run && run.stop.arrival) {
        busyRuns.push({ date: day.date, mode: run.stop.arrival.mode, from: clockOf(run.interval.startMin), to: clockOf(run.interval.endMin) });
      } else if (start && start.placement.kind === 'scheduled' && start.placement.time !== null) {
        busyStarts.push({ date: day.date, time: start.placement.time });
      }
    } else if (v.state === 'open') {
      open += 1;
      openDays.push(day.date);
      if (v.stopCount === 0) emptyDays.push(day.date);
    } else {
      unknownDays.push({ date: day.date, lastBefore: v.lastUncertainBefore ?? '', without: v.withoutOccupancy.length });
    }
  }
  facts.push(fact('stops_without_occupancy', stopsWithoutOccupancy, { stops: stopsWithoutOccupancy, of: stopsInScope, days: days.length }, [tripCite(trip)]));

  const n = days.length;
  // "16 days ON this trip" / "4 days IN Split" — the preposition follows the scope, because a
  // sentence a user reads twice a week is not a place to save a branch.
  const scope = `${n} day${n === 1 ? '' : 's'} ${question.cityKey === null ? 'on' : 'in'} ${said}`;
  // The census, with its denominator (§11.7 rule 6) — 20 of 28 across Split, 91 of 112 trip-wide,
  // and never "28 stops say nothing" when 8 of them do (QA R70-3).
  const census =
    `${stopsWithoutOccupancy} of the ${stopsInScope} stop${stopsInScope === 1 ? '' : 's'} across ${scope} ` +
    `state no run length${stopsWithoutOccupancy === 0 ? '' : ', and Cairn does not invent a duration for a stop that states none'}.`;
  let text: string;
  let coverage: AnswerCoverage;
  if (unknownDays.length > 0) {
    coverage = 'partial';
    const one = unknownDays[0];
    text =
      `I can't tell. Of the ${scope}, ${busy} ${busy === 1 ? 'is' : 'are'} busy in the ${windowText}` +
      `${open > 0 ? `, ${open} ${open === 1 ? 'is' : 'are'} clear` : ''}, and ${unknownDays.length} I cannot judge. ` +
      // QA R70-8: only a time BEFORE the window is evidence about the window. Where the day
      // offers none, the sentence says so rather than quoting a start time that comes after it.
      `On ${one.date}, nothing I can place runs into the ${question.part}` +
      `${one.lastBefore === '' ? '' : `, and the last thing that starts before it is at ${one.lastBefore}`} — but ` +
      `${census} So I cannot say the ${question.part} is free.`;
  } else if (open > 0) {
    coverage = 'complete';
    // QA R70-10: a day with no stops at all is `open`, and the justification for it is that
    // nothing is recorded — not the vacuous truth that every stop on it states its length.
    const planned = openDays.filter((d) => !emptyDays.includes(d));
    const because = [
      planned.length > 0
        ? `${list(planned)} ${planned.length === 1 ? 'has' : 'have'} nothing occupying the ${windowText} and every stop on ` +
          `${planned.length === 1 ? 'that day' : 'those days'} states how long it takes`
        : '',
      emptyDays.length > 0 ? `${list(emptyDays)} ${emptyDays.length === 1 ? 'carries' : 'carry'} no stops at all` : '',
    ].filter((s) => s !== '');
    text =
      `Yes. Of the ${scope}, ${open} ${open === 1 ? 'is' : 'are'} clear in the ${windowText}: ${list(because)}. ` +
      `${busy > 0 ? `The other ${busy} ${busy === 1 ? 'is' : 'are'} busy then.` : ''}`.trim();
  } else {
    coverage = 'complete';
    const clauses = [
      ...busyRuns.map((r) => `on ${r.date} you are on a ${r.mode} from ${r.from} until ${r.to}`),
      busyStarts.length > 0
        ? `${busyRuns.length > 0 ? 'the other ' : ''}${busyStarts.length === 1 ? 'one has' : `${busyStarts.length} have`} ` +
          `something starting at ${list(busyStarts.map((b) => b.time))}`
        : '',
    ].filter((s) => s !== '');
    text =
      `No. Something occupies the ${windowText} on every one of the ${scope}` +
      `${clauses.length > 0 ? `: ${list(clauses)}` : ''}. ` +
      `${stopsWithoutOccupancy > 0 ? `${census} That does not change the answer — a stop that states none still occupies its start.` : ''}`.trim();
  }

  const caveats: AnswerCaveat[] = [];
  const unknownForDuration = unknownDays.filter((d) => d.without > 0);
  if (unknownForDuration.length > 0) {
    // A-96 Part 3: the message stops naming `durationMins`, because that is not the only field
    // the document states a run length in. **`AnswerCaveatCode` does not move.**
    caveats.push(caveat('duration_unknown',
      `${unknownForDuration.length} of ${n} days cannot be judged: nothing I can place occupies the window, but a stop on ` +
        'that day states no duration and is not a journey that states its run, so it could still be running.',
      { days: unknownForDuration.length, of: n, stops: stopsWithoutOccupancy }));
  }
  if (stopsWithoutTime > 0) {
    caveats.push(caveat('time_unknown',
      `${stopsWithoutTime} scheduled stop${stopsWithoutTime === 1 ? '' : 's'} in this range carry no time, so they could not be ` +
        'placed in or out of the window. Those days are reported as ones I cannot judge, never as clear.',
      { stops: stopsWithoutTime }));
  }

  return {
    question,
    text,
    params: {
      city: where, part: question.part, window: `${window.from}-${window.to}`,
      days: n, busy, open, unknown: unknownDays.length,
      stopsWithoutOccupancy, stopsInScope,
    },
    facts,
    cites: citesOf(facts, [tripCite(trip), ...scopeCites]),
    coverage,
    caveats,
  };
}
