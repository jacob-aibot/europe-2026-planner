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
import type { OccupiedInterval } from '../derive/occupancy.ts';
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

/**
 * **The one place a count becomes prose — §11.14 A-99 Part 8 (QA R73-3), and criterion rule 12.**
 *
 * > **No count reaches prose as a bare numeral.** Every number this module interpolates into an
 * > `Answer.text` goes through one of these two, and a population of one is rendered as a word or
 * > as a definite description, **never as `1`**.
 *
 * The numeral-for-one defect had **six known sites across three rounds**, one of them inside the
 * sentence R72-6 fixed. R71-6 (d) fixed one of three; R72-6 fixed two and predicted the return of
 * a third; it returned with three more. **A fourth enumeration would be wrong too** — §0 position
 * 10 and position 5's revision-50 clause both forbid resting the claim on a list a builder must
 * remember — so the claim rests on the one boundary every answer passes through instead, and the
 * criterion behind it sweeps `Answer.text` for the standalone token `1` over a generated
 * population rather than checking six addresses.
 *
 * Pure. Never throws.
 */
function countWord(n: number): string {
  return n === 1 ? 'one' : String(n);
}

/**
 * A population named with its scope: `the only day in Split`, `the 16 days on this trip`.
 *
 * `theDays` and `everyOne` used to spell this as two local ternaries and the loose `scope` string
 * they read from was reachable by four other sentences — which is exactly where *"across 1 day"*
 * and *"Of the 1 day"* leaked (A-99 Part 8). It stops existing as a separate string: the only way
 * to name a population here is through this function, and this function cannot say `1`.
 *
 * `preposition` may be empty, for a scope that is a relative clause (*"the only day it
 * occupies"*). Pure. Never throws.
 */
function countNoun(n: number, singular: string, preposition: string, scope: string): string {
  const tail = [preposition, scope].filter((s) => s !== '').join(' ');
  return n === 1 ? `the only ${singular} ${tail}`.trimEnd() : `the ${n} ${plural(singular)} ${tail}`.trimEnd();
}

/**
 * An **indefinite** population with its noun: `one day`, `16 days`, `one pooled idea`.
 *
 * A-99 Part 8 names two renderers and this is a third, built **on** `countWord` rather than beside
 * it — it is the same rule with the noun attached, for the many sentences that count something
 * without naming a scope (*"On it are 8 scheduled stops, 31 pooled ideas…"*). Factoring it here is
 * the same move as the other two: the noun and the number agree because one function decides both,
 * and there is no site at which a builder can pluralise one and not the other. Pure.
 */
function countOf(n: number, singular: string): string {
  return `${countWord(n)} ${n === 1 ? singular : plural(singular)}`;
}

