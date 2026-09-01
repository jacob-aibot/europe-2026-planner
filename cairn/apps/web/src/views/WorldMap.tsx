/**
 * The lifetime map — *"show me everywhere I've been"*. ROADMAP Phase 2 **I-8a** and
 * **I-8d**, ARCHITECTURE §4.4 **A-40**, **A-41** (the atlas frame) and **A-42**.
 *
 * A-40 Part 2 ruled that this is **not a port**: it draws filled paths from strings, which
 * both a web `<svg>` and `react-native-svg` consume unchanged, so there is no platform
 * capability to abstract. It is a plain component over `worldMapFrame`, and the split is
 * absolute — **everything geometric happens in the selector**. What is left here is mapping
 * two arrays onto elements and attaching handlers.
 *
 * Three consequences, all of them binding rather than stylistic:
 *
 *  - **W1: this file reads no layout geometry.** No bounding rect, no offset size, no resize
 *    observer, no window size. Fit is the frame's `viewBox` plus CSS, and the browser applies
 *    it at paint — every paint, including the first one after `display:none` is lifted. That
 *    is why CLAUDE.md's *"a map cannot be fitted while its container is hidden"* bug is
 *    **absent** here rather than re-solved: there is no measurement to take at the wrong
 *    moment. `test/views.test.ts` holds the ceiling as a grep, and A-40 names the trigger to
 *    reopen the ruling — a pixel-measured label, a zoom-to-country animation, a canvas
 *    fallback. Any of those and the bug is back.
 *  - **W2: hit testing is the browser's.** *"Tap a country for its trips"* is a handler on the
 *    `<path>`. A point-in-polygon test over screen coordinates would need a measurement and
 *    would bring W1's bug back through the side door, so it is forbidden.
 *  - **W3 (A-41 Part 5): this file draws panes, it does not compute them.** One `<svg>` per
 *    entry of `frame.panes`, that pane's `viewBox` verbatim, and the countries whose
 *    `paneId` **string-equals** that pane's `id`. How many panes there are, what each frames
 *    and which country is in which were all decided in `worldMapFrame` — in bare Node, from
 *    data alone, never from a measured figure or a media query. Inset placement and size are
 *    CSS. An inset names its codes and its countries carry the identical tap handler the
 *    main pane's do, so *"an outlier stays visibly represented and attributable"* is
 *    structural rather than decorative.
 *  - **A-40 Part 5: filled countries, and no city pins.** `TripSummaryRow` carries no
 *    coordinate for a city, and manufacturing one is a `SUMMARY_VERSION` ruling rather than a
 *    UI decision. The gap is deferred in writing instead of half-built; what could not be
 *    drawn is stated on screen.
 *
 * **A-42 (c): the legend makes no claim about zoom.** It used to print one whenever core
 * reported that it had widened its own box, and on this surface that asserted something the
 * geometry does not support — core's span floor is 1.2 km, itself a rooftop window, and
 * exactly one code in 239 ever reaches it. The flag stays on the frame, because it is core's
 * honest report about core's own box, and nothing here reads it. The guarantee this surface
 * does make is A-42 (b): every pane's frame strictly contains what it draws, on all four
 * sides, which is asserted in bare Node and on the rendered `<svg>`.
 *
 * A-34's `provisional` is rendered as **a different treatment, not a lighter one**: a
 * confirmed country is filled ink, a provisional one is an outline over a faint tint. That
 * is the root `CLAUDE.md` convention — never present a plan as an accomplished fact — on the
 * one surface that summarises a whole travel life.
 */
import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { AppState } from '@cairn/client';
import { travelHistory, worldMapFrame } from '@cairn/client';
import { COUNTRY_INDEX } from '@cairn/core';
import { clock } from '../store.ts';
import { dateRangeLabel } from '../format.ts';
import { LifecycleChip } from './Library.tsx';

type Props = {
  state: AppState;
  /** Opens a trip and hands the shell back to the Trips tab — the existing drill-down. */
  onOpenTrip: (id: string) => void;
  onError: (m: string) => void;
};

