/**
 * The app shell: a tab bar over the surfaces, plus the save indicator.
 *
 * No domain logic. Every mutation goes through `store.dispatch` — §4.2 rule 1.
 *
 * **The shell is a registry** (ROADMAP I-8a). Navigation is sized for **Trips · Map ·
 * Profile** and no fourth slot — I-8's *"no DISCOVER tab: a slot that exists to promise
 * something is the opposite of what this product's conventions say about presenting things
 * that are not yet true."* By the same rule, only tabs that have content are registered here.
 * **I-8b registers the third**, which is the registration I-8a said it would be: one entry in
 * `TABS`, not a second shell.
 *
 * **Navigation is bottom-anchored on phones — `docs/DESIGN.md` §3.3 R1**, and it is a CSS
 * reposition rather than a second navigation: **same DOM, same `role="tablist"`, same three
 * buttons, same order**. The reason is measured rather than asserted — the shipped bar sat at
 * `top: 2.7rem` on a 390 × 664 viewport, which is the least reachable region of a phone held
 * one-handed, and it is this product's only top-level navigation. From **split** (≥ 900) the bar
 * returns above the content, inside the one sticky stacking context R2 rules (`.chrome` below),
 * which is what removes the hardcoded `top: 2.7rem` the tab bar used to carry.
 *
 * **The tablist takes arrow keys** (§3.4). It was click-only, which is a real WAI-ARIA tabs gap,
 * and §3.4 puts it in *"the increment that next opens `App.tsx`"* — this one. Roving tabindex,
 * automatic activation, `Home`/`End`, and the arrows wrap.
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
import { Profile } from './views/Profile.tsx';
import { hasSample, sampleTrip } from './sample.ts';

type TabId = 'trips' | 'map' | 'profile';

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
  {
    id: 'profile',
    label: 'Profile',
    render: ({ state, onError, go }) => (
      <Profile
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
 * It says which surface failed and what it said, and leaves the rest of the app usable. A
 * class component because React has no hook form of `componentDidCatch`; `state` is a class
 * field, which type-strips cleanly (no parameter properties, no enums, no `declare`).
 *
 * **It also has a way out — BLD-3, from QA round 33.** The boundary used to latch `message`
 * for the whole session with no reset, so the banner outlived its own cause; and with the
 * Trips tab down, the complete set of visible controls was
 * `["BUTTON:CAIRN","BUTTON:TRIPS","BUTTON:MAP"]` — delete, export and restore all live in the
 * Library, and the Library was the surface that threw. So, exactly like the persistence
 * banners below, this one **names the two recoveries the user actually has**: try the surface
 * again once the cause is gone, and one control supplied by the *shell* rather than by the
 * surface that failed. Both clear `message`; if the cause is still there the child throws
 * again on the next render and the banner comes back, which is honest rather than sticky.
 *
 * It is deliberately not a general-purpose retry loop: nothing here re-runs a store operation
 * or guesses at what went wrong.
 */
/**
 * A control the shell offers a failed tab. `hint` is the same act named mid-sentence.
 *
 * **`run` may be asynchronous, and the boundary waits for it — QA R34-1.** Closing the open
 * trip is a store call, and the banner may not be cleared until it has actually landed; see
 * `TabBoundary.render` below for what went wrong when it was not.
 */
type Recovery = { label: string; hint: string; run: () => void | Promise<unknown> };

class TabBoundary extends Component<
  { label: string; recovery: Recovery; children: ReactNode },
  { message: string | null }
