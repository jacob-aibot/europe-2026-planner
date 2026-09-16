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
 *     **§11.13 A-98 Part 2 makes that list PROVABLY a diagnosis**: it cannot cause an answer,
 *     because the only thing that can is membership of `ACCEPTED_COUNTRY_QUESTIONS` — the 816
 *     sentences Cairn itself wrote — and no member of that set trips it (0 of 816, asserted).
 *     So the order these two are asked in cannot change any outcome; it only chooses which
 *     refusal a refused sentence gets.
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
import { cityProse } from './prose.ts';
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
 *
 * **The class is every LETTER and every NUMBER, in any script — QA R70-7.** It used to be
 * `[a-z0-9]`, which meant a word written in any other script could not appear in `unread` at all:
 * *"do I have a free evening in Сплит"* was answered **about the whole trip** with the user's own
 * subject word gone without trace, and §11.3 rule 2 — *a recogniser that silently ignores half
 * the input is a classifier pretending to be a parser* — was unenforceable for exactly the input
 * it was written for. The model supports non-Latin city names (`cityKey.test.ts` carries two
 * Japanese ones), so the recogniser has to be able to *fail* on them legibly.
 */
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/['’]/g, '').match(/[\p{L}\p{N}]+/gu) ?? [];
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
 * §11.3 rule 3's vocabulary: `ever`, `in total`, `all my trips`, `so far`. These are **totality
 * markers** — a word that says "across everything" regardless of what verb carries it.
 */
const LIFETIME_TRIGGERS = [
  'in total', 'total', 'all my trips', 'across all my trips',
  'every trip', 'so far', 'to date', 'ever', 'lifetime', 'all time', 'in my life',
];

/**
 * **The other half of §11.3 rule 3, and it is a CLASS rather than a phrase list — QA R70-5.**
 *
 * The shipped rule was six literal phrases, so *"how many countries have I visited"*, *"…have I
 * seen"*, *"…have I stayed in"*, *"which countries have I visited"* and *"how many countries did
 * I visit"* all fell through to `country_count` and were answered **"This trip accounts for 7
 * countries"** — *right about the wrong question*, which §11.3 names as the failure mode this
 * whole section is arranged against. `'have i been'` was on the list because of its **frame**,
 * not its words: a **past-tense first-person** question about travel is a question about the
 * library (`travelStats`, §8.4), never about the document in hand.
 *
 * The class is deliberately narrow on its verb: `have i booked` is a trip-scoped question this
 * recogniser answers, and a rule that read *any* word after `have i` would refuse it.
 */
const PAST_TRAVEL_VERBS = [
  'been', 'visited', 'seen', 'stayed', 'gone', 'went', 'travelled', 'traveled', 'toured', 'explored', 'hit',
];
/** The same class in the bare-infinitive frame `did I <verb>` / `have I not <verb>`. */
const PAST_TRAVEL_BASES = ['visit', 'see', 'stay', 'go', 'travel', 'tour', 'explore'];

/**
 * How many words may sit between the auxiliary and the participle — QA R71-3. The frame was
 * matched on strict token **adjacency**, so one adverb defeated it: *"have I **already** been
 * to"*, *"…have I **now** visited"*, *"…have I **not** been to"* (the frame this file's own
 * comment already claimed) all fell through to `country_count` and were answered about this trip.
 * Three is enough for *"have I ever really been to"* and short enough that the participle is still
 * the auxiliary's own.
 */
const FRAME_WINDOW = 3;

/**
 * Does the sentence carry a past-tense first-person travel frame? Pure.
 *
 * `have i <past participle>`, `had i …`, `did i <base>`, `i have <past participle>` and
 * `i've <past participle>` (which `tokenize` has already folded to `ive`) — each with up to
 * `FRAME_WINDOW` words in between, and each in the **plural** as well, because a shared trip is a
 * first-person-plural document (*"how many countries have we visited"*).
 *
 * **The class stays narrow on its verb**: `have i booked` is a trip-scoped question this
 * recogniser answers, and a rule that read *any* word after `have i` would refuse it.
 */
function lifetimeFrame(tokens: readonly string[]): boolean {
  const past = (w: string | undefined) => w !== undefined && PAST_TRAVEL_VERBS.includes(w);
  const base = (w: string | undefined) => w !== undefined && PAST_TRAVEL_BASES.includes(w);
  /** Is one of `verbs` within `FRAME_WINDOW` words after position `from`? */
  const within = (from: number, verb: (w: string | undefined) => boolean) => {
    for (let j = from; j < Math.min(tokens.length, from + FRAME_WINDOW + 1); j++) {
      if (verb(tokens[j])) return true;
    }
    return false;
  };
  const subject = (w: string | undefined) => w === 'i' || w === 'we';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    // `have I <participle>` / `had we <participle>` / `did I <base>`, adverbs allowed between.
    if ((t === 'have' || t === 'had' || t === 'has') && subject(tokens[i + 1]) && within(i + 2, past)) return true;
    if (t === 'did' && subject(tokens[i + 1]) && within(i + 2, base)) return true;
    // `I have <participle>` / `we had <participle>`.
    if (subject(t) && (tokens[i + 1] === 'have' || tokens[i + 1] === 'had') && within(i + 2, past)) return true;
    // `I've <participle>` / `we've <participle>` — `tokenize` has dropped the apostrophe.
    if ((t === 'ive' || t === 'iv' || t === 'weve') && within(i + 1, past)) return true;
  }
  return false;
}