/** English plural for the handful of nouns this module counts. Pure. */
function plural(singular: string): string {
  if (/[^aeiou]y$/.test(singular)) return `${singular.slice(0, -1)}ies`;
  if (/(s|sh|ch|x|z)$/.test(singular)) return `${singular}es`;
  return `${singular}s`;
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
      : `${cityWord} ${range} (${countWord(days.length)} day${days.length === 1 ? '' : 's'})`);
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
  // **QA R71-2.** R70-1's fix covered two of this conditional's THREE arms: with both counts
  // zero the answer said *"there is nothing more I can tell you about it"* at `coverage: 'none'`
  // while its own facts carried 31 pooled ideas, 95 places and 21 bookings — R70-1's exact defect
  // in the arm nobody drove. `none` is *the document holds nothing for this question*, so it is
  // the count of everything else that decides it, not the two that happen to be zero.
  const otherRecords = row.stopCount + row.poolCount + row.placeCount + trip.bookings.length;
  const nothingAtAll = bothMissing && otherRecords === 0;
  const coverage: AnswerCoverage = nothingAtAll ? 'none' : empty ? 'partial' : 'complete';
  const caveats = empty
    ? [caveat('no_records',
        `This trip records ${list(missing)} yet, so ${nothingAtAll ? 'there is nothing to summarise' : 'this summary is what is on it so far'}.`,
        { dayCount: row.dayCount, cityCount: row.cityCount })]
    : [];

  // A-96 Part 6: `trip.title` is a record's free text that no question takes as its subject, so
  // the sentence opens with the dates and the lifecycle stage instead. The title is in `params`,
  // in the `trip_title` fact, and the trip's id is in `cites`.
  const text = empty
    ? `This trip runs ${trip.startDate} → ${trip.endDate}, and it is ${stage} as of ${today}. ` +
      `It records ${list(missing)} yet` +
      (nothingAtAll
        ? ', so there is nothing more I can tell you about it.'
        : `, so this is partial: ${countOf(row.dayCount, 'day')}, ${countOf(row.cityCount, 'city')}, ` +
          `${countOf(row.stopCount, 'scheduled stop')}, ${countOf(row.poolCount, 'pooled idea')}, ` +
          `${countOf(row.placeCount, 'place')} and ${countOf(trip.bookings.length, 'booking')}.` +
          (clauses.length > 0 ? ` It covers ${list(clauses)}.` : ''))
    : `This trip runs ${trip.startDate} → ${trip.endDate}: ${countOf(row.dayCount, 'day')}, ` +
      `${stage} as of ${today}. ` +
      `It covers ${countOf(row.cityCount, 'city')} — ${list(clauses)}. ` +
      `On it are ${countOf(row.stopCount, 'scheduled stop')}, ${countOf(row.poolCount, 'pooled idea')}, ` +
      `${countOf(row.placeCount, 'place')} and ${countOf(trip.bookings.length, 'booking')}. ` +
      `A day that spans two cities counts for both, so those per-city day counts do not add up to ` +
      `${countWord(row.dayCount)}.`;

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
        ? `You leave ${said} on ${dated(edgeDay.date)} — the last of ${countNoun(days.length, 'day', '', 'it occupies')}.${spans} ` +
          `The first journey recorded on that day ${time === null ? 'states no time' : `starts at ${time}`}, and it is cited below.`
        : `You arrive in ${said} on ${dated(edgeDay.date)} — the first of ${countNoun(days.length, 'day', '', 'it occupies')}.${spans} ` +
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
    ? `As of ${today}, ${countOf(open.length, 'thing')} on this trip ${open.length === 1 ? 'is' : 'are'} not booked: ` +
      `${countOf(ticketed.length, 'ticketed stop')} that ${ticketed.length === 1 ? 'carries' : 'carry'} a booking link with no booking behind ` +
      `${ticketed.length === 1 ? 'it' : 'them'}, and ${countOf(lodging.length, 'stretch')} of nights with no lodging on file. ` +
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
    byCode.push(`${code} ${countWord(records.length)}`);
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
    `That comes from ${countOf(placeSeen, 'place record')} (${countWord(row.attribution.places.located)} ` +
    `${row.attribution.places.located === 1 ? 'carries' : 'carry'} a coordinate, ` +
    `${countWord(row.attribution.places.attributed)} of which resolved to a country) and ` +
    `${countOf(stopSeen, 'stop')} (${countWord(row.attribution.stops.located)} located, ` +
    `${countWord(row.attribution.stops.attributed)} resolved). ` +
    `By records: ${byCode.join(', ')}.`;
  const accounts = `This trip accounts for ${countOf(row.countryCodes.length, 'country')}: ${row.countryCodes.join(', ')}.`;
  const text = noCountries
    ? 'I cannot place this trip in any country. Nothing on it carries a coordinate I could resolve, so the ' +
      'honest answer is that there is nothing to count rather than that the answer is zero.'
    : holes
      ? `${accounts} ${census} ` +
        `${countOf(lostPlaces, 'place')} and ${countOf(lostStops, 'stop')} carry a ` +
        'coordinate I could not place in any country, so treat this as a floor rather than a ceiling.'
      : `${accounts} ${census} Every located record resolved, so nothing is missing from that list.`;

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
 * **The mode word a busy day's run clause may use — §11.14 A-99 Part 1 (QA R73-1).**
 *
 * > **A clause that states a fact and a number in one breath takes both from the same statement
 * > in the document.** The mode word is admissible only where the interval being rendered **was
 * > measured from the field that names the mode**.
 *
 * A-98 Part 8 emitted the mode wherever `stop.travelRole === 'journey' && stop.arrival !== null`.
 * Both conjuncts are right, and the predicate was nonetheless wrong, **because it never asked
 * about the thing it was labelling**: `stopOccupancy` takes `durationMins` where it is set, so on
 * a journey stating **both** fields this rendered `arrival.mode` beside a clock derived from the
 * other one — *"on 2026-08-07 you are on a flight from 16:45 until 20:05"* about a flight the same
 * stop says is in the air for eleven hours. **A-98 made a true sentence false**, inside the fix
 * for the very rule A-97 Part 2 had written one ruling earlier.
 *
 * **§0 position 13 (g) is the shape of the repair, not a slogan**: *where a renderer must not mix
 * two fields, the function that renders takes both of them.* `journeyModeWord(stop)` could not
 * check the rule its own doc comment stated, because the value it had to agree with was not in its
 * parameter list — so no reviewer, test or type could ask it the question. **The signature is the
 * mechanism.**
 *
 * **Three conjuncts, and each has a trap behind it.** §2.5 and A-96 Part 2 make `arrival` on a
 * NON-journey stop the leg *into* the stop — a journey that already finished — and **60 of the
 * reference trip's 112 scheduled stops are that shape**, which is why `travelRole` is tested.
 * `source === null` is not a run at all and falls to `''`, which is the arm the disagreeing shape
 * now also takes: *"something that starts at 16:45 runs until 20:05"*, true of the document,
 * exactly as it read before A-98. A-98's motivating shape — a journey whose `durationMins`
 * **agrees** with `arrival.mins` — keeps its mode word.
 *
 * `OccupancySource` still names a field and is still not a statement about the stop's role. What
 * changed is that the renderer now asks *"which field is the number I am about to print?"*, which
 * is a question `source` is the right answer to. **No new field on `OccupiedInterval`** (A-97 Part
 * 3 decision 3). `''` where no mode word may be used, which is what the clause builder tests.
 * Pure.
 *
 * @throws nothing.
 */
