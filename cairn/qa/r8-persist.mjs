/**
 * Round 8 — the SEND-BACK pass's store work, attacked: **B-6/A-2** (delete as a chain link),
 * **B-4/A-3** (the exhausted flush bound), **B-2/§2.7** (`syncResolutions` × undo), and the
 * R7-1 / R7-2 halves of B-6. Run from `cairn/`:
 *
 *     node qa/r8-persist.mjs
 *
 * A "FAIL" means the probe found what it was looking for — R8-1 and R8-4 in
 * `docs/QA-FINDINGS.md`. §2, §4 and §5 are confirmations and must stay at 0 FAIL.
 */
const client = await import('../packages/client/src/index.ts');
const core = await import('../packages/core/src/index.ts');
const storeMod = await import('../packages/client/src/store/store.ts');
const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? '\n         ' + x : '')); };
const line = (s) => console.log('\n== ' + s + ' ==');

const mk = (storage, debounceMs = 25) => client.createStore({
  ports: { storage, clock: client.fixedClockPort('2026-07-01'), ids: client.sequentialIdPort() },
  debounceMs,
});
/** A port whose `load()` takes `ms` — an IndexedDB read, not an in-memory Map lookup. */
const slowLoad = (port, ms) => new Proxy(port, {
  get: (t, k) => (k === 'load' ? async (id) => { await sleep(ms); return port.load(id); } : Reflect.get(t, k)),
});
/** Puts a store into `persistence.status === 'conflict'` by moving storage on underneath it. */
async function intoConflict(store, base, id) {
  const stored = await base.load(id);
  await base.saveIfVersion(id, stored.version, stored.doc, core.tripSummary(core.fromJSON(stored.doc), core.COUNTRY_INDEX));
  store.dispatch({ type: 'setTripMeta', patch: { title: 'mine' } });
  await store.flush();
}

// ---------------------------------------------------------------------------
line('§1 R8-4 — a deleted trip is resurrected by a merge that was already in flight');
{
  // A-2's ruling: the delete link is *"drain, delete, forget"* so that **no later link can
  // observe a half-deleted store or write against a fence pointer for a trip that no longer
  // exists"*. `mergeWithStored`'s `load()` is NOT on the chain, so the delete link can land
  // between the load and the write that load authorises — check-then-act, one level out from
  // where A-2 found it. `doMerge`'s `stored === null` branch then writes with
  // `expectedVersion: null`, which the record's absence satisfies.
  const base = client.memoryStorage();
  const store = mk(slowLoad(base, 60));
  await store.createTrip({ title: 'T', startDate: '2026-08-01', endDate: '2026-08-02' });
  const id = store.getState().doc.id;
  await store.flush();
  await intoConflict(store, base, id);
  ok('precondition: status is conflict', store.getState().persistence.status === 'conflict', store.getState().persistence.status);

  const merge = store.mergeWithStored().catch(() => null);   // the user presses "Merge and save"
  await sleep(5);
  await store.deleteTrip(id);                                 // §4.2 rule 6c, the active trip
  console.log('  immediately after the delete link: in storage=' + base.docs.has(id)
    + ' in library=' + store.getState().library.some((r) => r.id === id));
  await merge;
  await sleep(120);
  const inStorage = base.docs.has(id);
  const inLibrary = store.getState().library.some((r) => r.id === id);
  console.log('  after the merge settles:           in storage=' + inStorage + ' in library=' + inLibrary);
  console.log('  persistence.savedDoc for a trip with no doc:', store.getState().persistence.savedDoc ? store.getState().persistence.savedDoc.id : null);
  ok('the delete is not silently undone by a later link on the chain (A-2)',
     inStorage === false && inLibrary === false,
     'R7-3\'s own measurement — `in storage=true in library=true` — reached through '
     + 'mergeWithStored instead of through a stray autosave timer');
}