/**
 * **Is this sentence about the user's whole travel history? A DIAGNOSIS, and nothing more —
 * §11.13 A-98 Part 2.**
 *
 * A list over English may **diagnose** a refusal; it may never **authorise an answer**. Before
 * A-98 this predicate and the trip-scope marker list A-98 deletes decided between them whether
 * `country_count` was
 * answered, and R72-1 measured ten lifetime phrasings answered *"This trip accounts for 7
 * countries"* straight through both. Now the only thing that causes an answer is membership of
 * `ACCEPTED_COUNTRY_QUESTIONS` — a set of sentences **Cairn itself wrote** — and this predicate
 * chooses only which *refusal* a sentence gets: the specific `'lifetime'` one rather than
 * `'scope_unclear'`.
 *
 * **Exported for the A-98 Part 9 criterion 2 tripwire and for nothing else** (§11.9: it is not on
 * §2.10's surface). That criterion asserts **no member of the accept set trips this** — 0 of 816 —
 * so the order the two refusals are asked in cannot change any outcome. It is green by
 * construction today and reddens the day a fragment carrying a past-travel frame is admitted,
 * which is exactly when A-98 Part 6 rider 1's builder-only route would otherwise be dangerous.
 *
 * Pure. Never throws.
 */
export function lifetimeScoped(text: string): boolean {
  return lifetimeTokens(tokenize(typeof text === 'string' ? text : ''));
}

/** The same diagnosis over an already-tokenised sentence — `matchQuestion`'s own path. */
function lifetimeTokens(tokens: readonly string[]): boolean {
  return firstOf(tokens, LIFETIME_TRIGGERS) !== null || lifetimeFrame(tokens);
}

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

/**
 * **DIAGNOSTIC ONLY after §11.13 A-98 Part 2.** This list no longer produces a candidate and
 * cannot cause an answer. It survives to choose the **better refusal** — `scope_unclear` rather
 * than `unrecognised` — for a sentence that is clearly about countries and is not one Cairn can
 * be asked.
 */
const COUNTRY_TRIGGERS = [
  'how many countries', 'how many different countries', 'number of countries',
  'which countries', 'what countries', 'countries am i visiting', 'countries on this trip',
];

/**
 * **The sentences Cairn wrote — §11.13 A-98 Parts 2 and 3, and the reason there is no fourth
 * phrase list in this file.**
 *
 * > **A scope gate does not test the user's sentence for a property. It asks whether the user's
 * > sentence IS one of the questions Cairn can be asked.** The only list that may cause an
 * > **answer** is a list of sentences **Cairn itself authored**. A list over English may
 * > *diagnose* a refusal; it may never *authorise* one.
 *
 * Three rounds rewrote this boundary by lengthening a phrase list and all three leaked. The last
 * one — a trip-scope marker list, tested by containment — was measured half-inert at R72-1: six
 * of its twelve markers were **person and tense** markers (`am i`, `do we`) that occur just as
 * naturally in a question about a lifetime, and the six that genuinely named the document leaked
 * too, because **containment is not reference**. *"How many countries am I up to **including this
 * trip**"* carries a noun phrase that unambiguously denotes the document in hand and is a
 * question about a life: **the word that decides the scope is the preposition in front of the
 * marker**, and a token-containment test has no notion of scope to see that with.
 *
 * So the gate is **whole-sentence token equality** against a set generated from 43 adjudicated
 * fragments: `tokenize(text).join(' ')` is a member, or `country_count` is not a candidate. One
 * spelling, no second reading (criterion rule 8).
 *
 * **The admission test for a new fragment** (A-98 Part 3, and a builder may apply it without an
 * architect round — Part 6 rider 1): *can this exact whole sentence, for any stem, be a question
 * about the user's whole travel history?* **If yes for even one stem, the fragment is refused.**
 * Some cells are ungrammatical (*"number of countries am i visiting"*) and that costs nothing —
 * nobody types them, and an ungrammatical cell is still trip-scoped, which is the only property
 * the set has to have. **The set grows by a fragment, never by a sentence.**
 *
 * **Over-refusal is the only failure this mechanism can produce**, by construction: an answer
 * requires membership of a finite set, every member of which was adjudicated before it was
 * written down. An unlisted phrasing costs a refusal with the menu behind it (§11.3 rule 5); the
 * failure it replaces was a false statement about a user's life.
 */
