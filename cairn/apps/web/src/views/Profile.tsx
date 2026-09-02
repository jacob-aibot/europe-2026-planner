/**
 * **Profile — a travel identity.** ROADMAP Phase 2 **I-8b**, built to `docs/DESIGN.md` §5,
 * which `ARCHITECTURE.md` §9.1 makes binding: where this file and that document disagree, that
 * document is the spec and this file is the defect.
 *
 * §5.2: the screen is not *"your stats"*. It is **a person's travel life, stated in their own
 * numbers, with the holes admitted** — one editorial page in four movements:
 *
 *   1. **The claim** — the identity line, the largest type on the screen. `.statrow`'s three
 *      boxes are **replaced by one typographic statement** (§5.3), which is the P1/P4 proof:
 *      *"a number appears because it is part of a person's travel identity, never because a
 *      metric needed a home."*
 *   2. **The record** — one hairline-separated row per country, the ISO code in mono at h2
 *      scale as the leading element, its cities grouped **under** it as text. **No card, no
 *      border box, no chevron.**
 *   3. **Its shape over time** — first and last visit across the whole record, and the trip
 *      lifecycle counts with `completed` **first and at full strength** (P3: *"the past is
 *      alive, not archived"* — a finished trip is this product's most valuable content).
 *   4. **What we do not know** — the unattributed count against its denominator,
 *      `unnamedCities`, and the I-6 rescan state, in the shipped `.worldmap__gap` idiom.
 *      §5.2: *"Movement 4 is not a footnote and not an error state. On this product it is a
 *      feature, and it is the single strongest anti-generic move available on this screen: no
 *      dashboard admits its own denominator."*
 *
 * **The data is `DESIGN.md` §5.1's list and nothing else** — `travelStats` through the
 * `travelHistory` gate, `state.library` for trip titles and dates, and `summaryScan` for the
 * rescan indicator. §0 rule B is the fence: *"a screen that looks thin because the product is
 * young is honest; a screen that looks rich because it invented content is a lie."* So there is
 * no photography here, no achievement shelf, no goal, no participant, no avatar, no distance,
 * and no map — `TripSummaryRow` carries no city coordinate (A-40 Part 5) and the map that does
 * exist is the Map tab's, which this screen does not duplicate.
 *
 * **Three things this file deliberately does not do:**
 *
 *  - **It computes no statistic.** Every number below is read off `TravelStats`. A count
 *    assembled here would be the stored-count failure of §8.4 clause 2 one layer up — and
 *    `state.library.length` is not the number of trips this record is made of, because a
 *    `planned` trip contributes nothing to it.
 *  - **It reads no clock but the port's** (`clock.today()`), and it never compares a date to
 *    today: the lifecycle comes from `LifecycleChip` → `rowLifecycle` → `core.lifecycle`, which
 *    is §8.4 **A-44**'s one gate, and `test/views.test.ts` holds both as greps.
 *  - **It measures no layout.** The two-column split at ≥ 900 and the two-column record at
 *    ≥ 1280 are CSS (§5.4); nothing here reads a rect, and the same DOM renders at every width.
 */
import { useState } from 'react';
import type { AppState } from '@cairn/client';
import { summaryScan, travelHistory } from '@cairn/client';
import type { TravelStats } from '@cairn/core';
import { clock } from '../store.ts';
import { dateRangeLabel, monthYearLabel } from '../format.ts';
import { LifecycleChip } from './Library.tsx';
import { HistoryRefusal } from './Refusal.tsx';

type Props = {
  state: AppState;
  /** Opens a trip and hands the shell back to the Trips tab — the same drill-down as the map. */
  onOpenTrip: (id: string) => void;
  onError: (m: string) => void;
};

