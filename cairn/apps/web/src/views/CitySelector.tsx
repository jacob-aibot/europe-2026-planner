import { useEffect, useId, useRef, useState } from 'react';
import { cityPickFromRow, searchGazetteer } from '@cairn/core';
import type { CityInit, GazetteerHit } from '@cairn/core';

export type SelectedCity = Pick<CityInit, 'name' | 'pick'>;

export function CitySelector({ value, onChange, required = false, initialQuery = '' }: {
  value: SelectedCity[];
  onChange: (cities: SelectedCity[]) => void;
  required?: boolean;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<readonly GazetteerHit[]>([]);
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const listId = useId();
  const trimmed = query.trim();
  const open = trimmed.length >= 2 && (busy || hits.length > 0 || !!message || !!source);

  useEffect(() => {
    const id = ++request.current;
    if (trimmed.length < 2) { setHits([]); setSource(''); setMessage(''); setBusy(false); return; }
    setBusy(true); setHits([]); setSource(''); setMessage(''); setActive(0);
    const timer = window.setTimeout(() => {
      void import('@cairn/core/gazetteer').then(({ loadGazetteerFor }) => loadGazetteerFor(trimmed)).then((gazetteer) => {
        if (id !== request.current) return;
        if (!gazetteer) { setHits([]); setSource(''); setMessage('No map matches found.'); return; }
        const result = searchGazetteer(trimmed, gazetteer, { limit: 8 });
        setHits(result.hits); setSource(result.source); setMessage(result.hits.length ? '' : 'No map matches found.'); setActive(0);
      }).catch(() => { if (id === request.current) setMessage('City search could not load. You can keep this name without a map match and continue your journey.'); })
        .finally(() => { if (id === request.current) setBusy(false); });
    }, 160);
    return () => { window.clearTimeout(timer); request.current++; };
  }, [trimmed]);

  // Invalidate synchronously: a click/Enter cannot choose the previous query's results
  // in the interval before the search effect runs.
  const changeQuery = (next: string) => {
    if (next.trim() === trimmed) { setQuery(next); return; }
    request.current++; setQuery(next); setHits([]); setSource(''); setMessage(''); setActive(0); setBusy(next.trim().length >= 2);
  };
  useEffect(() => {
    if (open && !busy) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, busy]);

  const add = (city: SelectedCity) => { onChange([...value, city]); changeQuery(''); input.current?.focus(); };
  const optionCount = hits.length + (trimmed ? 1 : 0);
  const chooseActive = () => active < hits.length ? add({ name: hits[active].name, pick: cityPickFromRow(hits[active]) }) : add({ name: trimmed });
  return <div className="city-selector">
    <label htmlFor={`${listId}-input`}>Cities <span>{required ? 'at least one' : 'optional'} · add in journey order</span></label>
    <div className="city-selector__input-wrap">
      <input ref={input} id={`${listId}-input`} value={query} onChange={(e) => changeQuery(e.target.value)} placeholder="Start typing a city" role="combobox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-autocomplete="list" aria-activedescendant={open && !busy ? `${listId}-${active}` : undefined}
        onKeyDown={(e) => { if (!open) return; if (e.key === 'Escape') { e.preventDefault(); changeQuery(''); } else if (e.key === 'Enter') { e.preventDefault(); if (!busy && optionCount) chooseActive(); } else if (!busy && e.key === 'ArrowDown') { e.preventDefault(); setActive((n) => Math.min(optionCount - 1, n + 1)); } else if (!busy && e.key === 'ArrowUp') { e.preventDefault(); setActive((n) => Math.max(0, n - 1)); } }} />
      {busy && <span className="city-selector__busy" role="status">Searching…</span>}
    </div>
    {open && <div className="city-selector__results"><ul id={listId} role="listbox" aria-label="City matches">
      {hits.map((hit, index) => <li key={hit.id} role="none"><button tabIndex={-1} id={`${listId}-${index}`} role="option" aria-selected={active === index} type="button" onMouseEnter={() => setActive(index)} onClick={() => add({ name: hit.name, pick: cityPickFromRow(hit) })}><strong>{hit.label}</strong><span>Use map match</span></button></li>)}
      {trimmed && <li role="none"><button tabIndex={-1} id={`${listId}-${hits.length}`} role="option" aria-selected={active === hits.length} type="button" className="city-selector__unmatched" onMouseEnter={() => setActive(hits.length)} onClick={() => add({ name: trimmed })}><strong>Use “{trimmed}” without a map match</strong><span>This city may not appear on World.</span></button></li>}
    </ul>{message && <p className="city-selector__message" role="status">{message}</p>}{source && <p className="city-selector__source"><span>{source}</span>{' '}<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0 license</a></p>}</div>}
    {value.length > 0 && <ol className="city-selector__selected" aria-label="Cities in journey order">{value.map((city, index) => <li key={`${city.name}-${index}`}><span><b>{index + 1}</b>{city.name}{city.pick ? <small>Map matched{city.pick.countryCode ? ` · ${city.pick.countryCode}` : ''}</small> : <small>May not appear on World</small>}</span><button type="button" aria-label={`Remove ${city.name}`} onClick={() => onChange(value.filter((_, i) => i !== index))}>Remove</button></li>)}</ol>}
    {required && value.length === 0 && <p className="city-selector__help">Choose at least one city. It is what lets this journey illuminate your World.</p>}
  </div>;
}
