/** World-first visual slice. Real local history; no alternate domain or persistence model. */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppState } from '@cairn/client';
import { rowDatesReadable, rowLifecycle, rowStatsReadable, rowUnopenable, summaryScan, travelHistory } from '@cairn/client';
import { COUNTRY_INDEX } from '@cairn/core';
import { clock } from '../store.ts';
import { dateRangeLabel, monthYearLabel } from '../format.ts';
import { Globe, countryName } from './Globe.tsx';
import type { CountryState } from './Globe.tsx';
import { WorldMap } from './WorldMap.tsx';
import { HistoryRefusal } from './Refusal.tsx';
import { ProfileSetup } from './ProfileSetup.tsx';
import type { LocalIdentityV1 } from '../localIdentity.ts';
import { CroatiaPreview, DestinationCredits } from './CroatiaPreview.tsx';

type Props = {
  state: AppState;
  onOpenTrip: (id: string) => void;
  onOpenLibrary: () => void;
  onError: (message: string) => void;
  identity: LocalIdentityV1;
  onSaveIdentity: (identity: LocalIdentityV1) => boolean;
  onStartLibrary: (kind: 'new' | 'past' | 'sample', cityQuery?: string) => void;
  reveal?: { id: number; countryCode: string | null } | null;
};
const drawnCodes = new Set(COUNTRY_INDEX.countries.map((c) => c.code));
const Chevron = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>;