export function Profile({ state, onOpenTrip, onError }: Props) {
  /** Which country row is expanded, or `null`. One at a time: the row IS the accordion (§5.5). */
  const [open, setOpen] = useState<string | null>(null);
  const today = clock.today();

  // §8.4 A-37 Part 2 / A-31 Part 4, through the one selector that catches it — the same read
  // boundary the world map renders behind, and ROADMAP I-8's own criterion on this surface.
  // A stored summary row is not a validated document and `TravelStats` has no `Issue` channel
  // to degrade into, so the honest answer is a refusal with the offending row id, in the same
  // words the other surface uses (`Refusal.tsx` says why it is a component).
  const history = travelHistory(state, today);
  if (!history.ok) {
    // QA **R41-9**: one surface, one header. The refusal used to print `Travel record` as an
    // eyebrow and `Your travel record` as an `h1` immediately under it — the same two words
    // twice — and the `h1` fell through to the global 25 px display rule while the healthy
    // path's is an 11 px tracked mono micro-label. The screen a user only sees when something
    // is wrong is the last one that should change type register. Same `h1`, same class, no
    // eyebrow — which is also what the world map's refusal does (§5.5).
    return (
      <main className="profile profile--refused">
        <h1 className="profile__kicker">Your travel record</h1>
        <HistoryRefusal refusal={history} />
      </main>
    );
  }

  const stats = history.stats;
  // §8.4 clause 3 at the view layer: the record says *"recomputing"* while a rescan runs, and
  // never claims a completeness it has not got. Derived from the rows, never remembered.
  const scan = summaryScan(state);
  const travelled = stats.trips.completed + stats.trips.active;

  return (
    <main className="profile" data-testid="profile" data-scan={scan.phase}>
      <Claim stats={stats} travelled={travelled} />

      <div className="profile__body">
        <div className="profile__record">
          <h2 className="profile__secthead" id="profile-countries">
            {stats.countries.length === 1 ? 'The country' : 'The countries'}
          </h2>

          {stats.countries.length === 0 ? (
            /*
              §5.5's empty state, and §0 rule B's shape for it: the claim above already printed
              **zeroes, not placeholders**, and this is the one sentence naming the two ways to
              fill it — the same wording register as the world map's own empty state. No
              illustration, no ghost row, no "coming soon".
            */
            <p className="empty" data-testid="profile-empty">
              No travelled trip has a country on it yet. Record a past trip, or open one you have
              already taken — this record fills itself from your library.
            </p>
          ) : (
            /*
              **QA R41-8 — the two-column record is a GRID OF TWO LISTS, not `columns: 2`.**
              §5.4 permits either (*"`columns: 2` on the list, or a two-column grid — either is
              acceptable"*) and only one of them is honest: CSS multi-column re-flows the WHOLE
              list on any height change, so expanding `AT` moved an unrelated country ~314 px
              across the gutter (measured at 5, 9, 13 and 21 countries, at 1280 and 1600). P6's
              last clause — *"nothing changes layout of other content unless it is the thing the
              user just opened"* — is what that breaks.

              Two lists, split by count and not by width, fix it by construction: each column is
              its own formatting context, so a row that grows grows its own column and no other
              row moves. Reading order and tab order stay down-then-across because that is DOM
              order. **The split is the same at every width** — at base and split the second
              list simply follows the first in one column, which is visually indistinguishable
              from one list (the closing hairline lives on `.crcols`, so it is not doubled).
            */
            <div className="crcols">
              {recordColumns(stats.countries).map((group, gi) => (
                <ul
                  key={group[0].code}
                  className="crlist"
                  {...(gi === 0
                    ? { 'aria-labelledby': 'profile-countries' }
                    : { 'aria-label': 'The countries, continued' })}
                >
                  {group.map((c) => (
                    <CountryRow
                      key={c.code}
                      country={c}
                      cities={stats.cities.filter((city) => city.countryCode === c.code)}
                      isOpen={open === c.code}
                      onToggle={() => setOpen(open === c.code ? null : c.code)}
                      library={state.library}
                      today={today}
                      onOpenTrip={onOpenTrip}
                      onError={onError}
                    />
                  ))}
                </ul>
              ))}
            </div>
          )}
        </div>

        {/*
          §5.4: at **split** the metadata about the record sits **beside** the record instead of
          after it — the trip lifecycle counts, the "what we do not know" block and the rescan
          indicator. At base it is simply the rest of the column. Same DOM either way.
        */}
        <aside className="profile__meta">
          <Shape stats={stats} />
          <Gap stats={stats} scan={scan} />
        </aside>
      </div>
    </main>
  );
}

type Country = TravelStats['countries'][number];
type City = TravelStats['cities'][number];

/**
 * The record's column groups — **arithmetic on the data, never a measurement of the layout.**
 *
 * QA **R41-8**. One list becomes two so that the ≥ 1280 two-column form can be a grid of two
 * independent lists instead of `columns: 2`, which rebalances every row whenever one row's
 * height changes. The split is by count and is the same at every viewport width, so this file
 * keeps its own rule (*"it measures no layout … the same DOM renders at every width"*): the
 * BREAKPOINT is still CSS's, and only the mechanism it drives has changed.
 *
 * The first column is the longer one when the count is odd, which is what keeps reading order
 * down-then-across natural. A single country yields a single group, so a small record is one
 * `<ul>` and not one `<ul>` plus an empty one. Pure.
 */