// ---------------------------------------------------------------------------
line('§2 the delete orderings A-2 DID close');
{
  const base = client.memoryStorage();
  const store = mk(base);
  await store.createTrip({ title: 'T2', startDate: '2026-08-01', endDate: '2026-08-02' });
  const id = store.getState().doc.id;
  await store.flush();
  store.dispatch({ type: 'setTripMeta', patch: { title: 'a' } });
  const del = store.deleteTrip(id);
  try { store.dispatch({ type: 'setTripMeta', patch: { title: 'b' } }); } catch { /* no active trip */ }
  await del;
  await sleep(80);
  ok('dispatch → delete(active) → dispatch again leaves the trip deleted', !base.docs.has(id));

  const b2 = client.memoryStorage();
  const s2 = mk(b2);
  await s2.createTrip({ title: 'T3', startDate: '2026-08-01', endDate: '2026-08-02' });
  const id2 = s2.getState().doc.id;
  await s2.flush();
  s2.dispatch({ type: 'setTripMeta', patch: { title: 'x' } });
  const f = s2.flush();            // a write on the chain, unsettled
  await s2.deleteTrip(id2);        // the delete link queues behind it
  await f;
  await sleep(80);
  ok('an autosave already in flight cannot resurrect the trip behind the delete', !b2.docs.has(id2));
}

// ---------------------------------------------------------------------------
line('§3 R8-1 — undo un-retires a resolution, and a dismissed blocker comes back dismissed');
{
  const store = mk(client.memoryStorage());
  await store.adoptTrip(loadEurope2026().trip);
  await store.flush();
  const legacyFor = (dayId) => store.getDerived().conflicts
    .find((c) => c.ruleId === 'legacy_flag' && c.subjects.some((s) => s.kind === 'day' && s.id === dayId)) ?? null;

  const c0 = store.getDerived().conflicts.find((c) => c.ruleId === 'legacy_flag');
  const dayId = c0.subjects.find((s) => s.kind === 'day').id;
  store.dispatch({ type: 'resolveConflict', resolution: { conflictId: c0.id, state: 'dismissed', by: 'local:self', at: '2026-07-01' } });
  store.dispatch({ type: 'setDayMeta', dayId, patch: { legacyFlag: false } });
  store.getDerived();               // the render that retires — B-2's new call site
  ok('B-2 works: the render retires the resolution once the conflict is gone',
     store.getState().doc.resolutions.filter((r) => r.retiredAt !== null).length === 1);

  // Route A — the data returns to its old value by a fresh edit. This is B-2's own criterion.
  store.dispatch({ type: 'setDayMeta', dayId, patch: { legacyFlag: true } });
  const routeA = legacyFor(dayId);
  ok('route A (re-edit): the conflict comes back LIVE', routeA && routeA.resolution === null,
     routeA && routeA.resolution ? `attached as "${routeA.resolution.state}"` : '');
  store.undo(); store.getDerived();  // back to the retired state

  // Route B — the data returns to its old value by UNDO, which restores a PRE-RETIREMENT
  // snapshot. §2.7: *"It sets `retiredAt` … and never un-retires."*
  store.undo();
  store.getDerived();
  const routeB = legacyFor(dayId);
  console.log('  resolution rows after undo:', JSON.stringify(store.getState().doc.resolutions.map((r) => `${r.state} retiredAt=${r.retiredAt}`)));
  ok('route B (Ctrl+Z): the conflict comes back LIVE, not still dismissed (§2.7)',
     routeB && routeB.resolution === null,
     routeB ? `the returning BLOCKER renders "Marked ${routeB.resolution?.state}" — R2-7's symptom `
       + 'sentence through the undo stack instead of through a re-edit' : 'conflict missing');
}

