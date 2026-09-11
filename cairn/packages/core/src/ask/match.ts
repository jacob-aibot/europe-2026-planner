/**
 * **The recogniser of §11.3 — not a classifier.**
 *
 * Free-text intent classification is not a zero-dependency problem and this file does not
 * pretend it is. What *is* a zero-dependency problem, and the reason this capability is buildable
 * at all, is that **both halves of a question about a trip are closed**: the intent comes from
 * the set `Question` enumerates, and the entity comes from the document's own vocabulary. There
 * is no open-vocabulary place resolution anywhere in this feature — *"Vienna"* is not recognised
 * as a city in the world; it is matched against the six names **this trip** carries.
 *
 * So: an ordered list of literal trigger phrases plus a lookup of the trip's own names. **No
 * scoring, no ranking, no nearest-match, no confidence threshold.** It matches, or it refuses.
 *
 * **Four of its five rules are refusals**, and the order they are asked in is itself a decision:
 *
 *  1. **Lifetime scope first** (§11.3 rule 3). *"How many countries have I been to"* and *"how
 *     many countries am I visiting"* differ by one word and by an entire data set. The rule is
 *     written unconditionally — *text carrying a lifetime pattern returns
 *     `out_of_scope: 'lifetime'`* — so it is asked before any intent can consume the sentence.
 *     Answering the trip-scoped version would be **right about the wrong question**.
 *  2. **Recommendation next** (rule 4). Jacob's own fence, made a feature of the recogniser
 *     rather than left to produce a bad answer.
 *  3. Then the intents. **Two readings is a refusal, never a choice** (rule 1): picking the first
 *     would be the confident-wrong-answer shape the root `CLAUDE.md` refuses.
 *  4. **`unread` is reported, not discarded** (rule 2). A recogniser that silently ignores half
 *     the input is a classifier pretending to be a parser.
 *  5. **`askableQuestions(trip)` is the menu** (rule 5) and it is the answer to every refusal.
 *     This is what makes v1 honest about its own size: the free-text box is a shortcut into a
 *     menu that is always reachable, never a promise of open-ended understanding.
 *
 * **This is a fixed-menu answer engine with a text shortcut in front of it**, and that is
 * deliberately the thing being built. **`matchQuestion` is also the symbol design (b) replaces**
 * (§11.1): a model's output is a `Question`, validated against this closed union by a total
 * parser before it reaches `ask`. It may never replace `ask`.
 *
 * The trigger tables themselves stay internal (§11.9): a caller that can reach one is a caller
 * that will grow a second.
 */
import type { Trip } from '../model/types.ts';
import type { CityKey } from '../model/ids.ts';
import { orderedCities } from '../derive/summary.ts';
import type { DayPart, MatchOutcome, Question } from './types.ts';

/** A consumed span of the normalised token list, `[from, to)`. */
type Span = { from: number; to: number };

/**
 * Lowercase, drop apostrophes so *"what's"* folds to *"whats"*, and take every run of letters
 * and digits as a token. Both the input and the trip's own city names go through this one
 * function, so the two sides of a name comparison can never disagree about punctuation.
 *
 * **It MATCHES tokens rather than splitting on non-tokens, and that is deliberate.** §2.2 A-10's
 * ship gate is a greppable ceiling over `apps/` and `packages/`: the deleted slug expression —
 * the negated letters-and-digits class that once minted a `CityKey` out of a display name — may
 * not appear anywhere, and `packages/core/test/cityKey.test.ts` greps for it. Writing the
 * positive form is not evasion of that gate, it is staying clear of it: **nothing here mints a
 * key.** This function reads the user's own sentence, and the city half of a match is a lookup
 * of `City.key`/`City.name` values the document already carries.
 *
 * It is also **not** `normalizeCityName` and may not be implemented in terms of it (§8.4 A-82
 * Part 3's rule at a third door): that function answers *"are these two city names the same
 * name"*, and this one answers *"what words did the user type"*.
 */
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/['’]/g, '').match(/[a-z0-9]+/g) ?? [];
}

/** The first contiguous occurrence of `phrase`'s tokens in `tokens`, or `null`. */
function findPhrase(tokens: readonly string[], phrase: string): Span | null {
  const needle = tokenize(phrase);
  if (needle.length === 0) return null;
  for (let i = 0; i + needle.length <= tokens.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (tokens[i + j] !== needle[j]) { ok = false; break; }
    }
    if (ok) return { from: i, to: i + needle.length };
  }
  return null;
}

function firstOf(tokens: readonly string[], phrases: readonly string[]): Span | null {
  for (const p of phrases) {
    const hit = findPhrase(tokens, p);
    if (hit) return hit;
  }
  return null;
}

/**
 * §11.3 rule 3's vocabulary, verbatim from the ruling: `ever`, `in total`, `all my trips`,
 * `have I been`, `so far`. **v1's vocabulary contains no lifetime pattern**, so any of these
 * refuses with a pointer to `stats` rather than answering this trip's seven.
 */
