/**
 * Round 7 — independent re-verification of R6-1 and R6-2's SEVERITY.
 *
 * Round 6 filed both as MINOR on the strength of `qa/r6-flush.mjs` §3. Round 7 was told not
 * to take "unaffected" on trust, and the chaining refactor (`32a3839`) touched the same file.
 * So this drives the same bound-exhausted state and then asks the question that decides the
 * severity and nothing else: **is any edit lost, on any exit the app actually has?**
 *
 *   §A  reproduce the bound-exhausted abort (R6-1 + R6-2), independently of r6-flush.
 *   §B  R6-2 backstop 1 — the next keystroke re-arms the debounce and the edit lands.
 *   §C  R6-2 backstop 2 — `registerPageExit`'s visibilitychange→hidden / pagehide flush.
 *   §D  R6-2 backstop 3 — `beforeunload` still calls preventDefault() while dirty.
 *   §E  R6-1 — what a user can actually see: isDirty() and the SaveState chip.
 *
 * Run: node qa/r7-r6recheck.mjs   (from cairn/)
 */
const core = await import('../packages/core/src/index.ts');
const { createStore, FLUSH_MAX_ATTEMPTS } = await import('../packages/client/src/store/store.ts');
const { registerPageExit } = await import('../packages/client/src/store/pageExit.ts');
const mem = await import('../packages/client/src/ports/memory.ts');

let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : '')); };
const line = (s) => console.log('\n== ' + s + ' ==');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chip = (s) => {
  const { status } = s.getState().persistence;
  if (status === 'conflict') return 'Not saved — edited elsewhere';
  if (status === 'error') return 'Not saved — retry';
  if (status === 'saving') return 'Saving…';
  return s.isDirty() ? 'Unsaved changes' : 'Saved';
};

let n = 0;
/** A store whose port dispatches one more keystroke on every completed write. */
async function exhaustedStore() {
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
        held.store?.dispatch({ type: 'setTripMeta', patch: { title: 'typing ' + typist.k } });
      }
      return out;
    },
  };
  const store = createStore({
    ports: {
      storage: port, clock: mem.fixedClockPort('2026-08-25'),
      ids: mem.sequentialIdPort(`x${++n}-`), file: mem.memoryFile(),
    },
    debounceMs: 20,
  });
  held.store = store;
  await store.createTrip({ title: 'Home', startDate: '2026-09-01', endDate: '2026-09-04' });
  const id = store.getState().doc.id;
  await store.flush();
  typist.on = true;
  const before = inner.saveCount;
  store.dispatch({ type: 'setTripMeta', patch: { title: 'first' } });
  const proceeded = await store.closeTrip().then(() => store.getState().activeTripId === null);
  typist.on = false;
  return { store, id, inner, writes: inner.saveCount - before, proceeded, lastTyped: 'typing ' + typist.k };
}

const storedTitle = (inner, id) => {
  const rec = inner.docs.get(id);
  return rec ? core.fromJSON(rec.doc ?? rec).title : null;
};

// ---------------------------------------------------------------------------
line('§A reproduce the bound-exhausted abort (R6-1 + R6-2), not via r6-flush');
const A = await exhaustedStore();
console.log(`  writes during the drain: ${A.writes} (FLUSH_MAX_ATTEMPTS=${FLUSH_MAX_ATTEMPTS})`);
console.log(`  after closeTrip(): active=${A.store.getState().activeTripId} dirty=${A.store.isDirty()}` +
            ` status=${A.store.getState().persistence.status} chip="${chip(A.store)}"`);
console.log(`  in memory="${A.store.getState().doc.title}"  in storage="${storedTitle(A.inner, A.id)}"`);
ok('the transition aborted — the trip is STILL OPEN (nothing was abandoned)',
   A.store.getState().activeTripId === A.id && !A.proceeded);
ok('the drain stopped at exactly FLUSH_MAX_ATTEMPTS', A.writes === FLUSH_MAX_ATTEMPTS, String(A.writes));
ok('R6-1 reproduces: status is idle, so App.tsx renders NO banner',
   A.store.getState().persistence.status === 'idle', A.store.getState().persistence.status);
{
  const savesAtAbort = A.inner.saveCount;
  await sleep(200);   // ten debounce periods, user idle
  ok('R6-2 reproduces: no autosave fires on its own after the bound is spent',
     A.inner.saveCount === savesAtAbort && A.store.isDirty(),
     `writes=${A.inner.saveCount - savesAtAbort} dirty=${A.store.isDirty()}`);
}