export function journeyModeWord(stop: Stop, interval: OccupiedInterval): string {
  if (stop.travelRole !== 'journey' || stop.arrival === null) return '';
  // The interval was measured from `arrival` — either because `stopOccupancy` read it, or because
  // `durationMins` states the same number and the two readings are the same instant.
  const fromArrival =
    interval.source === 'journey_run'
    || (interval.source === 'stated_duration' && stop.durationMins === stop.arrival.mins);
  return fromArrival ? stop.arrival.mode : '';
}

/**
 * The end of a run, as a wall clock — **or the word `midnight` for the one value a wall clock has
 * no spelling for (QA R73-2).**
 *
 * R72-3 correctly made `endMin === 1440` **not** `crossesDay`: a run that ends at exactly midnight
 * does not outlive its day. That moved one value out of the *"still on it at midnight"* arm into
 * the clock arm, which had no case for it — `clockOf(1440)` is `"24:00"`, an hour no wall clock
 * shows and the one value this file's own comment promises is never rendered. A 17:00 flight of
 * 7h00 read *"you are on a flight from 17:00 until 24:00"*.
 *
 * **"Until midnight", and deliberately not *"still on it at midnight"***, which is the other arm's
 * and is false of a flight that has landed. Pure.
 */
function endClock(interval: OccupiedInterval): string {
  return interval.endMin === MIDNIGHT_MIN ? 'midnight' : clockOf(interval.endMin);
}