const COUNTRY_STEMS = [
  'how many countries', 'how many different countries', 'which countries',
  'what countries', 'number of countries', 'countries',
];
const DOC_DETERMINERS = ['this', 'my', 'the', 'our'];
const DOC_NOUNS = ['trip', 'itinerary'];
/** Frames that take a noun phrase naming the document; `<np>` is one of the eight. */
const NP_FRAMES = [
  'on <np>', 'in <np>', 'are on <np>', 'are in <np>', 'does <np> visit',
  'does <np> cover', 'does <np> go to', 'does <np> include', 'is <np>',
  'am i visiting on <np>', 'are we visiting on <np>', 'do i visit on <np>',
  'do we visit on <np>', 'will i visit on <np>', 'will we visit on <np>',
];
/** Frames that name no document and are trip-scoped by their own tense (A-98 Part 3). */
const BARE_FRAMES = [
  'am i visiting', 'are we visiting', 'will i visit', 'will we visit',
  'do i visit', 'do we visit', 'am i seeing', 'are we seeing', 'will i see',
  'will we see', 'do i go to', 'do we go to', 'am i going to', 'are we going to',
  'am i travelling to', 'are we travelling to',
];

/**
 * `6 × (16 + 15 × 8)` = **816** sentences, generated at module load and **module-private**
 * (§11.9). Not exported, not on §2.10's surface, and not reachable by a caller: a caller that can
 * reach a trigger table is a caller that will grow a second.
 */
const ACCEPTED_COUNTRY_QUESTIONS: ReadonlySet<string> = (() => {
  const nps: string[] = [];
  for (const d of DOC_DETERMINERS) for (const n of DOC_NOUNS) nps.push(`${d} ${n}`);
  const frames = [...BARE_FRAMES];
  for (const f of NP_FRAMES) for (const np of nps) frames.push(f.replace('<np>', np));
  const out = new Set<string>();
  for (const stem of COUNTRY_STEMS) for (const f of frames) out.add(tokenize(`${stem} ${f}`).join(' '));
  return out;
})();

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

/**
 * The prepositions that invert an edge verb, by edge — QA R70-6. *"leave **for** Vienna"* is an
 * arrival; *"arrive **from** Split"* is a departure. Only these, and only between the verb and
 * the city: *"arrive in Vienna"* and *"leave Vienna"* are unambiguous and stay so.
 */
const EDGE_FLIPPERS: Record<'arrive' | 'leave', readonly string[]> = {
  leave: ['for', 'to', 'towards', 'toward'],
  // Backticks rather than quotes, deliberately: `test/boundaries.test.ts`'s module-specifier
  // scanner reads the word `from` immediately before a quote as an import, and this one is a
  // preposition. Spelling it any other way would be hiding it from that scanner rather than
  // being legible to it.
  arrive: [`from`],
};

const other = (edge: 'arrive' | 'leave'): 'arrive' | 'leave' => (edge === 'leave' ? 'arrive' : 'leave');

/** Is the city span separated from the edge verb by exactly a flipping preposition? Pure. */
function flipsEdge(tokens: readonly string[], verb: Span, city: Span, edge: 'arrive' | 'leave'): boolean {
  if (city.from < verb.to) return false;
  const between = tokens.slice(verb.to, city.from);
  return between.length === 1 && EDGE_FLIPPERS[edge].includes(between[0]);
}

/**
 * The display name of a city key, or the key itself for a key no city carries. **For `params`
 * only** — the structured half of a `MatchOutcome` carries the document's own value, exactly as
 * an `AnswerFact` does (A-96 Part 6). `restate` narrates through `cityProse` instead.
 */
function cityName(trip: Trip, key: CityKey): string {
  return trip.cities.find((c) => c.key === key)?.name ?? key;
}

