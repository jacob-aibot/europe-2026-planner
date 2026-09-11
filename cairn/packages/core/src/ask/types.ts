/**
 * The closed vocabulary of ARCHITECTURE **§11** — a question about your own trip, and the
 * answer's shape. Types only; no runtime code, no dependencies.
 *
 * **A language model may parse a question. It may never answer one** (§11.1). `ask` takes a
 * value from the `Question` union below and returns an `Answer` assembled from fields of the
 * document; `matchQuestion` is the only thing in this package that turns free text into one of
 * those values, and it is the symbol a model would one day replace. Nothing here is stored:
 * `SCHEMA_VERSION` and `SUMMARY_VERSION` do not move for anything in `ask/`.
 *
 * String-literal unions throughout and no `enum` anywhere — `packages/core` runs on bare Node
 * through type stripping (`erasableSyntaxOnly`), so an enum is a build error, not a style note.
 */
import type {
  BookingId, CityKey, ConflictId, CountryCode, DayId, IsoDate, PlaceId, StopId, TripId,
} from '../model/ids.ts';
import type { CountryIndex } from '../geo/countryIndex.ts';
import type { Trip } from '../model/types.ts';

/**
 * The three windows `free_time` asks about. The window *boundaries* are internal (§11.9: a
 * caller that can reach the daypart table is a caller that will grow a second one); the three
 * names are public because they are a field of `Question`.
 */
export type DayPart = 'morning' | 'afternoon' | 'evening';

/**
 * **The closed set. Five kinds in v1** (§11.3), and both halves of every member are closed: the
 * intent comes from this union and the entity comes from the document's own vocabulary
 * (`trip.cities[].key`). There is no open-vocabulary place resolution anywhere in this feature —
 * *"Vienna"* is never recognised as a city in the world, only as one of the six names this trip
 * carries.
 *
 * `free_time.cityKey` is `null` for *"do I have a free evening"* asked of the whole trip.
 */
export type Question =
  | { kind: 'trip_overview' }
  | { kind: 'city_edge'; cityKey: CityKey; edge: 'arrive' | 'leave' }
  | { kind: 'unbooked' }
  | { kind: 'country_count' }
  | { kind: 'free_time'; part: DayPart; cityKey: CityKey | null };

/**
 * What `matchQuestion` returns. **Four arms and three of them are refusals** — §11.3's five
 * rules, four of which are refusals.
 *
 *  - `matched` carries the `restatement` §11.7 rule 2 makes mandatory, and `unread`: the input's
 *    own words that no trigger and no city name consumed. *A recogniser that silently ignores
 *    half the input is a classifier pretending to be a parser.*
 *  - `ambiguous` is what two readings produce — **never a choice between them**. Picking the
 *    first would be the confident-wrong-answer shape the root `CLAUDE.md` refuses.
 *  - `out_of_scope` is refused **by name**, with a pointer: `'lifetime'` points at `stats`
 *    (`travelStats` over the whole library — a different data set, one word away), and
 *    `'recommendation'` states Jacob's own fence.
 *  - `unrecognised` is everything else. `askableQuestions(trip)` is the way out of all four.
 */
export type MatchOutcome =
  | {
      kind: 'matched';
      question: Question;
      restatement: string;
      params: Record<string, string | number>;
      unread: string[];
    }
  | { kind: 'ambiguous'; readings: Question[]; restatements: string[] }
  | { kind: 'out_of_scope'; reason: 'lifetime' | 'recommendation'; pointer: string }
  | { kind: 'unrecognised' };

/** How much of the question the document could answer (§11.7 rule 1). */
export type AnswerCoverage = 'complete' | 'partial' | 'none';

