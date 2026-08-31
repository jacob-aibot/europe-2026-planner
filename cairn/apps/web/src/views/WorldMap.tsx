/**
 * The lifetime map — *"show me everywhere I've been"*. ROADMAP Phase 2 **I-8a**,
 * ARCHITECTURE §4.4 **A-40**.
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
 *  - **A-40 Part 5: filled countries, and no city pins.** `TripSummaryRow` carries no
 *    coordinate for a city, and manufacturing one is a `SUMMARY_VERSION` ruling rather than a
 *    UI decision. The gap is deferred in writing instead of half-built; what could not be
 *    drawn is stated on screen.
 *
 * A-34's `provisional` is rendered as **a different treatment, not a lighter one**: a
 * confirmed country is filled ink, a provisional one is an outline over a faint tint. That
 * is the root `CLAUDE.md` convention — never present a plan as an accomplished fact — on the
 * one surface that summarises a whole travel life.
 */
import { useState } from 'react';
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
          The `viewBox` is the frame's, verbatim, and it is the ONLY fit mechanism. The
          backdrop rect is the whole world in the frame's own coordinate space — a constant,
          not a computation — so the unvisited world is one element rather than 250 paths.
        */}
        <svg
          className="worldmap__svg"
          viewBox={frame.viewBox}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${frame.countries.length} countries visited`}
          data-viewbox={frame.viewBox}
        >
          <rect className="worldmap__sea" x="-180" y="-90" width="360" height="180" />
          {frame.countries.map((c) => (
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
        <figcaption className="worldmap__legend">
          <span className="legend__key legend__key--confirmed">Visited</span>
          <span className="legend__key legend__key--provisional">On a trip you are on now</span>
          {frame.bounds.clamped && (
            <span className="legend__note">Zoomed out to a readable minimum</span>
          )}
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
          <ul className="codelist">
            {frame.countries.map((c) => (
              <li key={c.code}>
                <button
                  className={'codechip' + (c.provisional ? ' codechip--provisional' : '')}
                  onClick={() => setSelected(c.code)}
                >
                  <span className="mono">{c.code}</span>
                  <span className="codechip__n mono">{c.tripIds.length}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