// ---------------------------------------------------------------------------
line('§B R6-2 backstop 1 — does the NEXT keystroke re-arm the debounce?');
{
  A.store.dispatch({ type: 'setTripMeta', patch: { title: 'AFTER THE ABORT' } });
  await sleep(120);
  console.log(`  storage now="${storedTitle(A.inner, A.id)}" dirty=${A.store.isDirty()}`);
  ok('one more keystroke re-arms autosave and the edit lands — NO DATA LOSS',
     storedTitle(A.inner, A.id) === 'AFTER THE ABORT' && !A.store.isDirty(),
     `stored="${storedTitle(A.inner, A.id)}" dirty=${A.store.isDirty()}`);
}

// ---------------------------------------------------------------------------
line('§C R6-2 backstop 2 — registerPageExit: visibilitychange -> hidden, and pagehide');
for (const how of ['visibilitychange', 'pagehide']) {
  const B = await exhaustedStore();
  const listeners = { visibilitychange: [], pagehide: [], beforeunload: [] };
  const target = {
    visibilityState: 'visible',
    addEventListener: (t, f) => listeners[t].push(f),
    removeEventListener: () => {},
  };
  registerPageExit({ win: target, doc: target, flush: () => B.store.flush(), isDirty: () => B.store.isDirty() });
  const dirtyBefore = B.store.isDirty();
  const memTitle = B.store.getState().doc.title;
  if (how === 'visibilitychange') { target.visibilityState = 'hidden'; listeners.visibilitychange.forEach((f) => f({})); }
  else listeners.pagehide.forEach((f) => f({}));
  await sleep(60);
  console.log(`  ${how}: dirtyBefore=${dirtyBefore} mem="${memTitle}" stored="${storedTitle(B.inner, B.id)}" dirtyAfter=${B.store.isDirty()}`);
  ok(`${how} flushes the disarmed edit to storage — NO DATA LOSS on tab hide/close`,
     storedTitle(B.inner, B.id) === memTitle && !B.store.isDirty(),
     `stored="${storedTitle(B.inner, B.id)}" mem="${memTitle}"`);
}

// ---------------------------------------------------------------------------
line('§D R6-2 backstop 3 — beforeunload still prompts while dirty');
{
  const C = await exhaustedStore();
  const listeners = { visibilitychange: [], pagehide: [], beforeunload: [] };
  const target = { visibilityState: 'visible', addEventListener: (t, f) => listeners[t].push(f), removeEventListener: () => {} };
  registerPageExit({ win: target, doc: target, flush: () => C.store.flush(), isDirty: () => C.store.isDirty() });
  let prevented = false;
  listeners.beforeunload.forEach((f) => f({ preventDefault: () => { prevented = true; } }));
  console.log(`  dirty=${C.store.isDirty()} preventDefault called=${prevented}`);
  ok('beforeunload calls preventDefault() while the aborted-transition edit is unwritten',
     C.store.isDirty() && prevented, `dirty=${C.store.isDirty()} prevented=${prevented}`);
}

// ---------------------------------------------------------------------------
line('§E R6-1 — what the user can actually see when the click does nothing');
{
  const D = await exhaustedStore();
  const st = D.store.getState().persistence;
  console.log(`  status='${st.status}' lastError=${JSON.stringify(st.lastError ?? null)}` +
              ` isDirty=${D.store.isDirty()} SaveState chip="${chip(D.store)}"`);
  ok('no banner (R6-1 confirmed): status is neither conflict nor error',
     st.status !== 'conflict' && st.status !== 'error', st.status);
  ok('but the SaveState chip does NOT read "Saved" — the indicator is not lying',
     chip(D.store) !== 'Saved', chip(D.store));
  ok('and isDirty() is true, so nothing thinks the edit is safe', D.store.isDirty() === true);
}

console.log(`\n== r7-r6recheck: ${fails} FAIL ==`);
console.log('   (a FAIL here would mean R6-1/R6-2 are worse than MINOR. See QA-FINDINGS round 7.)\n');
