/**
 * The app shell: a tab bar over the surfaces, plus the save indicator.
 *
 * No domain logic. Every mutation goes through `store.dispatch` — §4.2 rule 1.
 *
 * **The shell is a registry** (ROADMAP I-8a). Navigation is sized for **Trips · Map ·
 * Profile** and no fourth slot — I-8's *"no DISCOVER tab: a slot that exists to promise
 * something is the opposite of what this product's conventions say about presenting things
 * that are not yet true."* By the same rule, only the two tabs that have content are
 * registered here; **Profile is registered by I-8b, not stubbed now**. Adding it is one entry
 * in `TABS`, not a second shell.
 *
 * **Every registered panel stays mounted, and the inactive ones are `hidden`.** That is
 * deliberate on both maps. The trip map's Leaflet instance keeps its handle and its
 * `ResizeObserver`, so hiding and showing it costs an `invalidateSize` rather than a mount —
 * §4.4's contract, unchanged. And it puts the world map in exactly the state CLAUDE.md's
 * first map bug is about: mounted inside a `display:none` container. It survives because
 * A-40 Part 4 made that bug inexpressible there, not because the shell avoids the case.
 */
import { Component, useEffect, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { registerPageExit } from '@cairn/client';
import type { AppState, DerivedCache } from '@cairn/client';
import { store, useAppState, useDerived } from './store.ts';
import { Library } from './views/Library.tsx';
import { TripView } from './views/TripView.tsx';
import { WorldMap } from './views/WorldMap.tsx';
import { hasSample, sampleTrip } from './sample.ts';

type TabId = 'trips' | 'map';

type TabContext = {
  state: AppState;
  derived: DerivedCache | null;
  onError: (m: string) => void;
  go: (tab: TabId) => void;
};

type TabSpec = {
  id: TabId;
  label: string;
  /** A tab exists exactly when there is something to render in it. */
  render: (ctx: TabContext) => ReactNode;
};

const TABS: TabSpec[] = [
  {
    id: 'trips',
    label: 'Trips',
    render: ({ state, derived, onError }) =>
      state.doc ? (
        <TripView state={state} derived={derived} onError={onError} />
      ) : (
        <Library state={state} onError={onError} sample={hasSample ? sampleTrip : null} />
      ),
  },
  {
    id: 'map',
    label: 'Map',
    render: ({ state, onError, go }) => (
      <WorldMap
        state={state}
        onError={onError}
        onOpenTrip={(id) => {
          go('trips');
          void store.openTrip(id).catch((e: Error) => onError(e.message));
        }}
      />
    ),
  },
];

/**
 * One error boundary per tab panel, and the reason is the shell's own design.
 *
 * Every registered panel is mounted at once, so without this a throw anywhere in one surface
 * unmounts **all** of them and the user gets a blank page instead of the two tabs that were
 * working. ROADMAP I-8's `travelStats` criterion is explicit that the alternative to a
 * refusal is *"a blank screen or an unhandled rejection"*, and a shared tree makes that
 * outcome reachable from a surface that is not the one refusing.
 *
 * It is deliberately not a general-purpose recovery: it says which surface failed and what
 * it said, and leaves the rest of the app usable. A class component because React has no
 * hook form of `componentDidCatch`; `state` is a class field, which type-strips cleanly
 * (no parameter properties, no enums, no `declare`).
 */
class TabBoundary extends Component<{ label: string; children: ReactNode }, { message: string | null }> {
  state: { message: string | null } = { message: null };

  static getDerivedStateFromError(error: unknown): { message: string } {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Console rather than swallowed: a breaker reading the page's error log must still see it.
    console.error(`Cairn: the ${this.props.label} tab failed to render`, error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.message === null) return this.props.children;
    return (
      <div className="banner banner--error" role="alert">
        <div>
          <b>The {this.props.label} tab could not be shown.</b>
          <p className="hint mono">{this.state.message}</p>
        </div>
      </div>
    );
  }
}

export function App() {
  const state = useAppState();
  const derived = useDerived(state);
  const [error, setError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<TabId>('trips');

  // Boot: read the library, then bring every row minted by an older build up to the current
  // `SUMMARY_VERSION` (ARCHITECTURE §8.4 clause 3). The two are deliberately separate calls —
  // reading rows and rewriting them are different acts with different failure modes — and the
  // rescan is not awaited before the app renders: `Library` shows what it has and says
  // "Recomputing…" over it, which is the honest state rather than a spinner over the library.
  useEffect(() => {
    void (async () => {
      try {
        await store.refreshLibrary();
      } catch (e) {
        setError(`Could not read local storage: ${(e as Error).message}`);
        return;
      } finally {
        setBooting(false);
      }
      // Never throws for a document it could not read — that is reported per row through
      // `summaryScan(state).unreadable`, because one corrupt record out of forty must not
      // take the library view down with it.
      try {
        await store.rescanSummaries();
      } catch (e) {
        setError(`Could not update the trip library: ${(e as Error).message}`);
      }
    })();
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
          onClick={() => {
            setTab('trips');
            run(store.closeTrip());
          }}
          title={state.doc ? 'Back to all trips' : 'Cairn'}
        >
          {/*
            A flat-ink mark, drawn rather than filled with a gradient: three stacked stones,
            which is what a cairn is. ROADMAP I-8a names the gradient-plus-glow ring it
            replaces as one of two removals, and `docs/VISUAL-TELLS.md` §1 had it on the same
            list independently.
          */}
          <svg className="topbar__mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4.5 12.5h7M5.5 12.5a2.5 2.5 0 0 1 5 0M6 9.6a2 2 0 0 1 4 0M6.9 7a1.4 1.4 0 0 1 2.2 0" />
          </svg>
          Cairn
        </button>
        {state.doc && <span className="topbar__title">{state.doc.title}</span>}
        <span className="topbar__spacer" />
        {state.doc && <SaveState />}
      </header>

      {/*
        The tab bar. `role="tablist"` with real `aria-selected` state, because these are the
        product's top-level surfaces and a screen reader has to be able to tell which one is
        showing. Rendered from `TABS` — a tab cannot appear without something to render.
      */}
      <nav className="tabbar" role="tablist" aria-label="Cairn">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tabbtn-${t.id}`}
            className={'tabbar__tab' + (t.id === tab ? ' tabbar__tab--on' : '')}
            role="tab"
            type="button"
            aria-selected={t.id === tab}
            aria-controls={`tabpanel-${t.id}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

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
      ) : (
        TABS.map((t) => (
          <div
            key={t.id}
            id={`tabpanel-${t.id}`}
            className="tabpanel"
            role="tabpanel"
            aria-labelledby={`tabbtn-${t.id}`}
            hidden={t.id !== tab}
          >
            <TabBoundary label={t.label}>
              {t.render({ state, derived, onError: setError, go: setTab })}
            </TabBoundary>
          </div>
        ))
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
