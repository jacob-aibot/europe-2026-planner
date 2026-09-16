import { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator } from 'd3-geo';

const cities = [
  {name:'Dubrovnik', description:'Stone walls above the Adriatic.',image:'/images/dubrovnik-port.jpg',lat:42.648,lng:18.092},
  {name:'Split',description:'Palace streets and the waterfront.',image:'/images/split.jpg',lat:43.509,lng:16.439},
] as const;

export function CroatiaPreview({ onBack, onStart, initialCity = 'Dubrovnik' }: {onBack:()=>void;onStart:(kind:'new'|'past',city?:string)=>void;initialCity?:string}) {
  const heading=useRef<HTMLHeadingElement>(null);
  const [selected,setSelected]=useState<(typeof cities)[number]>(cities.find(city=>city.name===initialCity)??cities[0]);
  useEffect(()=>{heading.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});},[]);
  const map=useMemo(()=>{
    const projection=geoMercator().center([16.35,44.05]).scale(2250).translate([195,110]).clipExtent([[0,0],[390,220]]);
    return {cities:cities.map(c=>({...c,point:projection([c.lng,c.lat])!}))};
  },[]);
  return <main className="destination" data-testid="croatia-preview">
    <div className="destination__hero">
      <img src="/images/dubrovnik-port.jpg" alt="Terracotta rooftops and the walled harbour of Dubrovnik" width="1280" height="719" />
      <button className="destination__back" onClick={onBack} aria-label="Back to World"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7" /></svg></button>
      <div className="destination__title"><h1 ref={heading} tabIndex={-1}>Croatia</h1><p>A little closer to the Adriatic.</p></div>
    </div>
    <section className="destination__sheet" aria-label="Explore Croatia">
      <p className="destination__intro">Sunlit stone, island horizons and time by the sea. Find a place to return to—or somewhere to begin.</p>
      <div className="destination__cities" aria-label="Choose a city">
        {cities.map(city=><button key={city.name} className={selected.name===city.name?'is-selected':''} aria-pressed={selected.name===city.name} onClick={()=>setSelected(city)}><img src={city.image} alt="" width="640" height="360" /><strong>{city.name}</strong><span>{city.description}</span></button>)}
      </div>
      <div className="destination__map">
        <svg viewBox="0 0 390 220" role="img" aria-label="Map of the Croatian coast showing Split and Dubrovnik">
          <image href="/images/croatia-coast.svg" width="390" height="220" />
          <text x="62" y="153" className="destination__sea">Adriatic Sea</text>
          {map.cities.map(city=><g key={city.name}><circle cx={city.point[0]} cy={city.point[1]} r={selected.name===city.name?7:5} fill={selected.name===city.name?'#f1c676':'#7cc9df'} stroke="#fffaf0" strokeWidth="2"/><text x={city.point[0]+12} y={city.point[1]+5} className="destination__map-label">{city.name}</text></g>)}
        </svg>
        <span>Natural Earth · Destination map</span>
      </div>
      <div className="destination__actions"><button className="world-primary" onClick={()=>onStart('new',selected.name)}>Plan a trip to {selected.name}<span aria-hidden="true">→</span></button><button className="world-text-button" onClick={()=>onStart('past',selected.name)}>I’ve been to {selected.name} · Record a visit</button></div>
      <p className="local-note">Exploring does not add a visit to your travel history.</p>
      <DestinationCredits />
    </section>
  </main>;
}

export function DestinationCredits(){return <details className="destination-credits"><summary>Photography & map credits</summary><p>Dubrovnik: <a href="https://commons.wikimedia.org/wiki/File:Aerial_view_of_the_Old_Port_of_Dubrovnik_in_Croatia_(48613136662).jpg" target="_blank" rel="noreferrer">dronepicr</a>, <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noreferrer">CC BY 2.0</a>. Split: <a href="https://commons.wikimedia.org/wiki/File:City_of_Split_Riva_panorama.jpg" target="_blank" rel="noreferrer">Gordan Sunara</a>, public domain. Photos displayed cropped. Geography: Natural Earth.</p></details>;}
