import type { Trip } from '@cairn/core';
import { dateRangeLabel } from '../format.ts';

/** Destination imagery belongs to the explicitly labelled example, never to personal history. */
export function ExampleJourney({ trip, onLoad }: { trip: Trip; onLoad: () => void }) {
  return <article className="example-journey" aria-label="Europe 2026 example preview">
    <button className="example-journey__cover" onClick={onLoad} aria-label="Explore Europe 2026" aria-describedby="example-disclosure">
      <img src="/images/dubrovnik.jpg" width="1280" height="637" alt="Sunlit stone walls and terracotta rooftops above the Adriatic in Dubrovnik" />
      <span className="example-journey__badge">Example journey</span>
      <span className="example-journey__caption"><strong>{trip.title}</strong><span>{dateRangeLabel(trip)}</span></span>
      <svg className="example-journey__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
    </button>
    <dl className="example-journey__facts"><div><dd>{trip.cities.length}</dd><dt>cities</dt></div><div><dd>{trip.days.length}</dd><dt>days</dt></div><div><dd>Europe</dd><dt>example journey</dt></div></dl>
    <div className="example-journey__copy"><p className="example-journey__cities">{trip.cities.map((city) => city.name).join(' · ')}</p>
      <p id="example-disclosure" className="local-note">Adds a removable example trip to this device.</p>
      <details className="photo-credit"><summary>About this photo</summary><p>Dubrovnik by <a href="https://commons.wikimedia.org/wiki/File:Panoramic_view_of_the_old_city_of_Dubrovnik_-_September_2017.jpg" target="_blank" rel="noreferrer">Martin Falbisoner</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. Displayed cropped.</p></details>
    </div>
  </article>;
}
