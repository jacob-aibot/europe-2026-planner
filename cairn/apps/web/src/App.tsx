/**
 * The app shell: trip library ↔ one open trip, plus the save indicator.
 *
 * No domain logic. Every mutation goes through `store.dispatch` — §4.2 rule 1.
 */
import { useEffect, useState } from 'react';
import { registerPageExit } from '@cairn/client';
import { store, useAppState, useDerived } from './store.ts';
import { Library } from './views/Library.tsx';
import { TripView } from './views/TripView.tsx';
import { hasSample, sampleTrip } from './sample.ts';

export function App() {
  const state = useAppState();
  const derived = useDerived(state);
  const [error, setError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    store
      .refreshLibrary()
      .catch((e: Error) => setError(`Could not read local storage: ${e.message}`))
      .finally(() => setBooting(false));
  }, []);

  // Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z, the only two shortcuts worth having in Phase 1.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      e.preventDefault();
      if (e.shiftKey) store.redo();
      else store.undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // §4.2 rule 6, the page-exit half. See `pageExit.ts` in @cairn/client for what this does
  // promise — an unload handler cannot await an IndexedDB write, and that is stated, not
  // papered over. The in-app guarantee is the store's flush-before-switch.
  useEffect(
    () =>
      registerPageExit({
        win: window as unknown as Parameters<typeof registerPageExit>[0]['win'],
        doc: document as unknown as Parameters<typeof registerPageExit>[0]['doc'],
        flush: () => store.flush(),
        isDirty: () => store.isDirty(),
      }),
    [],
  );

  const run = (p: Promise<unknown>) => p.catch((e: Error) => setError(e.message));
  const exportCopy = () => run(store.exportActive());

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="topbar__brand"
          onClick={() => run(store.closeTrip())}
          title={state.doc ? 'Back to all trips' : 'Cairn'}
        >
          <span className="topbar__mark" aria-hidden="true" />
          Cairn
        </button>
        {state.doc && <span className="topbar__title">{state.doc.title}</span>}
        <span className="topbar__spacer" />
        {state.doc && <SaveState />}
      </header>

      {error && (
        <div className="banner banner--error" role="alert">
          {error}
          <button onClick={() => setError(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {/*
        A refused or failed write blocks every trip switch (§4.2 rule 6b), so these two
        banners are also what a refused *transition* says — the same mechanism, not a new
        one. Both name the two recoveries the user actually has.
      */}
      {state.persistence.status === 'error' && state.persistence.lastError && (
        <div className="banner banner--error" role="alert">
          Not saved. {state.persistence.lastError}
          <button onClick={() => void store.flush()} aria-label="Retry">Retry</button>
          {state.doc && <button onClick={exportCopy} aria-label="Export this copy">Export this copy</button>}
        </div>
      )}

      {state.persistence.status === 'conflict' && (
        <div className="banner banner--error" role="alert">
          {state.persistence.lastError}
          <button onClick={() => run(store.mergeWithStored())} aria-label="Merge and save">
            Merge and save
          </button>
          <button onClick={exportCopy} aria-label="Export this copy">Export this copy</button>
        </div>
      )}

      {state.persistence.lastMerge && (
        <div className="banner" role="status">
          {state.persistence.lastMerge.message}
          <button onClick={() => store.clearMergeNotice()} aria-label="Dismiss">×</button>
        </div>
      )}

      {booting ? (
        <p className="empty">Opening your trips…</p>
      ) : state.doc ? (
        <TripView state={state} derived={derived} onError={setError} />
      ) : (
        <Library
          state={state}
          onError={setError}
          sample={hasSample ? sampleTrip : null}
        />
      )}
    </div>
  );
}

function SaveState() {
  const state = useAppState();
  const { status, lastError } = state.persistence;
  const dirty = store.isDirty();

  if (status === 'conflict') {
    return <span className="savestate savestate--error" title={lastError}>Not saved — edited elsewhere</span>;
  }
  if (status === 'error') {
    return (
      <button className="savestate savestate--error" onClick={() => void store.flush()} title={lastError}>
        Not saved — retry
      </button>
    );
  }
  if (status === 'saving') return <span className="savestate">Saving…</span>;
  return <span className="savestate">{dirty ? 'Unsaved changes' : 'Saved'}</span>;
}
