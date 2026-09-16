/**
 * **The city picker — the first screen in this repository that reads the gazetteer corpus, and
 * therefore the first that owes a user an attribution.** ROADMAP Phase 2 `I-30`, ARCHITECTURE
 * §8.4 **A-91**; the loading contract is **A-83** Parts 6 and 7.
 *
 * Shared by both trip-creation forms (`Library.tsx`'s `NewTrip` and `PastTripForm.tsx`). It
 * searches lazily, one shard per query, never the corpus: `loadGazetteerFor` resolves the query
 * to exactly one of ~950 JSON documents behind a dynamic import.
 *
 * **A pick is written whole and nothing here types a country** (§8.4 **A-84** Part 3 clause 4).
 * `cityPickFromRow` is the only mint for a `CityPick`, it takes a `GazetteerRow` rather than a
 * string, and that signature is the enforcement: a caller that does not hold a row a human chose
 * cannot produce a pick. `createTrip` stands the city on a copy of `pick.centre`, so the shortest
 * call this screen makes — `{name, pick}`, no `centre` — stores a real coordinate.
 *
 * ---
 *
 * **THE ATTRIBUTION — A-91 item 3, and it is this increment's exit criterion rather than a note.**
 *
 * GeoNames is CC BY 4.0. The credit must be on screen in **all three** states the loader can be
 * in — **at least one hit**, **a miss**, and **"keep typing"** — carrying the exact
 * `Gazetteer.source` string and a resolving link to the licence.
 *
 * Two things about how that is done here, both of which A-91 rules on directly:
 *
 *  1. **The string is never written down in this file.** It is read off the loaded gazetteer's
 *     own `source`, which is `meta.json`'s `$source`. A hard-coded credit passes the rendered
 *     link assertion forever and goes stale at the next corpus re-pin (A-90 clause 3) — A-91
 *     names that as the injected fault *that matters*. `test/attribution.test.ts` holds it: the
 *     code, comments stripped, may not contain a fragment of the string.
 *  2. **"Keep typing" needs a query, because below two characters the loader answers before it
 *     reads anything.** `loadGazetteer` returns `null` for a folded query under two characters —
 *     *"I have not looked yet"*, which is not a miss — and it returns it **before** fetching the
 *     meta document, so there is no `source` to render. `cli.ts cities` hit this first and
 *     answered it with `ATTRIBUTION_PROBE`: *a query that is known to resolve stands in for the
 *     corpus that was not searched*. This screen does the same, once, on mount. It loads the meta
 *     document and one shard — **exactly what a single search loads** — so A-83 Part 6's boundary
 *     is unchanged: one shard per query, never the corpus. **Two different things can break it
 *     and they need two different instruments** (QA **R74-5**): a **re-pin** that makes the query
 *     stop resolving reddens `test/attribution.test.ts`, which measures the committed corpus; a
 *     **404 on the probe's shard at runtime** is invisible to any node test, so the probe is a
 *     list landing on different shards and `qa/i30-attribution.mjs` **phase 6** kills the first
 *     shard and requires the credit to survive.
 *
 * Once learned, `source` is **not cleared** — not on a new query, not below two characters, not
 * on a failed load. Clearing it is how the credit went missing in the first place.
 *
 * The rendered half of the criterion is `qa/i30-attribution.mjs` **phase 1** (hits), **phase 2**
 * (a miss) and **phase 3** ("keep typing"), with the injected faults N1/N2/N3 in
 * `qa/i30-faults.sh`. Node cannot render `apps/web` — `test/boundaries.test.ts` forbids importing
 * it from the suite — so a browser is the only instrument that can hold a `[rendered]` criterion.
 *
 * **BUILD-NOTES KD-39** — *a city's centre is `{0,0}` on both trip-creation screens* — is closed
 * by this file and its residue is here: a city the user **picked** carries the gazetteer row's
 * coordinate and country; a city they typed and we could not find is added with **no pick at
 * all**, so `createTrip` stores `centre: null` — an honest hole rather than the Gulf of Guinea —
 * and the chip below says so in words.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { cityPickFromRow, searchGazetteer } from '@cairn/core';
import type { CityInit, GazetteerHit } from '@cairn/core';

export type SelectedCity = Pick<CityInit, 'name' | 'pick'>;

/**
 * The queries the picker asks on mount, purely to learn the corpus's own attribution string for
 * the states in which nothing was searched. Same act, same reason and same shape as `cli.ts`'s
 * constant of the same name. **They are not searches and their rows are discarded.**
 *
 * **It is a list, and each entry resolves to a DIFFERENT shard — QA R74-5.** This was one query,
 * `'zurich'`, whose failure was swallowed; a 404 on that one shard therefore left *"keep typing"*
 * — the state A-91 names third — with no credit at all, while every other state was fine. The
 * first query that answers wins and the rest are never fetched, so the healthy path is unchanged:
 * A-83 Part 6's boundary is still the meta document plus **one** shard on mount.
 * `test/attribution.test.ts` holds both properties (every probe resolves; they are not all on the
 * same shard) and `qa/i30-attribution.mjs` **phase 6** holds the rendered consequence.
 */