const LIFETIME_TRIGGERS = [
  'have i been', 'have i ever', 'in total', 'all my trips', 'across all my trips',
  'every trip', 'so far', 'ever', 'lifetime', 'all time', 'in my life',
];

/**
 * §11.3 rule 4. **Refused by name**, with the reason stated in one sentence. A restaurant
 * recommendation needs a live places API, a paid vendor and a server; it is explicitly out of
 * scope and not to be designed around.
 */
const RECOMMENDATION_TRIGGERS = [
  'where should i eat', 'where should we eat', 'what should i eat', 'where to eat',
  'where should i go', 'where should we go', 'what should i see', 'what should i do',
  'best restaurant', 'best restaurants', 'best bar', 'best bars', 'good restaurant',
  'whats good', 'what is good', 'any good', 'any bars', 'any bar', 'any restaurants',
  'recommend', 'recommendation', 'recommendations', 'suggest', 'worth seeing',
  'worth visiting', 'should i visit', 'should i try', 'what else should',
];

const OVERVIEW_TRIGGERS = [
  'what does my trip look like', 'what my trip looks like', 'what does the trip look like',
  'tell me about my trip', 'describe my trip', 'summarise my trip', 'summarize my trip',
  'summary of my trip', 'overview of my trip', 'trip overview', 'overview',
  'what is my trip', 'whats my trip',
];

const UNBOOKED_TRIGGERS = [
  'unbooked', 'not booked', 'not yet booked', 'nothing booked', 'still need to book',
  'need to book', 'needs booking', 'still needs booking', 'left to book', 'still to book',
  'what still needs', 'have i booked', 'what is not booked', 'whats not booked',
];

const COUNTRY_TRIGGERS = [
  'how many countries', 'how many different countries', 'number of countries',
  'which countries', 'what countries', 'countries am i visiting', 'countries on this trip',
];

const EDGE_TRIGGERS: Record<'arrive' | 'leave', readonly string[]> = {
  leave: ['leave', 'leaving', 'depart', 'departing', 'departure', 'head out of', 'fly out of'],
  arrive: ['arrive', 'arriving', 'arrival', 'get to', 'get in to', 'get into', 'land in'],
};

const FREE_TIME_TRIGGERS = [
  'free evening', 'free morning', 'free afternoon', 'free time', 'free day',
  'any free', 'spare time', 'spare evening', 'spare morning', 'spare afternoon',
  'nothing planned', 'nothing on', 'anything planned', 'unscheduled', 'downtime',
];

const DAYPART_TRIGGERS: ReadonlyArray<{ part: DayPart; phrases: readonly string[] }> = [
  { part: 'morning', phrases: ['morning', 'mornings'] },
  { part: 'afternoon', phrases: ['afternoon', 'afternoons'] },
  { part: 'evening', phrases: ['evening', 'evenings'] },
];

const DAYPART_ORDER: readonly DayPart[] = ['morning', 'afternoon', 'evening'];

/** The display name of a city key, or the key itself for a key no city carries. */
function cityName(trip: Trip, key: CityKey): string {
  return trip.cities.find((c) => c.key === key)?.name ?? key;
}

/**
 * §11.7 rule 2 — **the restatement is mandatory and it precedes the answer.** This is the root
 * `CLAUDE.md` convention (*never present our reading as the user's own*) applied at the one place
 * in this product where the system's interpretation of the user stands between them and their
 * data. Internal: the CLI prints `I read this as: ${restatement}.`
 */
export function restate(question: Question, trip: Trip): string {
  switch (question.kind) {
    case 'trip_overview':
      return 'what your trip looks like';
    case 'city_edge':
      return question.edge === 'leave'
        ? `when you leave ${cityName(trip, question.cityKey)}`
        : `when you arrive in ${cityName(trip, question.cityKey)}`;
    case 'unbooked':
      return 'what on this trip is still unbooked';
    case 'country_count':
      return 'how many countries this trip visits';
    case 'free_time':
      return question.cityKey === null
        ? `whether you have a free ${question.part} anywhere on this trip`
        : `whether you have a free ${question.part} in ${cityName(trip, question.cityKey)}`;
  }
}

/** The structured data §2.1 requires beside a user-facing string. Never a coordinate. */
function questionParams(question: Question, trip: Trip): Record<string, string | number> {
  switch (question.kind) {
    case 'city_edge':
      return { kind: question.kind, edge: question.edge, cityKey: question.cityKey, city: cityName(trip, question.cityKey) };
    case 'free_time':
      return question.cityKey === null
        ? { kind: question.kind, part: question.part }
        : { kind: question.kind, part: question.part, cityKey: question.cityKey, city: cityName(trip, question.cityKey) };
    default:
      return { kind: question.kind };
  }
}

/**
 * Turn free text into a `Question`, or refuse. Pure; reads only `text` and the trip's own names.
 * Never throws.
 *
 * @throws nothing.
 */