export function WorldMap({ state, onOpenTrip, onError }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const today = clock.today();

  // §8.4 A-37 Part 2 / A-31 Part 4, through the one selector that catches it. A stored
  // summary row is not a validated document, `TravelStats` has no `Issue` channel to degrade
  // into, and ROADMAP I-8 says what happens instead of a blank screen or an unhandled
  // rejection: the surface refuses, in words, with the offending row id.
  const history = travelHistory(state, today);
  if (!history.ok) {
    return (
      <main className="worldmap worldmap--refused">
        <h1>Everywhere you have been</h1>
        <div className="banner banner--error" role="alert">
          <div>
            <b>We could not read your travel history.</b>
            <p className="hint">
              {history.rowId
                ? `The stored record for trip ${history.rowId} is not readable.`
                : 'One of the stored trip records is not readable.'}
            </p>
            <p className="hint mono">{history.message}</p>
          </div>
        </div>
      </main>
    );
  }

  const stats = history.stats;
  const frame = worldMapFrame(stats, COUNTRY_INDEX);
  const chosen = frame.countries.find((c) => c.code === selected) ?? null;

  return (
    <main className="worldmap">
      <header className="worldmap__head">
        <p className="eyebrow">Travel history</p>
        <h1>Everywhere you have been</h1>
        <dl className="statrow">
          <div><dt>Countries</dt><dd>{stats.countries.length}</dd></div>
          <div><dt>Trips</dt><dd>{stats.trips.completed + stats.trips.active}</dd></div>
          <div><dt>Days travelled</dt><dd>{stats.daysTravelled}</dd></div>
        </dl>
      </header>

      {frame.countries.length === 0 && frame.missing.length === 0 ? (
        <p className="empty">
          No travelled trip has a country on it yet. Record a past trip, or open one you have
          already taken — the map fills itself from your library.
        </p>
      ) : null}

      <figure className="worldmap__figure">
        {/*
          W3: one <svg> per pane, each with THAT PANE'S `viewBox` verbatim, containing the
          countries whose `paneId` equals the pane's `id` — a string equality filter and
          nothing else. Which pane exists, what it frames and what is in it were all decided
          in `worldMapFrame`, in bare Node, from data alone. Placement and size are CSS
          (`.worldmap__pane--main` / `--inset`), which is what keeps this file free of the
          measurement that would bring the hidden-container bug back.

          The backdrop rect is the whole world in the frame's own coordinate space — a
          constant, not a computation — so the unvisited world is one element per pane rather
          than 250 paths.
        */}
        <div className="worldmap__panes" data-panes={frame.panes.length}>
          {frame.panes.map((pane) => (
            <div
              key={pane.id}
              className={`worldmap__pane worldmap__pane--${pane.role}`}
              data-pane={pane.id}
              data-pane-codes={pane.codes.join(' ')}
            >
              <svg
                className="worldmap__svg"
                viewBox={pane.viewBox}
                /*
                  A-48 Part 6 (QA R36-5): the pane's own aspect ratio, passed straight through
                  as a custom property. The stylesheet sizes the box with it
                  (`aspect-ratio: var(--pane-aspect)`, with a static max-height clamp) so the
                  map fills the box instead of painting 42.6% of it. The ratio is COMPUTED IN
                  THE FRAME — deriving it here would mean parsing `viewBox` and dividing two
                  coordinates, which A-40 Part 2 forbids — and nothing here measures anything,
                  so W1 is intact and A-41 Part 7's "no per-screen-size rule" is untouched: the
                  frame is identical in bare Node.
                */
                style={{ '--pane-aspect': pane.aspect } as CSSProperties}
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label={
                  pane.role === 'main'
                    ? `${pane.codes.length} countries visited`
                    : pane.role === 'detached'
                      ? `Distant parts of ${pane.codes.join(', ')}, shown in a separate frame`
                      : `${pane.codes.join(', ')}, shown in a separate frame`
                }
                data-viewbox={pane.viewBox}
              >
                <rect className="worldmap__sea" x="-180" y="-90" width="360" height="180" />
                {frame.countries
                  .filter((c) => c.paneId === pane.id)
                  .map((c) => (
                    <path
                      key={c.code}
                      className={
                        'worldmap__country' +
                        (c.provisional ? ' worldmap__country--provisional' : '') +
                        (c.code === selected ? ' worldmap__country--on' : '')
                      }
                      d={c.d}
                      vectorEffect="non-scaling-stroke"
                      role="button"
                      tabIndex={0}
                      aria-label={`${c.code}, ${c.tripIds.length} trip${c.tripIds.length === 1 ? '' : 's'}`}
                      data-code={c.code}
                      data-pane={c.paneId}
                      data-provisional={c.provisional ? 'true' : 'false'}
                      onClick={() => setSelected(c.code === selected ? null : c.code)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        e.preventDefault();
                        setSelected(c.code === selected ? null : c.code);
                      }}
                    />
                  ))}
              </svg>
              {/*
                A-41 constraint 3: an outlier stays visibly represented and attributable, so
                the inset NAMES its codes and its countries carry the identical tap handler
                the main pane's do. The caption is written from `pane.codes` and from nothing
                else — `pane.weight` counts trip-attributions rather than trips (A-41 residue
                4), so printing it beside a multi-country pane would read as a trip count it
                is not.
              */}
              {pane.role === 'inset' ? (
                <p className="worldmap__panecap">
                  <span className="worldmap__panecap-label">Shown separately</span>
                  <span className="mono">{pane.codes.join(' ')}</span>
                </p>
              ) : null}
              {/*
                A-49 Part 4 consequence 3: the detached pane may NOT say "shown separately".
                That phrase asserts the country is a distant part of the traveller's record;
                here it is a distant part of the COUNTRY'S OWN GEOMETRY, and the country is
                already drawn on another pane. The caption names the codes and says which.
              */}
              {pane.role === 'detached' ? (
                <p className="worldmap__panecap">
                  <span className="worldmap__panecap-label">Distant parts of</span>
                  <span className="mono">{pane.codes.join(' ')}</span>
                </p>
              ) : null}
            </div>
          ))}
        </div>
        <figcaption className="worldmap__legend">
          <span className="legend__key legend__key--confirmed">Visited</span>
          <span className="legend__key legend__key--provisional">On a trip you are on now</span>
        </figcaption>
      </figure>

      {/*
        The honest holes, stated rather than omitted. A-40 clause 3: a row minted against a
        different index can name a code this one cannot fill, and dropping it silently makes
        the map disagree with the count beside it.
      */}
      <p className="worldmap__gap" data-missing={frame.missing.length}>
        {frame.missing.length > 0 ? (
          <>
            <b>{frame.missing.length}</b>
            {frame.missing.length === 1 ? ' country in your history has ' : ' countries in your history have '}
            no shape in the bundled map and could not be drawn:{' '}
            <span className="mono">{frame.missing.join(', ')}</span>.{' '}
          </>
        ) : null}
        <span data-unattributed={stats.unattributed.stops + stats.unattributed.places}>
          {stats.unattributed.stops + stats.unattributed.places === 0
            ? 'Every located record in your library was attributed to a country.'
            : `${stats.unattributed.stops + stats.unattributed.places} of ` +
              `${stats.located.stops + stats.located.places} located records could not be ` +
              'attributed to a country, and are on no shape above.'}
        </span>
      </p>

      <section className="worldmap__drill">
        <h2>{chosen ? chosen.code : 'Tap a country'}</h2>
        {chosen ? (
          <>
            {chosen.provisional && (
              <p className="hint hint--warn">
                Counted from a trip you are on now — not yet a visit you have completed.
              </p>
            )}
            <ul className="triprows">
              {chosen.tripIds.map((id) => {
                const row = state.library.find((r) => r.id === id);
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
          </>
        ) : (
          /*
            **A-49 Part 5 (QA R37-3), and KD-69 closed.** This list renders `frame.codes` and
            nothing else: every DRAWN code exactly once, in canonical row order, decided in the
            selector. It may not render `frame.countries` — that is a PAINT list, one row per
            (code, pane), so a country with a detached part is in it twice and this list would
            print `FR` twice with two identical React keys; and C9 put it in paint order, which
            is what made the chips read `US DE GB HU AT CZ HR`.

            The view neither sorts nor dedupes. The three re-derivation idioms A-49 Part 5 names
            are asserted **absent from this file, comments included** — that is why they are
            described here rather than quoted — a greppable ceiling of the same kind as W1's.
            `frame.countries` is still the source for the per-code attribution, found by string
            equality and nothing else.
          */
          <ul className="codelist">
            {frame.codes.map((code) => {
              const row = frame.countries.find((c) => c.code === code);
              return (
                <li key={code}>
                  <button
                    className={'codechip' + (row?.provisional ? ' codechip--provisional' : '')}
                    onClick={() => setSelected(code)}
                  >
                    <span className="mono">{code}</span>
                    <span className="codechip__n mono">{row ? row.tripIds.length : 0}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