/**
 * One record an answer read — the **evidence for a statement**.
 *
 * **This is deliberately NOT `Ref`, and the reason is §0 position 10 (b)** — *a predicate with
 * more than one consumer is not widened in place; two questions answered by one type are
 * answered by coincidence.* `Ref` is the **subject of a finding about a record** (a conflict's
 * subject, a validation issue's target) and its `RefKind` is closed at the five record classes a
 * rule may accuse. A cite's alphabet is a different one: it includes a `City` (which has no id,
 * only a per-trip `key` — §2.2 A-10) and a `Conflict` (which is derived and is not a record at
 * all). Widening `RefKind` would publish a way for a conflict rule to accuse a city, or to accuse
 * another conflict. **`Ref` does not move and `RefKind` gains no value.**
 */
export type AnswerCite =
  | { kind: 'trip'; id: TripId }
  | { kind: 'day'; id: DayId }
  | { kind: 'stop'; id: StopId }
  | { kind: 'place'; id: PlaceId }
  | { kind: 'booking'; id: BookingId }
  | { kind: 'city'; key: CityKey }
  | { kind: 'conflict'; id: ConflictId };

/**
 * One structured statement the sentence is rendered FROM. `label` and `value` are what a
 * template interpolates; `cites` is that fact's own evidence and is a subset of the answer's.
 *
 * `value: null` is first-class and renders as *"not recorded"* — §11.7 rule 3: nothing is
 * defaulted into existence.
 */
export type AnswerFact = {
  label: string;
  value: string | number | null;
  params: Record<string, string | number>;
  cites: readonly AnswerCite[];
};

/**
 * Why an answer is not `complete`. **The set is CLOSED and every member is a hole in the
 * DOCUMENT**, never an error in the engine — an engine error is a throw (§2.1: core throws only
 * on programmer error). A new caveat is a new member here, never a free-text string.
 */
export type AnswerCaveatCode =
  /** A stop states no `durationMins` — §11.7 rule 3. */
  | 'duration_unknown'
  /** A scheduled stop states no `placement.time`. */
  | 'time_unknown'
  /** The day carries no `travelRole: 'journey'` stop — §11.7 rule 4. */
  | 'no_departure_stop'
  /** Records `countryOf` could not place — §11.7 rule 6. */
  | 'unattributed_records'
  /** The rule behind the answer is §8.2 feasibility-gated — §11.4. */
  | 'feasibility_horizon'
  /** The question is well-formed and the document holds nothing for it. */
  | 'no_records';

export type AnswerCaveat = {
  code: AnswerCaveatCode;
  message: string;
  params: Record<string, string | number>;
};

/**
 * **`text` is rendered from `facts` and `params` and from nothing else** (§11.5). There is no
 * template that describes the trip in prose; every rendered clause corresponds to a fact with a
 * cite behind it. That is what makes §2.1's i18n rule hold for free and what makes §11.6's
 * grounding law checkable.
 */
export type Answer = {
  /** What was actually answered — the restatement's subject. */
  question: Question;
  text: string;
  /** §2.1: structured data beside every user-facing string. */
  params: Record<string, string | number>;
  facts: readonly AnswerFact[];
  /** Every record the answer's facts are about. */
  cites: readonly AnswerCite[];
  coverage: AnswerCoverage;
  caveats: readonly AnswerCaveat[];
};

/**
 * §11.9. **`index` is required and there is deliberately no default** — `tripSummary`'s own
 * ruling (§8.4 clause 3's first consequence) verbatim: the only available default is *"answer
 * with no countries"*, an answer that claims to be complete and is not.
 *
 * `today` is **injected**, exactly as it is for `lifecycle`, `travelStats` and `detectConflicts`:
 * no `Date.now()` anywhere in `packages/core` (§2.1). There is no `IdFactory` because `ask` mints
 * no record — it takes a `Trip` and returns a value, and has no write path at all.
 */
export type AskCtx = { trip: Trip; today: IsoDate; index: CountryIndex };

/** What `resolveCite` returns for a cite that resolves. Internal — §11.9. */
export type CiteResolution = { kind: AnswerCite['kind']; id: string; label: string };

/** Re-exported for the per-intent resolvers; `country_count`'s facts are keyed by one. */
export type { CountryCode };