export function matchQuestion(text: string, trip: Trip): MatchOutcome {
  const tokens = tokenize(typeof text === 'string' ? text : '');
  if (tokens.length === 0) return { kind: 'unrecognised' };

  // 1 & 2 — the two scope refusals, asked before any intent can consume the sentence.
  if (firstOf(tokens, LIFETIME_TRIGGERS) !== null) {
    return {
      kind: 'out_of_scope',
      reason: 'lifetime',
      pointer:
        'That is a question about every trip you have recorded, not about this one — it is what ' +
        '`stats` answers (travelStats over your whole library). Ask it there rather than here, ' +
        'where the only records are this trip\'s.',
    };
  }
  if (firstOf(tokens, RECOMMENDATION_TRIGGERS) !== null) {
    return {
      kind: 'out_of_scope',
      reason: 'recommendation',
      pointer:
        'Cairn answers from your trip, and your trip does not contain restaurants it has not ' +
        'already recorded. Recommending somewhere new would need a places service Cairn does ' +
        'not have and deliberately does not use.',
    };
  }

  // 3 — the entity half: the trip's OWN names, in display order.
  const cityHits: Array<{ key: CityKey; span: Span }> = [];
  for (const city of orderedCities(trip)) {
    const span = findPhrase(tokens, city.name) ?? findPhrase(tokens, city.key);
    if (span) cityHits.push({ key: city.key, span });
  }

  const candidates: Question[] = [];
  const consumed: Span[] = [];
  const take = (...spans: Array<Span | null>) => {
    for (const s of spans) if (s) consumed.push(s);
  };

  const overview = firstOf(tokens, OVERVIEW_TRIGGERS);
  if (overview) { candidates.push({ kind: 'trip_overview' }); take(overview); }

  const unbooked = firstOf(tokens, UNBOOKED_TRIGGERS);
  if (unbooked) { candidates.push({ kind: 'unbooked' }); take(unbooked); }

  const countries = firstOf(tokens, COUNTRY_TRIGGERS);
  if (countries) { candidates.push({ kind: 'country_count' }); take(countries); }

  // `city_edge` needs BOTH halves. An edge verb with no city of this trip beside it produces no
  // reading at all — and is therefore reported as unread — rather than being guessed at.
  for (const edge of ['arrive', 'leave'] as const) {
    const hit = firstOf(tokens, EDGE_TRIGGERS[edge]);
    if (!hit || cityHits.length === 0) continue;
    take(hit);
    for (const c of cityHits) { candidates.push({ kind: 'city_edge', cityKey: c.key, edge }); take(c.span); }
  }

  const freeTime = firstOf(tokens, FREE_TIME_TRIGGERS);
  if (freeTime) {
    take(freeTime);
    const parts: DayPart[] = [];
    for (const d of DAYPART_TRIGGERS) {
      const hit = firstOf(tokens, d.phrases);
      if (hit) { parts.push(d.part); take(hit); }
    }
    // **No daypart named is not a default — it is three readings.** Asking about "free time"
    // with no window says nothing about which window, and picking one would be the confident
    // guess rule 1 refuses. Three readings is a refusal that hands back the three ways forward.
    const asked = parts.length > 0 ? parts : [...DAYPART_ORDER];
    const keys: Array<CityKey | null> = cityHits.length > 0 ? cityHits.map((c) => c.key) : [null];
    for (const part of asked) {
      for (const key of keys) {
        candidates.push({ kind: 'free_time', part, cityKey: key });
        const hit = cityHits.find((c) => c.key === key);
        if (hit) take(hit.span);
      }
    }
  }

  if (candidates.length === 0) return { kind: 'unrecognised' };
  if (candidates.length > 1) {
    return {
      kind: 'ambiguous',
      readings: candidates,
      restatements: candidates.map((q) => restate(q, trip)),
    };
  }

  const eaten = new Set<number>();
  for (const s of consumed) for (let i = s.from; i < s.to; i++) eaten.add(i);
  return {
    kind: 'matched',
    question: candidates[0],
    restatement: restate(candidates[0], trip),
    params: questionParams(candidates[0], trip),
    unread: tokens.filter((_, i) => !eaten.has(i)),
  };
}

/**
 * **The menu — §11.3 rule 5, and the answer to every refusal.** Instantiated over the trip's real
 * cities, in display order, so nothing here can name a city the document does not carry.
 *
 * Pure. Never throws.
 *
 * Deterministic order, because a golden over it has to be possible: the three whole-trip
 * questions, then both edges of every city, then every daypart for the trip as a whole and then
 * for each city.
 */
export function askableQuestions(trip: Trip): Question[] {
  const cities = orderedCities(trip);
  const out: Question[] = [{ kind: 'trip_overview' }, { kind: 'unbooked' }, { kind: 'country_count' }];
  for (const c of cities) {
    out.push({ kind: 'city_edge', cityKey: c.key, edge: 'arrive' });
    out.push({ kind: 'city_edge', cityKey: c.key, edge: 'leave' });
  }
  for (const part of DAYPART_ORDER) out.push({ kind: 'free_time', part, cityKey: null });
  for (const c of cities) {
    for (const part of DAYPART_ORDER) out.push({ kind: 'free_time', part, cityKey: c.key });
  }
  return out;
}