// ---------------------------------------------------------------------------
line('§4 B-4 / A-3 — the exhausted bound, all three obligations');
{
  const base = client.memoryStorage();
  let keepDirtying = true, store = null, n = 0;
  const port = new Proxy(base, {
    get: (t, k) => (k === 'saveIfVersion'
      ? async (...a) => {
          const r = await base.saveIfVersion(...a);
          // the user is typing through every write: the document is dirty again the instant
          // the write returns. §4.2 rule 6a" — "a document that will not settle".
          if (keepDirtying && store) { await sleep(0); store.dispatch({ type: 'setTripMeta', patch: { title: 'edit ' + (++n) } }); }
          return r;
        }
      : Reflect.get(t, k)),
  });
  store = mk(port, 30);
  await store.createTrip({ title: 'T', startDate: '2026-08-01', endDate: '2026-08-02' });
  const id = store.getState().doc.id;
  store.dispatch({ type: 'setTripMeta', patch: { title: 'the edit' } });
  const before = base.saveCount;
  await store.closeTrip();
  const st = store.getState();
  console.log(`  writes in the loop: ${base.saveCount - before} (FLUSH_MAX_ATTEMPTS = ${storeMod.FLUSH_MAX_ATTEMPTS})`);
  ok('the transition is aborted and the trip stays open', st.doc !== null && st.doc.id === id);
  ok("status is 'error', not 'conflict' and not 'idle'", st.persistence.status === 'error', st.persistence.status);
  ok('lastError is FLUSH_EXHAUSTED_MESSAGE verbatim', st.persistence.lastError === storeMod.FLUSH_EXHAUSTED_MESSAGE, JSON.stringify(st.persistence.lastError));
  ok('the edit is still in memory and the store still reads dirty', store.isDirty());
  ok('the loop is bounded at FLUSH_MAX_ATTEMPTS', base.saveCount - before === storeMod.FLUSH_MAX_ATTEMPTS, String(base.saveCount - before));

  keepDirtying = false;
  const rearm = base.saveCount;
  await sleep(120);
  ok('the ordinary debounce is RE-ARMED on this exit and a write happens with the user idle',
     base.saveCount - rearm > 0, 'writes=' + (base.saveCount - rearm));
  ok('when it lands the banner clears and nothing was lost',
     store.getState().persistence.status === 'idle' && !store.isDirty(), store.getState().persistence.status);

  // the other two exits must NOT re-arm — §4.2 rule 6a"'s three-way rule
  const b2 = client.memoryStorage();
  const s2 = mk(b2, 30);
  await s2.createTrip({ title: 'E', startDate: '2026-08-01', endDate: '2026-08-02' });
  await s2.flush();
  s2.dispatch({ type: 'setTripMeta', patch: { title: 'x' } });
  b2.failAll = 'storage is unavailable';
  await s2.closeTrip();
  const c0 = b2.saveCount;
  await sleep(120);
  ok("the 'error' exit carries the PORT's message and does NOT re-arm",
     s2.getState().persistence.lastError !== storeMod.FLUSH_EXHAUSTED_MESSAGE && b2.saveCount === c0,
     `${JSON.stringify(s2.getState().persistence.lastError)} extra writes=${b2.saveCount - c0}`);
}

// ---------------------------------------------------------------------------
line('§5 B-6 remainder — the in-flight merge guard (R7-1) and the unhandled rejection (R7-2)');
{
  const unhandled = [];
  const onRej = (e) => unhandled.push(String(e && e.message ? e.message : e));
  process.on('unhandledRejection', onRej);

  const base = client.memoryStorage();
  const store = mk(base, 20);
  await store.createTrip({ title: 'T', startDate: '2026-08-01', endDate: '2026-08-02' });
  const id = store.getState().doc.id;
  await store.flush();
  await intoConflict(store, base, id);
  const a = store.mergeWithStored();
  const b = store.mergeWithStored();
  ok('a second press joins the first, it does not start a second merge', a === b);
  await Promise.all([a, b]);
  await sleep(60);
  ok("a double press does not leave 'conflict' over a correctly merged document",
     store.getState().persistence.status === 'idle', store.getState().persistence.status);
  ok('the merged document is in storage', core.fromJSON(base.docs.get(id)).title === 'mine');
  ok('the guard clears — a later merge is a new promise', store.mergeWithStored() !== a);
  await sleep(40);

  const b3 = client.memoryStorage();
  const s3 = mk(b3, 20);
  await s3.createTrip({ title: 'T4', startDate: '2026-08-01', endDate: '2026-08-02' });
  await s3.flush();
  s3.subscribe(() => { throw new Error('BOOM in a subscriber'); });
  try { s3.dispatch({ type: 'setTripMeta', patch: { title: 'z' } }); } catch { /* surfaces to the caller, which is correct */ }
  await sleep(120);
  ok('a throwing subscriber produces no unhandled promise rejection (R7-2)',
     unhandled.filter((u) => /BOOM/.test(u)).length === 0, unhandled.join(' | '));
  process.off('unhandledRejection', onRej);
}

await sleep(150);
console.log(`\n== r8-persist: ${fails} FAIL ==`);
