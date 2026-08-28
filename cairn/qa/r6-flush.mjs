/**
 * Round 6 — adversarial verification of the R5-1 fix (`flushForTransition`'s drain loop).
 *
 * The builder's `flush-race.test.ts` proves the happy path and the bound. This probe goes
 * after what that file cannot see, because it runs the bound with a dead scheduler and
 * asserts only on stored bytes at the end:
 *
 *   §1  the loop's exit condition is `dirty()`, re-asserted after EVERY write — checked by
 *       counting writes and inspecting bytes with a real scheduler, not by reading the source
 *   §2  an edit landing mid-flush on a DIFFERENT trip (dispatch cannot address one, so the
 *       question is whether any other path can move `state.doc` under the loop)
 *   §3  BOUND EXHAUSTED with a REAL scheduler: does the transition abort, is the edit still
 *       in memory, is autosave still armed, and is the `false` visible to a user?
 *   §4  a genuine two-tab refusal arriving DURING the retry loop (not before it)
 *   §5  all six transitions propagate `false` into an aborted transition
 *   §6  the R3-3 self-race (`mergeWithStored` assigns `saving` instead of chaining) against
 *       the loop — better, worse, or unaffected
 *   §7  `deleteTrip(activeId)` firing while another transition's flush is parked
 *
 * Run: node qa/r6-flush.mjs   (from cairn/)
 * A "FAIL" line means the probe found something.
 */
const { createStore, FLUSH_MAX_ATTEMPTS } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');
const core = await import('../packages/core/src/index.ts');

let fails = 0;
const ok = (n, c, x = '') => {
  if (!c) fails++;
  console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
};
const line = (s) => console.log('\n== ' + s + ' ==');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const INIT = (title) => ({
  title,
  startDate: '2026-09-01',
  endDate: '2026-09-04',
  homeCurrency: 'EUR',
  cities: [{ key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2082, lng: 16.3738 }, order: 0 }],
});

let n = 0;
function portsFor(storage, scheduler) {
  return {
    storage,
    ids: mem.sequentialIdPort(`r6${n++}`),
    clock: mem.fixedClockPort('2026-08-26'),
    file: mem.memoryFile(),
    ...(scheduler ? { scheduler } : {}),
  };
}

/** A storage port whose write parks until released. */
function gated(inner) {
  let gate = null;
  let release = null;
  return {
    inner,
    park() {
      gate = new Promise((r) => (release = r));
      return () => { const f = release; gate = null; release = null; f?.(); };
    },
    port: {
      listTrips: () => inner.listTrips(),
      load: (id) => inner.load(id),
      delete: (id) => inner.delete(id),
      async saveIfVersion(id, expected, doc, summary) {
        if (gate) await gate;
        return inner.saveIfVersion(id, expected, doc, summary);
      },
    },
  };
}

const titles = (json) => (json ? JSON.parse(json).days.map((d) => d.title) : null);

// ---------------------------------------------------------------------------
line('1 — the exit condition is dirty(), re-asserted after every write');
{
  const inner = mem.memoryStorage();
  const g = gated(inner);
  const store = createStore({ ports: portsFor(g.port), debounceMs: 20 });
  await store.createTrip(INIT('Home'));
  const id = store.getState().doc.id;
  await store.flush();

  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'ONE' } });
  const release = g.park();
  const closing = store.closeTrip();
  await sleep(5); // the flush is inside saveIfVersion now
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-02', patch: { title: 'TWO' } });
  release();
  await closing;

  const stored = titles(inner.docs.get(id));
  ok('both the pre-flush and the mid-flush edit are in STORAGE', stored[0] === 'ONE' && stored[1] === 'TWO', JSON.stringify(stored));
  ok('the transition completed', store.getState().activeTripId === null, String(store.getState().activeTripId));
  ok('the store is clean afterwards', store.isDirty() === false);
}

