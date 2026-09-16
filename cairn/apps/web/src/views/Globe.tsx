import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PointerEvent, KeyboardEvent } from 'react';
import { COUNTRY_INDEX, countryKeyPoint } from '@cairn/core';
import { constrainPose, GLOBE_RADIUS, globePaths, globeShapes, INITIAL_POSE } from '../world/globeGeometry.ts';
import type { GlobePose } from '../world/globeGeometry.ts';
import { earthMaterial } from '../world/earthMaterial.ts';

const shapes = globeShapes(COUNTRY_INDEX);
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
export const countryName = (code: string) => regionNames.of(code) ?? code;
export type CountryState = 'visited' | 'current' | 'upcoming';
type Props = { countries: ReadonlyMap<string, CountryState>; selected: string | null; onSelect: (code: string) => void; onExplore?: () => void };

/** Transient view interaction only. The browser hit-tests geography; no screen-to-country math. */
export function Globe({ countries, selected, onSelect, onExplore }: Props) {
  const id = useId().replaceAll(':', '');
  const [pose, setPose] = useState(INITIAL_POSE);
  const poseRef = useRef(pose);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(false);
  const movement = useRef(0);
  const distance = useRef(0);
  const frame = useRef<number | null>(null);
  const focusFrame = useRef<number | null>(null);
  const paths = useMemo(() => globePaths(shapes, pose), [pose]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const material = useRef<ReturnType<typeof earthMaterial>>(null);
  const [textured, setTextured] = useState(false);
  useEffect(() => {
    const element=canvas.current;
    if (!element) return;
    const initialize=()=>{material.current?.dispose();material.current=earthMaterial(element,setTextured);material.current?.render(poseRef.current);};
    const lost=(event: Event)=>{event.preventDefault();setTextured(false);};
    element.addEventListener('webglcontextlost',lost);element.addEventListener('webglcontextrestored',initialize);initialize();
    return ()=>{material.current?.dispose();material.current=null;element.removeEventListener('webglcontextlost',lost);element.removeEventListener('webglcontextrestored',initialize);};
  }, []);
  useEffect(() => { material.current?.render(pose); }, [pose]);
  function update(next: GlobePose) {
    poseRef.current = constrainPose(next);
    if (frame.current === null) frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setPose(poseRef.current);
    });
  }
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); if(focusFrame.current !== null) cancelAnimationFrame(focusFrame.current); }, []);
  useEffect(() => {
    if (!selected) return;
    const point = countryKeyPoint(selected, COUNTRY_INDEX);
    if (!point) return;
    const target={ longitude: point.lng, latitude: point.lat, zoom: 1 };
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){update(target);return;}
    const from=poseRef.current;
    const delta=((point.lng-from.longitude+540)%360)-180;
    let started: number | null=null;
    const tick=(time:number)=>{
      started ??= time;
      const t=Math.min(1,(time-started)/650),ease=1-(1-t)**3;
      update({longitude:from.longitude+delta*ease,latitude:from.latitude+(point.lat-from.latitude)*ease,zoom:from.zoom+(1-from.zoom)*ease});
      focusFrame.current=t<1?requestAnimationFrame(tick):null;
    };
    focusFrame.current=requestAnimationFrame(tick);
    return ()=>{if(focusFrame.current !== null)cancelAnimationFrame(focusFrame.current);focusFrame.current=null;};
  }, [selected]);

  const pinchDistance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  function start(event: PointerEvent<SVGSVGElement>) {
    if(focusFrame.current !== null){cancelAnimationFrame(focusFrame.current);focusFrame.current=null;}
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (pointers.current.size === 0) { moved.current = false; movement.current = 0; }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size > 1) { moved.current = true; distance.current = pinchDistance(); }
    // Capture on the original path so a stationary tap still targets that country.
    (event.target as Element).setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size > 1) {
      const nextDistance = pinchDistance();
      if (distance.current > 0) update({ ...poseRef.current, zoom: poseRef.current.zoom * nextDistance / distance.current });
      distance.current = nextDistance;
    } else {
      movement.current += Math.hypot(dx, dy);
      if (movement.current <= 6) return;
      moved.current = true;
      update({ ...poseRef.current, longitude: poseRef.current.longitude - dx * .38 / poseRef.current.zoom,
        latitude: poseRef.current.latitude + dy * .3 / poseRef.current.zoom });
    }
  }
  function end(event: PointerEvent<SVGSVGElement>) { pointers.current.delete(event.pointerId); distance.current = 0; }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if(focusFrame.current !== null){cancelAnimationFrame(focusFrame.current);focusFrame.current=null;}
    const p = poseRef.current;
    const changes: Record<string, GlobePose> = {
      ArrowLeft: { ...p, longitude: p.longitude - 15 }, ArrowRight: { ...p, longitude: p.longitude + 15 },
      ArrowUp: { ...p, latitude: p.latitude + 10 }, ArrowDown: { ...p, latitude: p.latitude - 10 },
      '+': { ...p, zoom: p.zoom + .3 }, '=': { ...p, zoom: p.zoom + .3 }, '-': { ...p, zoom: p.zoom - .3 }, Home: INITIAL_POSE,
    };
    if (changes[event.key]) { event.preventDefault(); update(changes[event.key]); }
  }
  return <div className={`globe${textured ? ' globe--textured' : ''}`}>
    <canvas ref={canvas} className="globe__material" width="780" height="780" aria-hidden="true" />
    <svg className="globe__earth" viewBox="0 0 390 390" role="group" tabIndex={0}
      aria-label="Interactive world globe" aria-describedby={`${id}-help`} data-zoom={pose.zoom.toFixed(2)}
      data-longitude={pose.longitude.toFixed(2)} data-latitude={pose.latitude.toFixed(2)}
      onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onKeyDown={key}>
      <defs>
        <radialGradient id={`${id}-ocean`} cx="32%" cy="28%" r="76%">
          <stop offset="0" stopColor="#14516a"/><stop offset=".48" stopColor="#063044"/><stop offset="1" stopColor="#010e19"/>
        </radialGradient>
        <radialGradient id={`${id}-light`} cx="35%" cy="29%" r="74%">
          <stop offset=".15" stopColor="#9ac0be" stopOpacity=".12"/><stop offset=".62" stopColor="#001019" stopOpacity="0"/>
          <stop offset="1" stopColor="#00050b" stopOpacity=".83"/>
        </radialGradient>
        <clipPath id={`${id}-clip`}><circle cx="195" cy="195" r={GLOBE_RADIUS * pose.zoom}/></clipPath>
      </defs>
      <circle className="globe__atmosphere" cx="195" cy="195" r={GLOBE_RADIUS * pose.zoom + 1.5}/>
      <circle className="globe__ocean" cx="195" cy="195" r={GLOBE_RADIUS * pose.zoom} fill={`url(#${id}-ocean)`}/>
      <g clipPath={`url(#${id}-clip)`}>
        {paths.map((path) => path.d ? <path key={path.key} d={path.d} fillRule="evenodd" vectorEffect="non-scaling-stroke"
          className={`globe__country globe__country--${countries.get(path.code) ?? 'unvisited'}${path.code === selected ? ' globe__country--selected' : ''}`}
          data-country={path.code} data-status={countries.get(path.code) ?? 'unvisited'}
          role={countries.has(path.code) || (path.code === 'HR' && onExplore) ? 'button' : undefined}
          aria-hidden={countries.has(path.code) || (path.code === 'HR' && onExplore) ? undefined : true}
          aria-label={countries.has(path.code) ? `${countryName(path.code)}: ${countries.get(path.code)}. Open travel history` : path.code === 'HR' && onExplore ? 'Explore Croatia' : undefined}
          onClick={() => { if (!moved.current) { if(countries.has(path.code)) onSelect(path.code); else if(path.code === 'HR') onExplore?.(); } }}>
          <title>{countryName(path.code)}</title>
        </path> : null)}
        <circle className="globe__shade" cx="195" cy="195" r={GLOBE_RADIUS * pose.zoom} fill={`url(#${id}-light)`} pointerEvents="none"/>
      </g>
    </svg>
    <div className="globe__controls" aria-label="Globe controls">
      <button type="button" aria-label="Zoom out" disabled={pose.zoom <= 1} onClick={() => update({ ...poseRef.current, zoom: poseRef.current.zoom - .35 })}>−</button>
      <button type="button" aria-label="Recenter globe" onClick={() => update(INITIAL_POSE)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/></svg>
      </button>
      <button type="button" aria-label="Zoom in" disabled={pose.zoom >= 2.8} onClick={() => update({ ...poseRef.current, zoom: poseRef.current.zoom + .35 })}>+</button>
    </div>
    <p className="globe__help" id={`${id}-help`}>Drag to explore · pinch to zoom<span className="world-sr">. Use arrow keys to rotate, plus and minus to zoom, and Home to reset. Choose countries in the list below.</span></p>
  </div>;
}