> {
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
    const { label, recovery } = this.props;
    return (
      <div className="banner banner--error" role="alert">
        <div>
          <b>The {label} tab could not be shown.</b>
          <p className="hint mono">{this.state.message}</p>
          <p className="hint">
            Two ways on: try {label} again, or {recovery.hint}. Nothing here has changed your
            trips.
          </p>
        </div>
        <button onClick={() => this.setState({ message: null })} aria-label="Try again">
          Try again
        </button>
        <button
          onClick={() => {
            /*
              **QA R34-1 — the ordering, which is the whole of this handler.**
              This used to be `recovery.run(); this.setState({ message: null })`. `run` fires an
              ASYNC `store.closeTrip()`; clearing `message` in the same statement list made React
              re-render the children immediately, while `state.doc` was still the open trip
              because the promise had not settled. `TripView` threw again,
              `getDerivedStateFromError` re-latched — and when `closeTrip` finally landed there
              was nothing left to clear `message`. Round 34 measured the result: banner still up,
              `.tripcard` count 0, and one further unassisted click on "Try again" recovering
              completely, which is what proved it was ordering rather than the recovery.

              So the reset waits for the act to take effect, and the boundary is never asked to
              re-render the still-broken subtree.

              A rejection clears too, deliberately: the store reports its own failure through the
              shell's error banner (`run` in `App` catches into `setError`), and leaving a second
              banner latched here would be the dead end BLD-3 exists to remove. This is still not
              a retry loop — nothing here re-runs a store operation or guesses at a repair.
            */
            const clear = () => this.setState({ message: null });
            void Promise.resolve(recovery.run()).then(clear, clear);
          }}
          aria-label={recovery.label}
        >
          {recovery.label}
        </button>
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

  // BLD-3: the one recovery a failed tab gets that does not live inside the surface that
  // threw. With a trip open, that is closing it — the open document is the input every
  // surface is rendering, so putting it down is the state change most likely to have been
  // the cause. With no trip open the shell has nothing left to put down, so the honest
  // offer is re-reading storage from scratch, which is what a reload is. Neither guesses at
  // a repair: §2.1 and CLAUDE.md both say a silently corrected document is a guessed one.
  //
  // **The close branch returns its promise** (QA R34-1). The boundary clears its banner only
  // once that promise settles; handing back `undefined` here would put the old bug back,
  // because the banner would clear while `state.doc` was still the trip that threw.
  const recovery: Recovery = state.doc
    ? {
        label: 'Close this trip',
        hint: 'close the trip you have open and go back to the library',
        run: () => { setTab('trips'); return run(store.closeTrip()); },
      }
    : {
        label: 'Reload Cairn',
        hint: 'reload Cairn, which reads your trips from this device again',
        run: () => window.location.reload(),
      };

  /**
   * WAI-ARIA tabs keyboard support — `DESIGN.md` §3.4. Automatic activation (the arrow both
   * moves focus and selects), which is the correct pattern for tabs whose panels are already
   * mounted: every panel is rendered and only the inactive ones are `hidden`, so selecting one
   * costs nothing and a manual-activation two-step would be ceremony over a free operation.
   *
   * Arrows wrap; `Home`/`End` go to first/last. The list is horizontal at every width — a bottom
   * position is not a different widget (§3.5) — so `ArrowUp`/`ArrowDown` are deliberately left
   * to the page, where they scroll.
   */
  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    let next: number;
    if (e.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (e.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else return;
    e.preventDefault();
    setTab(TABS[next].id);
    document.getElementById(`tabbtn-${TABS[next].id}`)?.focus();
  };

  return (
    <div className="app">
      {/*
        **R2 — one sticky stacking context.** The topbar and the tab bar are sticky *together*,
        as a single `position: sticky; top: 0` wrapper, so the second element's offset is the
        first element's real height whatever it turns out to be. What this replaces is the tab
        bar's `top: 2.7rem`: a hardcoded number equal to the topbar's height at its current
        content, which any topbar wrap made wrong by stacking the two on top of each other.
      */}
      <div className="chrome">
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

        **A bottom position is not a different widget** (§3.5): at base this is `position: fixed`
        at the bottom of the viewport and it is still exactly this markup. `tabIndex` is a roving
        one, so the tablist is a single tab stop and the arrows move inside it.
      */}
      <nav className="tabbar" role="tablist" aria-label="Cairn">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            id={`tabbtn-${t.id}`}
            className={'tabbar__tab' + (t.id === tab ? ' tabbar__tab--on' : '')}
            role="tab"
            type="button"
            aria-selected={t.id === tab}
            aria-controls={`tabpanel-${t.id}`}
            tabIndex={t.id === tab ? 0 : -1}
            onKeyDown={(e) => onTabKey(e, i)}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      </div>

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
            <TabBoundary label={t.label} recovery={recovery}>
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