// ---------------------------------------------------------------------------
line('2 — can an edit landing mid-flush address a DIFFERENT trip?');
{
  const inner = mem.memoryStorage();
  const g = gated(inner);
  const store = createStore({ ports: portsFor(g.port), debounceMs: 20 });
  await store.createTrip(INIT('A'));
  const idA = store.getState().doc.id;
  await store.flush();
  await store.closeTrip();
  await store.createTrip(INIT('B'));
  const idB = store.getState().doc.id;
  await store.flush();

  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'B-EDIT' } });
  const release = g.park();
  const opening = store.openTrip(idA); // flushes B, then loads A
  await sleep(5);
  // The only public mutation path is dispatch(), and it always addresses `state.doc`.
  const docDuringFlush = store.getState().doc.id;
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-02', patch: { title: 'B-EDIT-2' } });
  release();
  await opening;

  ok('during the flush `state.doc` is still the OUTGOING trip', docDuringFlush === idB, `${docDuringFlush} vs ${idB}`);
  ok('both B edits are in B\'s stored bytes', JSON.stringify(titles(inner.docs.get(idB))).includes('B-EDIT-2'), JSON.stringify(titles(inner.docs.get(idB))));
  ok('trip A was NOT written by B\'s flush', !JSON.stringify(titles(inner.docs.get(idA))).includes('B-EDIT'), JSON.stringify(titles(inner.docs.get(idA))));
  ok('the switch landed on A', store.getState().doc.id === idA, store.getState().doc.id);
}

// ---------------------------------------------------------------------------
line('3 — the bound exhausted, with a REAL scheduler and a real debounce');
{
  const inner = mem.memoryStorage();
  const typist = { on: false, k: 0 };
  const held = { store: null };
  const port = {
    listTrips: () => inner.listTrips(),
    load: (id) => inner.load(id),
    delete: (id) => inner.delete(id),
    async saveIfVersion(id, expected, doc, summary) {
      const out = await inner.saveIfVersion(id, expected, doc, summary);
      if (typist.on) {
        typist.k += 1;
        held.store?.dispatch({ type: 'setDayMeta', dayId: '2026-09-0' + ((typist.k % 4) + 1), patch: { title: 'typing ' + typist.k } });
      }
      return out;
    },
  };
  // NOTE: a REAL scheduler (default setTimeout), unlike the builder's own bound test.
  const store = createStore({ ports: portsFor(port), debounceMs: 20 });
  held.store = store;
  await store.createTrip(INIT('Home'));
  const id = store.getState().doc.id;
  await store.flush();

  typist.on = true;
  const before = inner.saveCount;
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'first' } });
  await store.closeTrip();
  typist.on = false;

  ok('the transition aborted — the trip is still open', store.getState().activeTripId === id, String(store.getState().activeTripId));
  ok('the edit is still in memory and isDirty() says so', store.isDirty() === true);
  ok(`the drain stopped at exactly FLUSH_MAX_ATTEMPTS (${FLUSH_MAX_ATTEMPTS}) writes`, inner.saveCount - before === FLUSH_MAX_ATTEMPTS, String(inner.saveCount - before));

  // THE ATTACK. The loop cancels the debounce timer on every pass, including the pass that
  // gives up. Nothing re-arms it. So a user whose last keystroke landed inside the last write
  // is now holding an unwritten edit with NO scheduled autosave.
  const dirtyAtAbort = store.isDirty();
  const savesAtAbort = inner.saveCount;
  const lastTyped = 'typing ' + typist.k;
  await sleep(200); // ten debounce periods with the user doing nothing at all
  ok(
    'autosave is still armed after the bound is spent (the edit lands on its own)',
    inner.saveCount > savesAtAbort || !dirtyAtAbort,
    `no further write in 200ms · isDirty=${store.isDirty()} · storage=${JSON.stringify(titles(inner.docs.get(id)))} · last keystroke "${lastTyped}"`,
  );

  // ...and what does the user see? status is 'idle', so App.tsx renders NO banner: the
  // conflict banner keys on status==='conflict', the error banner on status==='error'.
  const st = store.getState().persistence;
  ok(
    'an aborted transition is visible: status is conflict or error (App.tsx has no other banner)',
    st.status === 'conflict' || st.status === 'error',
    `status='${st.status}' lastError=${JSON.stringify(st.lastError ?? null)} → the click did nothing and said nothing`,
  );

  // Recovery: an explicit second action once typing stops.
  await store.closeTrip();
  ok('the click works once typing stops (recovery)', store.getState().activeTripId === null && store.isDirty() === false);
  ok('the last keystroke reached storage in the end', JSON.stringify(titles(inner.docs.get(id))).includes(lastTyped), JSON.stringify(titles(inner.docs.get(id))));
}