export const ATTRIBUTION_PROBES = ['zurich', 'oslo', 'kyoto'];

/** The licence the corpus is under. The one half of the credit that is not readable off it. */
export const LICENCE_URL = 'https://creativecommons.org/licenses/by/4.0/';

/** What the loader answering `null` means, in the product's words. Never *"no match"*. */
const KEEP_TYPING = 'Keep typing — that is not enough yet to search the map.';

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
  const open = trimmed.length >= 2 && (busy || hits.length > 0 || !!message);

  // A-91 item 3, the "keep typing" state. One query, on mount, discarded except for its `source`
  // — and, if that query's shard cannot be fetched, the next one (QA R74-5). A dead shard is a
  // runtime fact about the network, not about what Cairn is allowed to credit, and the credit is
  // owed in this state too. What is NOT done here is invent a fallback string: if no probe
  // answers, Cairn has read no provenance and states none.
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const { loadGazetteerFor } = await import('@cairn/core/gazetteer');
        for (const probe of ATTRIBUTION_PROBES) {
          if (!live) return;
          try {
            const gazetteer = await loadGazetteerFor(probe);
            if (gazetteer) { if (live) setSource(gazetteer.source); return; }
          } catch { /* this shard did not load; the next probe is on a different one */ }
        }
      } catch { /* the corpus entry point itself is unreachable; the search path reports that */ }
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const id = ++request.current;
    if (trimmed.length < 2) { setHits([]); setMessage(''); setBusy(false); return; }
    setBusy(true); setHits([]); setMessage(''); setActive(0);
    const timer = window.setTimeout(() => {
      void import('@cairn/core/gazetteer').then(({ loadGazetteerFor }) => loadGazetteerFor(trimmed)).then((gazetteer) => {
        if (id !== request.current) return;
        // `null` is A-83 Part 6's *keep typing*: the query cannot resolve to one shard, so
        // **nothing was searched**. Calling that "no match" is a lie about the corpus's coverage
        // — A-82's rule is that a miss is a miss and the product says so, and *"I have not looked
        // yet"* is not a miss. `cli.ts cities` has always drawn this line; this screen used to
        // print `No map matches found.` for it.
        if (!gazetteer) { setHits([]); setMessage(KEEP_TYPING); return; }
        const result = searchGazetteer(trimmed, gazetteer, { limit: 8 });
        setHits(result.hits); setSource(result.source); setMessage(result.hits.length ? '' : 'No map matches found.'); setActive(0);
      }).catch(() => { if (id === request.current) setMessage('City search could not load. You can keep this name without a map match and continue your journey.'); })
        .finally(() => { if (id === request.current) setBusy(false); });
    }, 160);
    return () => { window.clearTimeout(timer); request.current++; };
  }, [trimmed]);

  // Invalidate synchronously: a click/Enter cannot choose the previous query's results
  // in the interval before the search effect runs. `source` is deliberately NOT cleared here —
  // it is a property of the corpus, not of this query, and the credit is owed in every state.
  const changeQuery = (next: string) => {
    if (next.trim() === trimmed) { setQuery(next); return; }
    request.current++; setQuery(next); setHits([]); setMessage(''); setActive(0); setBusy(next.trim().length >= 2);
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
    </ul>{message && <p className="city-selector__message" role="status">{message}</p>}</div>}
    {/*
      **A-91 item 3.** Outside the results panel, on purpose: the panel is open only at two or
      more characters and only while a search has something to say, and the credit is owed in all
      three states — including the one where nothing has been searched at all.
    */}
    {source && <p className="city-selector__source" data-testid="gazetteer-attribution"><span>{source}</span>{' '}<a href={LICENCE_URL} target="_blank" rel="noreferrer">CC BY 4.0 license</a></p>}
    {value.length > 0 && <ol className="city-selector__selected" aria-label="Cities in journey order">{value.map((city, index) => <li key={`${city.name}-${index}`}><span><b>{index + 1}</b>{city.name}{city.pick ? <small>Map matched{city.pick.countryCode ? ` · ${city.pick.countryCode}` : ''}</small> : <small>May not appear on World</small>}</span><button type="button" aria-label={`Remove ${city.name}`} onClick={() => onChange(value.filter((_, i) => i !== index))}>Remove</button></li>)}</ol>}
    {required && value.length === 0 && <p className="city-selector__help">Choose at least one city. It is what lets this journey illuminate your World.</p>}
  </div>;
}
