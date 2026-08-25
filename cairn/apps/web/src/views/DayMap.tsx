/**
 * The day map.
 *
 * Two things this component deliberately does NOT do: compute bounds, and decide which
 * cluster to open on. Both come from core through `dayMapPoints` (§4.4). The "whole day's
 * journey" toggle is the same affordance the live planner has, for the days that span two
 * cities.
 */
import { useEffect, useRef, useState } from 'react';
import type { DerivedCache } from '@cairn/client';
import { dayMapPoints } from '@cairn/client';
import type { Day, Trip } from '@cairn/core';
import type { MapHandle } from '@cairn/client';
import { leafletMap } from '../ports/map.ts';
import { store } from '../store.ts';

const port = leafletMap();

type Props = { trip: Trip; day: Day; derived: DerivedCache | null; scope: 'focus' | 'all' };

export function DayMap({ trip, day, derived, scope }: Props) {
  const el = useRef<HTMLDivElement | null>(null);
  const handle = useRef<MapHandle | null>(null);
  const [mounted, setMounted] = useState(false);

  const { points, bounds } = dayMapPoints(trip, day, scope, derived);
  const dd = derived?.days[day.id];
  const split = dd?.focus.split ?? false;

  useEffect(() => {
    if (!el.current) return;
    handle.current = port.mount(el.current, points, bounds);
    setMounted(true);
    return () => {
      if (handle.current) port.destroy(handle.current);
      handle.current = null;
      setMounted(false);
    };
    // Mount once per component instance; content updates go through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted || !handle.current) return;
    port.update(handle.current, points, bounds);
    // Re-run when the day, the scope or the underlying revision changes.
  }, [mounted, day.id, scope, derived?.revision, points.length, bounds.north, bounds.south, bounds.east, bounds.west]);

  // The tab that owns this map became visible again — §4.4's contract.
  useEffect(() => {
    if (mounted && handle.current) port.setVisible(handle.current, true);
  }, [mounted]);

  return (
    <div className="daymap">
      <div className="daymap__canvas" ref={el} role="application" aria-label={`Map of ${day.title || day.date}`} />
      <div className="daymap__bar">
        <span className="daymap__count">
          {points.length} {points.length === 1 ? 'stop' : 'stops'} shown
          {bounds.clamped && ' · zoomed out to a readable minimum'}
        </span>
        {split && (
          <button
            className="btn btn--quiet"
            onClick={() => store.setUi({ mapScope: scope === 'focus' ? 'all' : 'focus' })}
          >
            {scope === 'focus' ? "Whole day's journey" : 'Back to where the day is spent'}
          </button>
        )}
      </div>
    </div>
  );
}