// ---------------------------------------------------------------------------
line('4 — a genuine refusal arriving DURING the retry loop, not before it');
{
  const inner = mem.memoryStorage();
  const state = { armed: false, fired: false };
  const port = {
    listTrips: () => inner.listTrips(),
    load: (id) => inner.load(id),
    delete: (id) => inner.delete(id),
    async saveIfVersion(id, expected, doc, summary) {
      const out = await inner.saveIfVersion(id, expected, doc, summary);
      if (state.armed && !state.fired) {
        state.fired = true;
        // The user types (keeping the loop going) AND another tab writes, so the NEXT pass
        // of the loop meets a moved record.
        state.store.dispatch({ type: 'setDayMeta', dayId: '2026-09-02', patch: { title: 'MINE' } });
        const cur = inner.docs.get(id);
        await inner.saveIfVersion(id, inner.versions.get(id), cur, core.tripSummary(core.fromJSON(cur)));
      }
      return out;
    },
  };
  const store = createStore({ ports: portsFor(port), debounceMs: 20 });
  state.store = store;
  await store.createTrip(INIT('Home'));
  const id = store.getState().doc.id;
  await store.flush();

  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'FIRST' } });
  state.armed = true;
  await store.closeTrip();

  ok('the transition aborted', store.getState().activeTripId === id, String(store.getState().activeTripId));
  ok('the store reports conflict', store.getState().persistence.status === 'conflict', store.getState().persistence.status);
  ok('the edit is still in memory', store.isDirty() === true);
  ok('the conflict message is on state (App.tsx renders it)', typeof store.getState().persistence.lastError === 'string' && store.getState().persistence.lastError.length > 20);
}

// ---------------------------------------------------------------------------
line('5 — every transition propagates a false flush into an aborted transition');
{
  const results = [];
  for (const name of ['closeTrip', 'openTrip', 'createTrip', 'adoptTrip', 'importDoc', 'deleteTrip(other)']) {
    const inner = mem.memoryStorage();
    const store = createStore({ ports: portsFor(inner), debounceMs: 20 });
    await store.createTrip(INIT('Other'));
    const idOther = store.getState().doc.id;
    await store.flush();
    const backup = core.toJSON(store.getState().doc);
    await store.closeTrip();
    await store.createTrip(INIT('Home'));
    const id = store.getState().doc.id;
    await store.flush();

    // Move the record behind the store's back so its next write is refused.
    const cur = inner.docs.get(id);
    await inner.saveIfVersion(id, inner.versions.get(id), cur, core.tripSummary(core.fromJSON(cur)));
    store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'AT RISK' } });

    try {
      if (name === 'closeTrip') await store.closeTrip();
      else if (name === 'openTrip') await store.openTrip(idOther);
      else if (name === 'createTrip') await store.createTrip(INIT('New'));
      else if (name === 'adoptTrip') await store.adoptTrip(core.fromJSON(backup));
      else if (name === 'importDoc') await store.importDoc(backup);
      else await store.deleteTrip(idOther);
    } catch (e) {
      results.push([name, 'threw: ' + e.message]);
      continue;
    }
    const s = store.getState();
    const held = s.doc && s.doc.days[0].title === 'AT RISK';
    results.push([name, s.activeTripId === id && held && s.persistence.status === 'conflict' ? 'aborted, edit held, conflict' : `LEAKED: active=${s.activeTripId} held=${held} status=${s.persistence.status}`]);
  }
  for (const [name, r] of results) ok(`${name}: ${r}`, r === 'aborted, edit held, conflict');
  // deleteTrip(otherId) also must not have deleted the other trip.
}

