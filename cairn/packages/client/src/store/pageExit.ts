/**
 * Leaving the page is R3-2's sixth case with the platform in the way (ARCHITECTURE §4.2
 * rule 6, "Leaving the page is the same case, and the platform will not fully cooperate").
 *
 * `visibilitychange` → `hidden` and `pagehide`, deduped, both call `store.flush()`;
 * `beforeunload` calls `preventDefault()` while the store is dirty, so the browser shows its
 * own "Leave site?" prompt. That dialog needs sticky activation, which is satisfied here by
 * construction — the user typed the edit.
 *
 * **What this does NOT promise.** An unload handler **cannot await an asynchronous IndexedDB
 * write**, and `pagehide` / `beforeunload` / `unload` are not reliable on mobile; Safari does
 * not always fire `visibilitychange` when the user clicks a link away. `hidden` is the last
 * state transition a page can reliably observe. So the guarantee is "flushed at the last
 * point the platform reliably offers, plus a native prompt if the user leaves dirty" —
 * nothing stronger, and this comment says so rather than pretending. The real guarantee is
 * rule 6a/6b in the store, which covers every in-app transition and needs no cooperation
 * from the browser at all.
 *
 * It takes its targets as arguments rather than reaching for `window` so that it is
 * exercisable in plain Node with no DOM — which is the only way it gets a test at all.
 * §4.2 says `apps/web` registers these, and `App.tsx` does; the logic lives here because
 * §3 forbids anything importing `apps/web`, so a module there cannot be tested.
 * BUILD-NOTES §1, KD-22.
 */

/** The `addEventListener` surface this needs, narrowed to what it actually calls. */
export type ListenerTarget = {
  addEventListener(type: string, fn: (e: unknown) => void): void;
  removeEventListener(type: string, fn: (e: unknown) => void): void;
};

export type ExitDeps = {
  /** `window`. */
  win: ListenerTarget;
  /** `document`, plus the visibility state the handler has to read. */
  doc: ListenerTarget & { visibilityState: string };
  flush(): Promise<unknown>;
  isDirty(): boolean;
};

/** Impure: registers listeners. Returns the unregister function. */
export function registerPageExit(deps: ExitDeps): () => void {
  const { win, doc } = deps;
  // Deduped: a real exit fires `visibilitychange` AND `pagehide`, and flushing twice would
  // chain a second, pointless write behind the first.
  let exiting = false;

  const onExit = () => {
    if (exiting) return;
    exiting = true;
    void deps.flush();
  };
  const onVisibility = () => {
    if (doc.visibilityState === 'hidden') onExit();
    // Coming back is a new page life: the next exit must flush again.
    else exiting = false;
  };
  const onBeforeUnload = (e: unknown) => {
    if (!deps.isDirty()) return;
    (e as { preventDefault(): void }).preventDefault();
  };

  doc.addEventListener('visibilitychange', onVisibility);
  win.addEventListener('pagehide', onExit);
  win.addEventListener('beforeunload', onBeforeUnload);

  return () => {
    doc.removeEventListener('visibilitychange', onVisibility);
    win.removeEventListener('pagehide', onExit);
    win.removeEventListener('beforeunload', onBeforeUnload);
  };
}