export function World({ state, onOpenTrip, onOpenLibrary, onError, identity, onSaveIdentity, onStartLibrary, reveal }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [atlas, setAtlas] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [exploreCity, setExploreCity] = useState('Dubrovnik');
  const exploreButton=useRef<HTMLButtonElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const previousCountry = useRef<string | null>(null);
  useEffect(() => { if (reveal) { setExploring(false); setAtlas(false); setSelected(reveal.countryCode); } }, [reveal?.id]);
  const today = clock.today();
  const history = useMemo(() => travelHistory(state, today), [state.library, today]);
  const scan = summaryScan(state);
  const upcoming = useMemo(() => state.library.filter((row) =>
    rowDatesReadable(row) && rowStatsReadable(row) && rowLifecycle(row, today) === 'planned').sort((a, b) => a.startDate.localeCompare(b.startDate)), [state.library, today]);
  const countries = useMemo(() => {
    const result = new Map<string, CountryState>();
    for (const row of upcoming) for (const code of row.countryCodes ?? []) result.set(code, 'upcoming');
    if (history.ok) for (const row of history.stats.countries) result.set(row.code, row.provisional ? 'current' : 'visited');
    return result;
  }, [history, upcoming]);
  useEffect(() => {
    if (selected) detailHeading.current?.focus({ preventScroll: true });
    else if (previousCountry.current) document.getElementById(`world-country-${previousCountry.current}`)?.focus({ preventScroll: true });
    previousCountry.current = selected;
  }, [selected]);

  if (exploring) return <CroatiaPreview initialCity={exploreCity} onBack={()=>{setExploring(false);requestAnimationFrame(()=>{exploreButton.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});});}} onStart={onStartLibrary} />;
  if (atlas) return <div className="world-atlas">
    <button className="world-text-button" onClick={() => setAtlas(false)}>← Back to globe</button>
    <WorldMap state={state} onOpenTrip={onOpenTrip} onError={onError}/>
  </div>;
  if (!history.ok) return <main className="world world--refused"><h1>Your world</h1>
    <HistoryRefusal refusal={history}/><button className="world-primary" onClick={onOpenLibrary}>Open your trips</button></main>;

  const stats = history.stats;
  const country = stats.countries.find((row) => row.code === selected);
  const countryTrips = selected ? state.library.filter((row) => country?.tripIds.includes(row.id)
    || upcoming.some((future) => future.id === row.id && future.countryCodes?.includes(selected))) : [];
  const recent = [...state.library].filter((row) => rowDatesReadable(row) && rowLifecycle(row, today) !== 'planned')
    .sort((a, b) => b.endDate.localeCompare(a.endDate)).slice(0, 3);
  const missing = [...countries.keys()].filter((code) => !drawnCodes.has(code));
  const hasGaps = (stats.unattributed.stops + stats.unattributed.places + stats.unattributed.cities) > 0 || stats.absorbed.length > 0 || missing.length > 0;

  function tripRow(row: AppState['library'][number]) {
    const status = rowLifecycle(row, today);
    const unreadable = rowUnopenable(state, row);
    return <li key={row.id}><button className="world-trip" onClick={() => onOpenTrip(row.id)}>
      <span className="world-trip__mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="m8 12 11-4 10 4 11-4v28l-11 4-10-4-11 4zM19 8v28m10-24v28"/><path d="m14 24 8-5 10 6"/></svg></span>
      <span className="world-trip__copy"><strong>{row.title}</strong><span>{dateRangeLabel(row)}</span>
        <span className={`world-trip__status world-trip__status--${status}`}>
          {unreadable ? 'Could not read this trip · open Trips to recover' : status === 'completed' ? 'Completed' : status === 'active' ? 'Current trip' : 'Upcoming'}
        </span></span><Chevron/>
    </button></li>;
  }

  return <main className={`world${state.library.length === 0 ? ' world--first-run' : ''}`} data-testid="world" data-scan={scan.phase}>
    <section className="world__sky" aria-label="Your travel globe">
      <Globe countries={countries} selected={selected} onSelect={setSelected} onExplore={()=>setExploring(true)}/>
      {state.library.length > 0 && <p className="world__promise">A more meaningful world.<br/>A little more yours.</p>}
    </section>
    <section className="world__history" aria-label="Travel history">
      {selected ? <div className="world-country" data-testid="country-history">
        <div className="world-country__top"><button className="world-text-button" onClick={() => setSelected(null)}>← Your world</button>
          <span className={`world-status world-status--${countries.get(selected)}`}>{countries.get(selected) === 'visited' ? 'Visited' : countries.get(selected) === 'current' ? 'Current trip' : 'Upcoming'}</span></div>
        <h1 ref={detailHeading} tabIndex={-1}>{countryName(selected)}</h1>
        {country && !country.provisional ? <p className="world-country__dates">{monthYearLabel(country.firstVisit)}{monthYearLabel(country.firstVisit) !== monthYearLabel(country.lastVisit) ? ` — ${monthYearLabel(country.lastVisit)}` : ''}</p> : <p className="world-country__dates">{country?.provisional ? 'Part of a current trip; not yet a completed visit.' : 'On your itinerary. Not counted as visited.'}</p>}
        {stats.cities.some((city) => city.countryCode === selected) && <p className="world-country__cities">{stats.cities.filter((city) => city.countryCode === selected).map((city) => city.name).join(' · ')}</p>}
        <h2>Trips to {countryName(selected)}</h2>
        <ul className="world-trips">{countryTrips.map(tripRow)}</ul>
        {!countryTrips.length && <p>No matching trips are available in this library.</p>}
      </div> : state.library.length === 0 ? <div className="first-run" data-testid="world-first-run">
        {settingUp ? <ProfileSetup headingLevel="h1" identity={identity} onSave={(next) => { const saved = onSaveIdentity(next); if (saved) setSettingUp(false); return saved; }} onCancel={() => setSettingUp(false)} /> : <>
          
          <h1>{identity.displayName ? `Where next, ${identity.displayName.split(' ')[0]}?` : identity.welcomeDismissed ? 'A world of possibilities.' : 'Make this world yours.'}</h1>
          <p className="first-run__lede">{identity.welcomeDismissed ? 'A place you remember. Somewhere you dream of going.' : 'Start with a place you love.'}</p>
          <div className="first-run__actions">
            {!identity.welcomeDismissed && <button className="journey-action journey-action--primary" onClick={() => setSettingUp(true)}><span><strong>Set up my profile</strong></span><Chevron /></button>}
            <button className="journey-action" onClick={() => onStartLibrary('past')}><span><strong>Add somewhere I’ve been</strong><small>Give a memory its place on your globe.</small></span><Chevron /></button>
            <button className="journey-action" onClick={() => onStartLibrary('new')}><span><strong>Plan a trip</strong><small>Start with dates and a destination.</small></span><Chevron /></button>
          </div>
          <div className="first-run__secondary"><button className="world-text-button" onClick={() => onStartLibrary('sample')}>Explore Europe 2026</button>{!identity.welcomeDismissed && <button className="world-text-button" onClick={() => onSaveIdentity({ ...identity, welcomeDismissed: true })}>Skip for now</button>}</div>
          <p className="local-note">Explore Europe 2026 adds a removable example trip to this device.</p>
        </>}
      </div> : stats.trips.completed + stats.trips.active === 0 && upcoming.length > 0 ? <div className="world-upcoming" data-testid="world-upcoming-only">
        <h1>{upcoming[0].title}</h1><p>{dateRangeLabel(upcoming[0])}</p>
        <ul className="world-trips">{upcoming.slice(0, 2).map(tripRow)}</ul>
        {countries.size > 0 && <section className="world-countries" aria-label="Upcoming countries"><h2>Places ahead</h2><ul>{[...countries.keys()].map((code) => <li key={code}><button id={`world-country-${code}`} onClick={() => setSelected(code)}><span className="world-country-code" aria-hidden="true">{code}</span><span>{countryName(code)}<small>Upcoming</small></span><Chevron /></button></li>)}</ul></section>}
        <p className="world-upcoming__note">Your travel history will begin as journeys become part of your story.</p>
        <button className="world-primary" onClick={() => onStartLibrary('past')}>Add somewhere I’ve been <span aria-hidden="true">→</span></button>
      </div> : <>
        <div className="world-progress"><h1><strong>{stats.countries.length}</strong><span>{stats.countries.length === 1 ? 'country' : 'countries'}<br/>in your travel history</span></h1>
          <button aria-label="Open your trip library" onClick={onOpenLibrary}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>
        <dl className="world-stats"><div><dd>{stats.trips.completed + stats.trips.active}</dd><dt>{stats.trips.completed + stats.trips.active === 1 ? 'trip' : 'trips'}</dt></div><div><dd>{stats.cities.length}</dd><dt>{stats.cities.length === 1 ? 'city' : 'cities'}</dt></div><div><dd>{stats.daysTravelled}</dd><dt>days travelled</dt></div></dl>
        {countries.size > 0 ? <section className="world-countries" aria-labelledby="world-countries-title">
          <h2 id="world-countries-title">Your countries<span className="world-countries__mobile-cue">Swipe to choose →</span><span className="world-countries__desktop-cue">Choose a country</span></h2>
          <ul>{[...countries].map(([code, status]) => <li key={code}><button id={`world-country-${code}`} onClick={() => setSelected(code)}>
            <span className="world-country-code" aria-hidden="true">{code}</span><span>{countryName(code)}<small>{status === 'visited' ? 'Visited' : status === 'current' ? 'Current trip' : 'Upcoming'}</small></span><Chevron/>
          </button></li>)}</ul>
        </section> : <div className="world-empty"><h2>Your journey belongs here.</h2><p>Your recorded cities have no map match yet. Open a journey and add a stop with a location to put it on World.</p><button className="world-primary" onClick={onOpenLibrary}>Open my journeys <span aria-hidden="true">→</span></button></div>}
      </>}
      {!selected && !settingUp && <section className="world-discovery" aria-label="Places to explore">
        <h2>Somewhere to begin<button ref={exploreButton} onClick={()=>setExploring(true)} className="world-text-button">Explore Croatia <span aria-hidden="true">→</span></button></h2>
        <div className="world-discovery__photos">
          <button onClick={()=>{setExploreCity('Dubrovnik');setExploring(true);}} aria-label="Discover Dubrovnik in Croatia"><img src="/images/dubrovnik-port.jpg" alt="" width="640" height="360"/><span>Dubrovnik<small>Along the city walls</small></span></button>
          <button onClick={()=>{setExploreCity('Split');setExploring(true);}} aria-label="Discover Split in Croatia"><img src="/images/split.jpg" alt="" width="640" height="360"/><span>Split<small>By the Adriatic</small></span></button>
        </div>
        <DestinationCredits />
      </section>}
      {!selected && state.library.length > 0 && recent.length > 0 && <section className="world-recent"><h2>Recent journeys<button className="world-text-button" onClick={onOpenLibrary}>All trips <span aria-hidden="true">→</span></button></h2><ul className="world-trips">{recent.map(tripRow)}</ul></section>}
      {scan.phase !== 'complete' && <p className="world-notice" role="status">{scan.phase === 'recomputing' ? 'Updating your travel history…' : 'Some travel history needs updating. Open Trips to review.'}</p>}
      {hasGaps && <details className="world-gaps"><summary>About your travel record</summary>
        {(stats.unattributed.stops + stats.unattributed.places + stats.unattributed.cities) > 0 && <p>{(stats.unattributed.stops + stats.unattributed.places + stats.unattributed.cities)} of {(stats.located.stops + stats.located.places + stats.located.cities)} located records could not be matched to a country and do not appear on the globe.</p>}
        {missing.length > 0 && <p>No map shape is available for {missing.map(countryName).join(', ')}. Their history remains available in the country list.</p>}
        {stats.absorbed.length > 0 && <p>Some stored details could not be read. Open Trips to review the affected records: {[...new Set(stats.absorbed.map((item) => item.rowId))].join(', ')}.</p>}
      </details>}
      <div className="world-source"><span>Map: Natural Earth · Earth imagery: <a href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/" target="_blank" rel="noreferrer">NASA Blue Marble</a> · Your history stays on this device</span>
        <button className="world-text-button" onClick={() => setAtlas(true)}>Open atlas view</button></div>
    </section>
  </main>;
}