// ---------------------------------------------------------------------------
line('6 — R3-3 (mergeWithStored assigns `saving`) against the drain loop');
{
  const src = await import('node:fs').then((fs) => fs.readFileSync(new URL('../packages/client/src/store/store.ts', import.meta.url), 'utf8'));
  // REPAIRED, Phase 2 I-0. The original check was `/^\s*saving = (?!saving)/gm`, written when
  // `mergeWithStored` assigned `saving` directly. `32a3839` introduced `chainOntoSaving`, whose
  // body is literally `saving = run;` — which the old regex matched, so this probe reported
  // R3-3 open forever, against the very fix that closed it. The claim R3-3 actually makes is
  // "there is exactly ONE assignment to `saving`, and it is the one inside `chainOntoSaving`",
  // so that is what is asserted now: statement position only, so a doc comment quoting the old
  // form is not a hit, and the single permitted hit must be `saving = run;`.
  const assignments = [];
  src.split('\n').forEach((l, i) => {
    if (/^\s*saving\s*=\s/.test(l)) assignments.push(`${i + 1}: ${l.trim()}`);
  });
  assignments.forEach((h) => console.log('  store.ts:' + h));
  const bare = assignments.filter((h) => !/saving = run;$/.test(h)).length;
  ok(
    'the only assignment to `saving` is chainOntoSaving\'s own `saving = run` (R3-3 closed)',
    assignments.length === 1 && bare === 0,
    `${assignments.length} assignment(s), ${bare} of them outside chainOntoSaving — R3-3 would be open again`,
  );

  // Behavioural: press "Merge and save" while a transition's flush is parked.
  const inner = mem.memoryStorage();
  const g = gated(inner);
  const store = createStore({ ports: portsFor(g.port), debounceMs: 20 });
  await store.createTrip(INIT('Home'));
  const id = store.getState().doc.id;
  await store.flush();
  const cur = inner.docs.get(id);
  await inner.saveIfVersion(id, inner.versions.get(id), cur, core.tripSummary(core.fromJSON(cur)));
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'MINE' } });
  await store.closeTrip(); // refused → conflict, still open

  const release = g.park();
  const closing = store.closeTrip(); // loop re-flushes, parks
  await sleep(5);
  const merging = store.mergeWithStored().catch((e) => 'threw: ' + e.message);
  await sleep(5);
  release();
  const [, mergeResult] = await Promise.all([closing, merging]);
  ok(
    'a concurrent merge during a transition flush does not lose the edit',
    JSON.stringify(titles(inner.docs.get(id))).includes('MINE') || store.isDirty(),
    `stored=${JSON.stringify(titles(inner.docs.get(id)))} isDirty=${store.isDirty()} merge=${typeof mergeResult === 'string' ? mergeResult : 'ok'} status=${store.getState().persistence.status}`,
  );
  ok(
    'the store does not end up "idle" while storage disagrees with the document',
    !(store.getState().persistence.status === 'idle' && store.isDirty()),
    `status=${store.getState().persistence.status} isDirty=${store.isDirty()}`,
  );
}

// ---------------------------------------------------------------------------
line('7 — deleteTrip(activeId) while another transition\'s flush is parked');
{
  const inner = mem.memoryStorage();
  const g = gated(inner);
  const store = createStore({ ports: portsFor(g.port), debounceMs: 20 });
  await store.createTrip(INIT('Home'));
  const id = store.getState().doc.id;
  await store.flush();
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'DOOMED' } });

  const release = g.park();
  const closing = store.closeTrip();
  await sleep(5);
  const deleting = store.deleteTrip(id); // rule 6c: no flush, cancel and destroy
  await sleep(5);
  release();
  await Promise.all([closing, deleting.catch(() => {})]);

  const stillStored = inner.docs.has(id);
  ok('the deleted trip is NOT resurrected by the parked write', !stillStored, `docs.has(${id})=${stillStored}`);
  ok('the library no longer lists it', !store.getState().library.some((r) => r.id === id), JSON.stringify(store.getState().library.map((r) => r.id)));
  ok('no active document is left pointing at the deleted trip', store.getState().activeTripId === null, String(store.getState().activeTripId));
}

console.log('\n' + (fails ? `${fails} FAIL` : 'all ok'));