/**
 * §11.7 rule 2 — **the restatement is mandatory and it precedes the answer.** This is the root
 * `CLAUDE.md` convention (*never present our reading as the user's own*) applied at the one place
 * in this product where the system's interpretation of the user stands between them and their
 * data. Internal: the CLI prints `I read this as: ${restatement}.`
 *
 * **A-96 Part 6 reaches this sentence too.** The restatement is prose Cairn composes, printed at
 * the same terminal as `answer.text`, and A-96 cites it as the reason `City.name` has to be
 * admissible at all. *Admissible is not trusted*: the name goes through `prose.ts`'s one
 * chokepoint here as well, so a trip whose city is stored as `LONDON` restates as `[redacted]`
 * rather than leaking a §6.6 pattern class one line above an answer that does not.
 */
export function restate(question: Question, trip: Trip): string {
  switch (question.kind) {
    case 'trip_overview':
      return 'what your trip looks like';
    case 'city_edge':
      return question.edge === 'leave'
        ? `when you leave ${cityProse(trip, question.cityKey)}`
        : `when you arrive in ${cityProse(trip, question.cityKey)}`;
    case 'unbooked':
      return 'what on this trip is still unbooked';
    case 'country_count':
      return 'how many countries this trip visits';
    case 'free_time':
      return question.cityKey === null
        ? `whether you have a free ${question.part} anywhere on this trip`
        : `whether you have a free ${question.part} in ${cityProse(trip, question.cityKey)}`;
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
  if (lifetimeTokens(tokens)) {
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

  // **§11.13 A-98 — `country_count` is a candidate IF AND ONLY IF the sentence is one Cairn
  // wrote.** Whole-sentence token equality, not containment: the scope of a sentence is not a
  // property of the words in it, and this recogniser has no structure to read one out of. It does
  // not need one, because the set of questions Cairn can be asked is closed and Cairn wrote it.
  //
  // **Nothing about this decision returns from `matchQuestion`** (A-98 Part 7, QA R72-2). The
  // gate is scoped to this one intent — the only intent whose noun a *different* capability
  // answers over a *different* population (`travelStats`) — and a sentence that fails it may
  // still be a perfectly good question for another intent. The sentence-level refusal is at the
  // bottom of this function, where `unrecognised` would otherwise be returned.
  const countries = firstOf(tokens, COUNTRY_TRIGGERS);
  if (ACCEPTED_COUNTRY_QUESTIONS.has(tokens.join(' '))) {
    candidates.push({ kind: 'country_count' });
    // The WHOLE sentence is consumed, because the whole sentence is what matched. §11.3 rule 2
    // reports what the recogniser did not read, and under equality there is nothing it did not
    // read — reporting `am i visiting` as unread here would be the recogniser lying the other
    // way about its own comprehension.
    take({ from: 0, to: tokens.length });
  }

  // `city_edge` needs BOTH halves. An edge verb with no city of this trip beside it produces no
  // reading at all — and is therefore reported as unread — rather than being guessed at.
  for (const edge of ['arrive', 'leave'] as const) {
    const hit = firstOf(tokens, EDGE_TRIGGERS[edge]);
    if (!hit || cityHits.length === 0) continue;
    take(hit);
    for (const c of cityHits) {
      candidates.push({ kind: 'city_edge', cityKey: c.key, edge });
      take(c.span);
      // **QA R70-6.** *"when do I leave FOR Vienna"* is a question about ARRIVING in Vienna, and
      // the recogniser had no notion that a consumed edge verb can be negated by an unconsumed
      // word beside it: it delivered the `leave` reading and put the preposition in `unread`.
      // Both readings are expressible in the closed union, so §11.3 rule 1 governs — **two
      // readings is a refusal, never a choice.** The flip is only recognised where the
      // preposition sits between the verb and the city, which is the only place it can mean this.
      if (flipsEdge(tokens, hit, c.span, edge)) candidates.push({ kind: 'city_edge', cityKey: c.key, edge: other(edge) });
    }
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

  if (candidates.length === 0) {
    // **`scope_unclear` is a better `unrecognised`, never a replacement for a reading** (A-98
    // Part 7). It fires only here: a country trigger is present, the sentence is not one Cairn
    // wrote, and no other intent produced a reading — so nothing is being discarded to say it.
    if (countries !== null) {
      return {
        kind: 'out_of_scope',
        reason: 'scope_unclear',
        pointer:
          'I cannot tell whether you mean this trip or every trip you have recorded, and those ' +
          'are two different data sets. Ask "how many countries am I visiting" for this trip, or ' +
          '`stats` for your whole library.',
      };
    }
    return { kind: 'unrecognised' };
  }
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
