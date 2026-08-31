/**
 * `@cairn/tokens` — presentation constants lifted out of the live planner.
 *
 * No logic lives here, and core does not import it: core keeps only the `TravelMode` and
 * `StopCategory` unions, so a colour change can never alter a computation.
 */

export const COLORS: Record<string, string> = {
  sight: '#c9862a',
  food: '#3e7d5c',
  night: '#6b4a9e',
  suggest: '#8b6d1e',
  trip: '#2c5f8a',
  transit: '#5c6570',
  stay: '#a8382f',
};

export const CAT_LABEL: Record<string, string> = {
  sight: 'Sight / Landmark',
  food: 'Food & Drink',
  night: 'Nightlife / View',
  suggest: 'Suggested add',
  trip: 'Day trip',
  transit: 'Transport',
  stay: 'Lodging',
};

export const MODES: Record<string, { icon: string; label: string }> = {
  walk: { icon: '🚶', label: 'Walk' },
  transit: { icon: '🚊', label: 'Tram / metro' },
  metro: { icon: '🚇', label: 'Metro' },
  taxi: { icon: '🚗', label: 'Taxi / drive' },
  bus: { icon: '🚌', label: 'Bus' },
  coach: { icon: '🚐', label: 'Tour coach' },
  boat: { icon: '⛴️', label: 'Boat' },
  speedboat: { icon: '🚤', label: 'Speedboat' },
  flight: { icon: '✈️', label: 'Flight' },
  train: { icon: '🚆', label: 'Train' },
  funicular: { icon: '🚡', label: 'Funicular' },
  bike: { icon: '🚲', label: 'Bike share' },
};

/** Badge styling per `displayStatus`. Nothing un-accepted may render without one. */
export const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  own: { label: '', color: '' },
  suggested: { label: 'suggested', color: '#8b6d1e' },
  candidate: { label: 'from email', color: '#2c5f8a' },
  imported: { label: 'from a friend', color: '#6b4a9e' },
  rejected: { label: 'rejected', color: '#a8382f' },
};

export const SEVERITY_COLOR: Record<string, string> = {
  blocker: '#a8382f',
  // QA R34-7: was `#b3701e` (4.00:1 on white at 11 px, under WCAG 1.4.3). Same value as
  // `--warn` in `apps/web/src/styles.css`, which is where the reasoning lives.
  warning: '#8f5816',
  note: '#5c6570',
};