function recordColumns<T>(rows: readonly T[]): T[][] {
  if (rows.length < 2) return [rows.slice()];
  const half = Math.ceil(rows.length / 2);
  return [rows.slice(0, half), rows.slice(half)];
}

/**
 * One country: the ISO code in its marginal column, the facts line, the run of cities, and the
 * inline trip expansion. Extracted from `Profile` when the record became two lists (R41-8) —
 * the markup is unchanged from the single-list form except where a finding names it.
 */
function CountryRow({
  country: c, cities, isOpen, onToggle, library, today, onOpenTrip, onError,
}: {
  country: Country;
  cities: readonly City[];
  isOpen: boolean;
  onToggle: () => void;
  library: AppState['library'];
  today: string;
  onOpenTrip: (id: string) => void;
  onError: (m: string) => void;
}) {
  const span =
    monthYearLabel(c.firstVisit) === monthYearLabel(c.lastVisit)
      ? monthYearLabel(c.firstVisit)
      : `${monthYearLabel(c.firstVisit)} – ${monthYearLabel(c.lastVisit)}`;
  return (
    <li
      className={'crow' + (c.provisional ? ' crow--provisional' : '') + (isOpen ? ' crow--open' : '')}
      data-code={c.code}
      data-provisional={c.provisional ? 'true' : 'false'}
    >
      {/*
        §5.5: tapping a country row **selects it and reveals its trips inline**. It does not
        navigate away and it does not open a modal — which is also why A-55's standing shadcn
        revisit trigger is not hit by this increment. The row is the accordion; `aria-expanded`
        is the state a screen reader reads, and the same Enter/Space that activates any
        `<button>` drives it, so there is no keyboard path to add.
      */}
      <button
        className="crow__head"
        type="button"
        aria-expanded={isOpen}
        aria-controls={`crow-trips-${c.code}`}
        onClick={onToggle}
      >
        {/*
          **The spaces between these three children are load-bearing** (QA R41-7). A row's
          accessible name is its text content with the `aria-hidden` subtrees removed, and the
          `·` separator used to be the ONLY whitespace between the visit year and the trip
          count — so hiding it, correctly, fused them: `AT Aug 20191 trip Vienna`, a five-digit
          year read aloud. Every separator on this row is now a real text node OUTSIDE the
          hidden span. They generate no boxes (whitespace-only text between grid items is not a
          grid item), so nothing moves on screen.
        */}
        <span className="crow__code mono">{c.code}</span>{' '}
        <span className="crow__facts mono">
          <span className="crow__span">{span}</span>{' '}
          {/*
            QA **R41-6**: the count and the word it counts are ONE unbreakable run. At 1280 the
            record is two ~214 px columns and a two-month span pushed the line over, breaking
            `1` / `trip` across two lines — the same defect class as the trip row's date range
            one element over. The separator rides inside the run rather than before it, so a
            wrap never leaves a `·` dangling at the end of a finished line either.
          */}
          <span className="crow__count">
            <span className="crow__dot" aria-hidden="true">·</span> {c.tripIds.length}{' '}
            {c.tripIds.length === 1 ? 'trip' : 'trips'}
          </span>{' '}
        </span>
        {/*
          §5.3 / P3 / P5: cities are **text**, grouped under their country rather than listed
          separately — a run of names on one wrapped line. This is where cities cost nothing and
          read as content (A-40 Part 5 is why they are text and not pins: the row carries no
          coordinate). A city name is FREE TEXT off an imported row, so the wrapping of this
          element is a layout invariant and not a nicety — see `.crow__cities` in the
          stylesheet, and QA R41-3 for what one unbreakable 58-character name did without it.
        */}
        <span className="crow__cities">
          {cities.length === 0
            ? <span className="crow__nocity">no named city recorded</span>
            : cities.map((city) => city.name).join(' · ')}
        </span>
        {/*
          A-34's provisional treatment, on the profile: a **mark**, outlined and dashed, plus a
          dashed rule down the row — never the confirmed ink at lower strength (P5 channel 3).
          The root CLAUDE.md convention on the one surface that summarises a whole travel life:
          a trip you are on is not yet a visit you have completed, and a traveller standing in
          Vienna is not told they have never been.
        */}
        {c.provisional && (
          <span className="pill crow__prov" data-testid="profile-provisional">
            On a trip you are on now
          </span>
        )}
      </button>

      <div className="crow__trips" id={`crow-trips-${c.code}`}>
        <div className="crow__clip">
          <ul className="triprows crow__triplist">
            {c.tripIds.map((id) => {
              const row = library.find((r) => r.id === id);
              if (!row) {
                return (
                  <li key={id} className="triprow triprow--gone">
                    <span className="mono">{id}</span>
                    <span className="hint">no longer in your library</span>
                  </li>
                );
              }
              return (
                <li key={id} className="triprow">
                  <button
                    className="triprow__open"
                    type="button"
                    tabIndex={isOpen ? 0 : -1}
                    onClick={() => {
                      try {
                        onOpenTrip(row.id);
                      } catch (e) {
                        onError((e as Error).message);
                      }
                    }}
                  >
                    <span className="triprow__title">{row.title}</span>
                    <span className="triprow__meta mono">{dateRangeLabel(row)}</span>
                  </button>
                  <LifecycleChip trip={row} today={today} />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </li>
  );
}

/**
 * **Movement 1 — the claim.** §5.3: *"This replaces `.statrow`'s three boxes with one
 * typographic statement."*
 *
 * It is a `<dl>` because §3.5 requires it: *"every statistic that reads as a pair is marked up
 * as a pair — a screen reader must get 'Countries, 7', not '7'."* The **visual** order is the
 * number first, which is a one-property CSS reordering of the value inside each pair; the
 * accessibility tree keeps label-then-value, which is the order that reads as a sentence.
 *
 * The separator is `aria-hidden` and lives inside the pair, because `<dl>`'s content model
 * admits only `dt`, `dd`, `div`, `script` and `template` as children.
 */
function Claim({ stats, travelled }: { stats: TravelStats; travelled: number }) {
  const first = stats.countries.reduce<string | null>(
    (a, c) => (a === null || c.firstVisit < a ? c.firstVisit : a),
    null,
  );
  const last = stats.countries.reduce<string | null>(
    (a, c) => (a === null || c.lastVisit > a ? c.lastVisit : a),
    null,
  );
  /*
    QA **R41-4**: the largest type on the screen has to agree in number. It printed
    `1 COUNTRIES · 1 CITIES · 1 DAYS TRAVELLED` — reached by the most ordinary first-run state
    there is, one recorded past trip — on a surface that pluralises *"The country"*, *"1 trip"*
    and *"1 city is"* correctly three lines below it. The `dd` is moved in front of the `dt` by
    CSS, so the READER sees `1 Country` while the accessibility tree keeps `Country, 1`, which
    is the order that reads as a sentence either way.
  */
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const pairs: Array<[string, number]> = [
    [plural(stats.countries.length, 'Country', 'Countries'), stats.countries.length],
    [plural(stats.cities.length, 'City', 'Cities'), stats.cities.length],
    [plural(stats.daysTravelled, 'Day travelled', 'Days travelled'), stats.daysTravelled],
  ];
  return (
    <header className="profile__claim">
      <h1 className="profile__kicker">Your travel record</h1>
      <dl className="claim" data-testid="profile-claim">
        {/*
          QA **R41-5**: the separator belongs to the pair that FOLLOWS it, never to the pair it
          follows. Inside the preceding pair it stayed on the finished line when the claim
          wrapped — `5 COUNTRIES · 7 CITIES ·` / `30 DAYS TRAVELLED` — which at 30–58 px is the
          most visible piece of typographic slack on the screen. It is 2 danglers at 320 px.
          `.claim__sep` carries `order: -2` so it still renders before the value the CSS pulls
          forward; the accessibility tree never sees it at all.
        */}
        {pairs.map(([label, value], i) => (
          <div className="claim__pair" key={label}>
            {i > 0 && <span className="claim__sep" aria-hidden="true">·</span>}
            <dt>{label}</dt>
            <dd className="mono">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="claim__span" data-testid="profile-span">
        {travelled === 0
          ? 'No trip you have travelled is in this record yet.'
          : `Across ${travelled} ${travelled === 1 ? 'trip' : 'trips'}` +
            (first && last
              ? // The comparison is between the LABELS, not the dates: two visits a fortnight
                // apart in one August are *"in Aug 2026"*, and `from Aug 2026 to Aug 2026` states
                // a span the reader cannot see. `monthYearLabel` is the resolution this line
                // prints at, so it is also the resolution the branch has to be decided at.
                monthYearLabel(first) === monthYearLabel(last)
                ? `, in ${monthYearLabel(first)}.`
                : `, from ${monthYearLabel(first)} to ${monthYearLabel(last)}.`
              : '.')}
      </p>
    </header>
  );
}

/**
 * **Movement 3 — the shape of it over time.**
 *
 * `completed` is **first and at full strength**, which is `DESIGN.md` **P3** stated as markup
 * rather than as a comment: *"a completed trip is not greyed out, not collapsed into a footer,
 * not 'history' … `completed` is a dashed outline, never lower contrast, never lower ink."* The
 * rendered assertion is in `qa/i8b-render.mjs` — the computed contrast of the `completed` chip
 * is **≥** that of `planned`, in both colour schemes — and ROADMAP I-8b names the fault that
 * makes it red.
 *
 * A stage with a count of zero is still printed. Its absence would be the more interesting
 * fact silently removed: *"no upcoming trips"* is a true statement about a travel life.
 */
function Shape({ stats }: { stats: TravelStats }) {
  const stages: Array<{ stage: 'completed' | 'active' | 'planned'; label: string; n: number }> = [
    { stage: 'completed', label: 'Travelled', n: stats.trips.completed },
    { stage: 'active', label: 'On now', n: stats.trips.active },
    { stage: 'planned', label: 'Upcoming', n: stats.trips.planned },
  ];
  return (
    <section className="profile__shape">
      <h2 className="profile__secthead">Trips</h2>
      <dl className="lifecycle" data-testid="profile-lifecycle">
        {stages.map((s) => (
          <div
            key={s.stage}
            className={`chip chip--life chip--life-${s.stage} lifecycle__row`}
            data-stage={s.stage}
          >
            <dt>{s.label}</dt>
            <dd className="mono">{s.n}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * **Movement 4 — what we do not know**, in the shipped `.worldmap__gap` idiom (a 2 px rule down
 * the left, prose beside it) rather than a reinvented one.
 *
 * §5.3 requires three distinguishable things, and I-8b's own verification line requires the
 * first two to be told apart: **"no places yet"** when the denominator is zero — nothing in the
 * library carries a coordinate, so there is nothing we *could* have attributed — versus
 * **"everything attributed"** when the hole is zero. Collapsing those two into one sentence is
 * the defect: the first is a statement about how young the library is and the second is a
 * statement about how good the attribution is, and a reader who cannot tell them apart learns
 * nothing from either.
 */
function Gap({ stats, scan }: { stats: TravelStats; scan: ReturnType<typeof summaryScan> }) {
  const located = stats.located.places + stats.located.stops;
  const holes = stats.unattributed.places + stats.unattributed.stops;
  const unplacedCities = stats.cities.filter((c) => c.countryCode === null);
  return (
    <section className="profile__gap" data-testid="profile-gap">
      <h2 className="profile__secthead">What we do not know</h2>
      <p data-testid="profile-attribution" data-located={located} data-unattributed={holes}>
        {located === 0 ? (
          <>
            <b>No places yet.</b> Nothing in your library carries a coordinate, so there is
            nothing here we could have put on a country.
          </>
        ) : holes === 0 ? (
          <>
            <b>Everything attributed.</b> All {located} located records in your library were
            matched to a country.
          </>
        ) : (
          <>
            <b>{holes}</b> of {located} located records could not be matched to a country, so
            they are counted in nothing above.
          </>
        )}
      </p>
      {stats.unnamedCities > 0 && (
        <p data-testid="profile-unnamed">
          <b>{stats.unnamedCities}</b>{' '}
          {stats.unnamedCities === 1 ? 'city is recorded' : 'cities are recorded'} without a name
          we can read, and {stats.unnamedCities === 1 ? 'is' : 'are'} counted but not listed.
        </p>
      )}
      {unplacedCities.length > 0 && (
        <p data-testid="profile-unplaced-cities">
          <b>{unplacedCities.length}</b>{' '}
          {unplacedCities.length === 1 ? 'city is' : 'cities are'} on no country above:{' '}
          <span className="profile__citylist">{unplacedCities.map((c) => c.name).join(' · ')}</span>.
        </p>
      )}
      {scan.phase !== 'complete' && (
        <p data-testid="profile-scan" data-phase={scan.phase}>
          {scan.phase === 'recomputing'
            ? `Recomputing… ${scan.current} of ${scan.total} trips up to date, so these numbers may still move.`
            : `${scan.outdated.length} ${scan.outdated.length === 1 ? 'trip is' : 'trips are'} not up to date yet, so these numbers may be short.`}
          {scan.unreadable.length > 0 &&
            ` ${scan.unreadable.length === 1 ? 'One trip’s file' : `${scan.unreadable.length} trips’ files`} could not be read.`}
        </p>
      )}
    </section>
  );
}