/** Minutes since midnight at the end of a day — the one instant `clockOf` cannot spell. */
const MIDNIGHT_MIN = 24 * 60;
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
      // QA R71-6 (c): with no city in the question `said` IS *"this trip"*, and the message read
      // *"No day of this trip is recorded for this trip."*
      caveats: [caveat('no_records',
        question.cityKey === null ? 'No day of this trip is recorded yet.' : `No day of this trip is recorded for ${said}.`,
        { city: where })],
    };
  }


  const facts: AnswerFact[] = [fact('days_in_scope', days.length, { city: where, part: question.part, window: `${window.from}-${window.to}`, days: days.length }, scopeCites)];
  const busyStarts: Array<{ date: IsoDate; time: string }> = [];
  const busyRuns: Array<{ date: IsoDate; mode: string; from: string; to: string; crossesDay: boolean }> = [];
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
    // **§11.12 A-97 Part 5 — the day's one piece of evidence, chosen by the classifier's OWN
    // discriminant.** `runsInto` where the day has one, else the first occupying stop that starts
    // inside the window. `classifyDay` puts every `occupying` entry in exactly one of those two
    // buckets and a `busy` day has at least one entry, so this is **total over busy days by
    // construction** — `busyRuns.length + busyStarts.length === busy` — rather than by a fallback
    // string, which is what hid R71-7. The old test was `run.stop.arrival`, a field that merely
    // co-occurs with the verdict, so a stop stating its own `durationMins` produced no clause.
    const evidence = v.occupying.length === 0 ? null : v.runsInto[0] ?? v.occupying.find((o) => o.startsInWindow) ?? v.occupying[0];
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
      // **The end-of-run clock string A-97 Part 4 added here is DELETED — §11.14 A-99 Part 9 (QA
      // R73-4, R72-5, half of R73-2).** Its name is not written here, deliberately: the ceiling
      // over this deletion is a `grep` across `packages/`, and only a ruling brings the name back.
      //
      // The field produced three wrong values in two rounds (`"-16:-20"` at a negative
      // `durationMins`, `"16666684:40"` at 1e9, `"24:00"` at the exact midnight lander) and
      // **zero production readers**: `cli.ts` prints the first four non-empty params of a fact
      // and this was the seventh, so neither its correct value nor any of its three wrong ones
      // was ever shown to anybody. A-97 Part 4 justified it by *"a surface that wants the
      // instant"*, which is the speculative consumer criterion rule 10 exists to refuse.
      //
      // > **A field whose only reader is imagined does not ship, and a derived string in `params`
      // > is a second copy of a computation that already has one home.**
      //
      // Nothing user-visible changes. **The cites are the path to the instant**: every occupying
      // stop of the day is cited below, and a consumer that wants an end instant resolves a cite
      // and calls `occupiedInterval`, which is the one definition A-96 Part 2 built. Reinstating
      // it is a design question, not a memory: the first surface that renders an end instant
      // needs the instant, `crossesDay` and the stop the run belongs to — three values, not one
      // string — and gets a designed shape in the ruling that adds the surface.
      stopsWithoutOccupancy: v.withoutOccupancy.length,
      stopsWithoutTime: v.withoutTime.length,
      stopsOnDay: v.stopCount,
    }, cites));
    if (v.state === 'busy' && evidence !== null) {
      busy += 1;
      // The stop's own evidence, and only the parts of it the engine controls: a `TravelMode` is
      // an enum label and the times are the document's clock. The stop's NAME is in `cites` and
      // is inadmissible in prose (A-96 Part 6), so a run with no mode names neither.
      if (evidence.startsInWindow) {
        busyStarts.push({ date: day.date, time: clockOf(evidence.interval.startMin) });
      } else {
        busyRuns.push({
          date: day.date,
          // **A-99 Part 1 (QA R73-1): the mode word and the clock come out of the SAME FIELD.**
          // The interval is a parameter, which is the fix — a predicate that cannot see the value
          // it must agree with cannot be audited for agreement (§0 position 13 (g)).
          mode: journeyModeWord(evidence.stop, evidence.interval),
          from: clockOf(evidence.interval.startMin),
          to: endClock(evidence.interval),
          crossesDay: evidence.interval.crossesDay,
        });
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
  const preposition = question.cityKey === null ? 'on' : 'in';
  // **A-99 Part 8 — the loose `scope` string is GONE.** It was `${n} day${s} ${prep} ${said}`, it
  // was read by four sentences, and it is where *"across 1 day"* and *"Of the 1 day"* leaked
  // (R71-6 (d), R72-6, R73-3). The only way to name this population now is `countNoun`, and
  // `countNoun` cannot say `1`.
  const theDays = countNoun(n, 'day', preposition, said);
  const everyOne = n === 1 ? theDays : `every one of ${theDays}`;
  // The census, with its denominator (§11.7 rule 6) — 20 of 28 across Split, 91 of 112 trip-wide,
  // and never "28 stops say nothing" when 8 of them do (QA R70-3). **Verb agreement follows the
  // same value the count does** (A-99 Part 8): *"one of the 2 stops … states"*, never *"1 … state"*.
  // Only rendered where `stopsWithoutOccupancy > 0`, which is why the subject has no zero arm.
  const stopsAcross = countNoun(stopsInScope, 'stop', 'across', theDays);
  const census =
    `${stopsInScope === 1 ? stopsAcross : `${countWord(stopsWithoutOccupancy)} of ${stopsAcross}`} ` +
    `state${stopsWithoutOccupancy === 1 ? 's' : ''} no run length` +
    `${stopsWithoutOccupancy === 0 ? '' : ', and Cairn does not invent a duration for a stop that states none'}.`;
  // **QA R71-6 (a).** A day can also be `unknown` because a stop states no TIME, and the arm
  // offered the run-length census as its reason regardless — so the sentence read *"but 0 of the
  // 28 stops … state no run length"*, which is the opposite of a reason. The reason given is now
  // the hole that is actually there; the other one stays in its own caveat.
  const timeCensus =
    `${countWord(stopsWithoutTime)} scheduled stop${stopsWithoutTime === 1 ? '' : 's'} across ${theDays} ` +
    `state${stopsWithoutTime === 1 ? 's' : ''} no time at all, so I cannot place ` +
    `${stopsWithoutTime === 1 ? 'it' : 'them'} in or out of the window.`;
  const whyUnknown = stopsWithoutOccupancy > 0 ? census : timeCensus;
  let text: string;
  let coverage: AnswerCoverage;
  if (unknownDays.length > 0) {
    coverage = 'partial';
    const one = unknownDays[0];
    text =
      `I can't tell. Of ${theDays}, ${countWord(busy)} ${busy === 1 ? 'is' : 'are'} busy in the ${windowText}` +
      `${open > 0 ? `, ${countWord(open)} ${open === 1 ? 'is' : 'are'} clear` : ''}, and ${countWord(unknownDays.length)} I cannot judge. ` +
      // QA R70-8: only a time BEFORE the window is evidence about the window. Where the day
      // offers none, the sentence says so rather than quoting a start time that comes after it.
      `On ${one.date}, nothing I can place runs into the ${question.part}` +
      `${one.lastBefore === '' ? '' : `, and the last thing that starts before it is at ${one.lastBefore}`} — but ` +
      `${whyUnknown} So I cannot say the ${question.part} is free.`;
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
    // QA R71-6 (e): `.trim()` bound to the second template literal rather than to the
    // concatenation, so an answer whose second half is empty ended in a trailing space.
    text = (
      `Yes. Of ${theDays}, ${countWord(open)} ${open === 1 ? 'is' : 'are'} clear in the ${windowText}: ${list(because)}. ` +
      // QA R72-6: *"The other 1 is busy then."* — a remainder of one is not a count either, and
      // `busyStarts`' own *"one has something starting at…"* already spells it this way.
      `${busy > 0 ? `The other ${countWord(busy)} ${busy === 1 ? 'is' : 'are'} busy then.` : ''}`
    ).trim();
  } else {
    coverage = 'complete';
    const clauses = [
      // **A-97 Parts 4 and 5 — four clause forms, not two special cases.** `source` picks the
      // subject phrase and `crossesDay` picks the ending, and the two choices are independent.
      // **No next-day clock time is rendered anywhere**: `endMin % 1440` is wrong above 24 hours
      // and `fromJSON`'s `numOf` accepts any finite `mins`, and a claim about the next day is one
      // A-96 Part 3 refuses in the departure stop's wall clock. *"Still on it at midnight"* is
      // **exactly** the fact the classifier used, so the clause and the verdict are one statement.
      ...busyRuns.map((r) => {
        const journey = r.mode !== '';
        const subject = journey ? `you are on a ${r.mode} from ${r.from}` : `something that starts at ${r.from}`;
        const ending = r.crossesDay
          ? (journey ? 'and still on it at midnight' : 'is still running at midnight')
          : (journey ? `until ${r.to}` : `runs until ${r.to}`);
        return `on ${r.date} ${subject} ${ending}`;
      }),
      busyStarts.length > 0
        ? `${busyRuns.length > 0 ? 'the other ' : ''}${countWord(busyStarts.length)} ${busyStarts.length === 1 ? 'has' : 'have'} ` +
          `something starting at ${list(busyStarts.map((b) => b.time))}`
        : '',
    ].filter((s) => s !== '');
    text = (
      `No. Something occupies the ${windowText} on ${everyOne}` +
      `${clauses.length > 0 ? `: ${list(clauses)}` : ''}. ` +
      `${stopsWithoutOccupancy > 0 ? `${census} That does not change the answer — a stop that states none still occupies its start.` : ''}`
    ).trim();
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
      // QA R71-6 (b): the noun was pluralised and the verb was not.
      `${stopsWithoutTime} scheduled stop${stopsWithoutTime === 1 ? '' : 's'} in this range ` +
        `${stopsWithoutTime === 1 ? 'carries' : 'carry'} no time, so ${stopsWithoutTime === 1 ? 'it' : 'they'} could not be ` +
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
